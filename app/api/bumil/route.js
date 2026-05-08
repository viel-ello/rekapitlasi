/**
 * @file Bumil API Route (special: includes bulan field)
 * GET /api/bumil?tahun=2025&bulan=12
 * POST /api/bumil — Upsert data bumil
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, canWrite } from '@/lib/auth';
import { writeLog } from '@/lib/audit';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const bulan = searchParams.get('bulan');

    const { data: desaList, error: desaError } = await supabase
      .from('desa')
      .select('id, nama, nomor_urut')
      .eq('is_active', 1)
      .order('nomor_urut', { ascending: true });

    if (desaError) throw desaError;

    let query = supabase.from('data_bumil').select('*').eq('tahun', tahun);
    if (bulan) {
      query = query.eq('bulan', bulan);
    }
    const { data: tableData, error: dataError } = await query;

    if (dataError) throw dataError;

    const data = tableData.map(row => {
      const d = desaList.find(desa => desa.id === row.desa_id) || {};
      return { ...row, desa_nama: d.nama, nomor_urut: d.nomor_urut };
    }).filter(d => d.desa_nama);

    data.sort((a, b) => {
      if (a.nomor_urut !== b.nomor_urut) return (a.nomor_urut || 0) - (b.nomor_urut || 0);
      return (a.bulan || 0) - (b.bulan || 0);
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bumil:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
    }
    if (!canWrite(user.role, 'data_bumil')) {
      return NextResponse.json(
        { error: `Anda (${user.role}) tidak memiliki izin untuk mengedit data ini` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { desa_id, tahun, bulan, ...fields } = body;

    if (!desa_id || !tahun || !bulan) {
      return NextResponse.json(
        { error: 'desa_id, tahun, dan bulan harus diisi' },
        { status: 400 }
      );
    }

    const { error: upsertError } = await supabase
      .from('data_bumil')
      .upsert({ desa_id, tahun, bulan, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'desa_id,tahun,bulan' });

    if (upsertError) throw upsertError;

    const { data: desa } = await supabase.from('desa').select('nama').eq('id', desa_id).single();
    writeLog({ userId: user.userId, username: user.username, action: 'update', tableName: 'data_bumil', desaNama: desa?.nama, detail: `Tahun ${tahun} Bulan ${bulan}` });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving bumil:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}
