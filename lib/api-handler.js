/**
 * @file Generic Pokja data API factory
 * Creates GET and POST handlers with role-based authorization
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, canWrite, requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { checkPeriodLock } from '@/lib/periodLock';
import { sanitizeDataWritePayload } from '@/lib/requestValidation';

export function createPokjaHandler(tableName) {
  async function GET(request) {
    try {
      const user = await requireAuth(request);
      if (!user) return requireAuth.deny();

      const { searchParams } = new URL(request.url);
      const tahun = searchParams.get('tahun') || new Date().getFullYear();

      const { data: desaList, error: desaError } = await supabase
        .from('desa')
        .select('id, nama, nomor_urut')
        .eq('is_active', 1)
        .order('nomor_urut', { ascending: true });

      if (desaError) throw desaError;

      const { data: tableData, error: dataError } = await supabase
        .from(tableName)
        .select('*')
        .eq('tahun', tahun);

      if (dataError) throw dataError;

      // Merge data
      const data = tableData.map(row => {
        const d = desaList.find(desa => desa.id === row.desa_id) || {};
        return { ...row, desa_nama: d.nama, nomor_urut: d.nomor_urut };
      }).filter(d => d.desa_nama); // only active desa

      data.sort((a, b) => (a.nomor_urut || 0) - (b.nomor_urut || 0));

      return NextResponse.json(data);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
    }
  }

  async function POST(request) {
    try {
      // ---- AUTHORIZATION CHECK ----
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
      }
      if (!canWrite(user.role, tableName)) {
        return NextResponse.json(
          { error: `Anda (${user.role}) tidak memiliki izin untuk mengedit data ini` },
          { status: 403 }
        );
      }
      // ---- END AUTH CHECK ----

      const body = await request.json();
      const sanitizedPayload = await sanitizeDataWritePayload(tableName, body);
      if (sanitizedPayload.error) {
        return NextResponse.json({ error: sanitizedPayload.error }, { status: 400 });
      }
      const payload = sanitizedPayload.data;

      // Period lock check (stub di fase 0; aktif di fase 3 setelah tabel report_periods dibuat)
      const lock = await checkPeriodLock(tableName, Number(payload.tahun));
      if (lock.locked && user.role !== 'admin') {
        return NextResponse.json(
          { error: `Periode ${payload.tahun} untuk ${tableName} sudah ${lock.status}. Hubungi admin untuk membuka kembali.` },
          { status: 403 }
        );
      }

      // Upsert into Supabase
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'desa_id,tahun' });

      if (upsertError) throw upsertError;

      // Audit log
      const { data: desa } = await supabase.from('desa').select('nama').eq('id', payload.desa_id).single();
      await writeLog({
        userId: user.userId,
        username: user.username,
        action: 'update',
        tableName,
        desaNama: desa?.nama,
        detail: `Tahun ${payload.tahun}`,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`Error saving ${tableName}:`, error);
      return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
    }
  }

  return { GET, POST };
}
