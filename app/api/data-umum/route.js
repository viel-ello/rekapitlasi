/**
 * @file Data Umum API Route
 * GET /api/data-umum?tahun=2025 — Get all data umum for a year
 * POST /api/data-umum — Upsert data for a desa+year (authorized)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, canWrite, requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';

export async function GET(request) {
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

    const { data: dataUmum, error: dataError } = await supabase
      .from('data_umum')
      .select('*')
      .eq('tahun', tahun);

    if (dataError) throw dataError;

    // Merge data manually since Supabase JOIN syntax returns nested objects
    const data = dataUmum.map(du => {
      const d = desaList.find(desa => desa.id === du.desa_id) || {};
      return { ...du, desa_nama: d.nama, nomor_urut: d.nomor_urut };
    }).filter(d => d.desa_nama); // only active desa

    data.sort((a, b) => (a.nomor_urut || 0) - (b.nomor_urut || 0));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data umum:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
    }
    if (!canWrite(user.role, 'data_umum')) {
      return NextResponse.json(
        { error: `Anda (${user.role}) tidak memiliki izin untuk mengedit data ini` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { desa_id, tahun, ...fields } = body;

    if (!desa_id || !tahun) {
      return NextResponse.json({ error: 'desa_id dan tahun harus diisi' }, { status: 400 });
    }

    // Upsert into Supabase (requires unique constraint on desa_id, tahun which we added)
    const { error: upsertError } = await supabase
      .from('data_umum')
      .upsert({ desa_id, tahun, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'desa_id,tahun' });

    if (upsertError) throw upsertError;

    const { data: desa } = await supabase.from('desa').select('nama').eq('id', desa_id).single();
    await writeLog({ userId: user.userId, username: user.username, action: 'update', tableName: 'data_umum', desaNama: desa?.nama, detail: `Tahun ${tahun}` });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving data umum:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}
