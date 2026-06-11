/**
 * @file Generic data table API factory.
 * Membuat GET dan POST handlers dengan auth + role-based + row-level (kader-dusun).
 *
 * Migration v5:
 * - Unit data: dusun (sebelumnya desa). Body POST terima `dusun_id` atau alias `desa_id`.
 * - Tabel `data_kegiatan_warga` di-normalize ke `data_rekap_dawis`.
 * - Role kader-dusun (`dusun_*`) → row-level: paksa `payload.dusun_id = user.dusun_id`,
 *   lalu validasi via `canWriteRow`.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getAuthUser,
  canWrite,
  canWriteRow,
  requireAuth,
  normalizeTableName,
  ROLE_SCOPE,
} from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { checkPeriodLock } from '@/lib/periodLock';
import { sanitizeDataWritePayload } from '@/lib/requestValidation';

/**
 * @param {string} tableName  Nama tabel canonical (data_umum, data_pokja1, ..., data_rekap_dawis, data_bumil).
 * @param {{ requireMonth?: boolean }} [options]
 */
export function createPokjaHandler(tableName, options = {}) {
  const canonicalTable = normalizeTableName(tableName);
  // Tabel yang per-bulan (butuh kolom `bulan` di unique constraint):
  // - data_bumil sejak v1
  // - data_rekap_dawis sejak v10
  // - data_umum sejak v12
  const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);
  const requireMonth = !!options.requireMonth || TABLES_WITH_MONTH.has(canonicalTable);
  const onConflict = requireMonth ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun';

  async function GET(request) {
    try {
      const user = await requireAuth(request);
      if (!user) return requireAuth.deny();

      const { searchParams } = new URL(request.url);
      const tahun = searchParams.get('tahun') || new Date().getFullYear();
      const bulan = searchParams.get('bulan');

      const { data: dusunList, error: dusunError } = await supabase
        .from('dusun')
        .select('id, nama, nomor_urut')
        .eq('is_active', 1)
        .order('nomor_urut', { ascending: true });

      if (dusunError) throw dusunError;

      let dataQuery = supabase
        .from(canonicalTable)
        .select('*')
        .eq('tahun', tahun);

      // Filter bulan untuk tabel per-bulan (data_bumil, data_rekap_dawis).
      if (requireMonth && bulan != null && bulan !== '') {
        dataQuery = dataQuery.eq('bulan', Number(bulan));
      }

      const { data: tableData, error: dataError } = await dataQuery;

      if (dataError) throw dataError;

      // Merge data dengan info dusun. Kembalikan juga `desa_id`/`desa_nama` sebagai
      // alias supaya client lama tidak break.
      const data = (tableData || [])
        .map((row) => {
          const d = dusunList.find((dusun) => dusun.id === row.dusun_id) || {};
          return {
            ...row,
            dusun_nama: d.nama,
            desa_id: row.dusun_id, // alias backward-compat
            desa_nama: d.nama,
            nomor_urut: d.nomor_urut,
          };
        })
        .filter((d) => d.dusun_nama); // only active dusun

      data.sort((a, b) => (a.nomor_urut || 0) - (b.nomor_urut || 0));

      return NextResponse.json(data);
    } catch (error) {
      console.error(`Error fetching ${canonicalTable}:`, error);
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
  }

  async function POST(request) {
    try {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
      }

      // Table-level permission check
      if (!canWrite(user.role, canonicalTable)) {
        return NextResponse.json(
          { error: `Anda (${user.role}) tidak memiliki izin untuk mengedit data ini` },
          { status: 403 }
        );
      }

      const body = await request.json();
      const sanitizedPayload = await sanitizeDataWritePayload(canonicalTable, body, { requireMonth });
      if (sanitizedPayload.error) {
        return NextResponse.json({ error: sanitizedPayload.error }, { status: 400 });
      }
      const payload = sanitizedPayload.data;

      // Row-level enforcement untuk role kader-dusun: paksa dusun_id ke milik user.
      if (ROLE_SCOPE[user.role] === 'own_dusun') {
        if (user.dusun_id == null) {
          await writeLog({
            userId: user.userId,
            username: user.username,
            action: 'permission_denied',
            tableName: canonicalTable,
            detail: `Role ${user.role} tidak punya dusun_id assignment`,
          });
          return NextResponse.json(
            { error: 'Akun kader-dusun belum di-assign dusun. Hubungi admin.' },
            { status: 403 }
          );
        }
        // Anti-tamper: server overwrite dusun_id dengan milik user
        payload.dusun_id = Number(user.dusun_id);
      }

      // Defense in depth: row-level check (kalau scope all → trivially true)
      if (!canWriteRow(user, canonicalTable, payload)) {
        await writeLog({
          userId: user.userId,
          username: user.username,
          action: 'permission_denied',
          tableName: canonicalTable,
          detail: `Tolak write dusun_id=${payload.dusun_id} (role=${user.role}, user.dusun_id=${user.dusun_id})`,
        });
        return NextResponse.json(
          { error: 'Anda tidak boleh mengedit data dusun lain' },
          { status: 403 }
        );
      }

      // Period lock check
      const lock = await checkPeriodLock(canonicalTable, Number(payload.tahun), payload.bulan ?? null);
      if (lock.locked && user.role !== 'admin') {
        return NextResponse.json(
          { error: `Periode ${payload.tahun}${payload.bulan ? `/${payload.bulan}` : ''} untuk ${canonicalTable} sudah ${lock.status}. Hubungi admin untuk membuka kembali.` },
          { status: 403 }
        );
      }

      // Upsert
      const { error: upsertError } = await supabase
        .from(canonicalTable)
        .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict });

      if (upsertError) throw upsertError;

      // Audit log
      const { data: dusun } = await supabase
        .from('dusun')
        .select('nama')
        .eq('id', payload.dusun_id)
        .single();

      await writeLog({
        userId: user.userId,
        username: user.username,
        action: 'update',
        tableName: canonicalTable,
        dusunNama: dusun?.nama,
        detail: `Tahun ${payload.tahun}${payload.bulan ? `, bulan ${payload.bulan}` : ''}`,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`Error saving ${canonicalTable}:`, error);
      return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
    }
  }

  return { GET, POST };
}
