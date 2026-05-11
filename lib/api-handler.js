/**
 * @file Generic Pokja data API factory
 * Creates GET and POST handlers with role-based authorization
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, canWrite, requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';

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
      const { desa_id, tahun, ...fields } = body;

      if (!desa_id || !tahun) {
        return NextResponse.json({ error: 'desa_id dan tahun harus diisi' }, { status: 400 });
      }

      // Upsert into Supabase
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert({ desa_id, tahun, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'desa_id,tahun' });

      if (upsertError) throw upsertError;

      // Audit log
      const { data: desa } = await supabase.from('desa').select('nama').eq('id', desa_id).single();
      await writeLog({
        userId: user.userId,
        username: user.username,
        action: 'update',
        tableName,
        desaNama: desa?.nama,
        detail: `Tahun ${tahun}`,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`Error saving ${tableName}:`, error);
      return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
    }
  }

  return { GET, POST };
}
