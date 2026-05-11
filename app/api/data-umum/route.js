/**
 * @file Data Umum API Route
 * GET /api/data-umum?tahun=2025 — Get all data umum for a year
 * POST /api/data-umum — Upsert data for a desa+year (authorized)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, canWrite, requireAuth } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { checkPeriodLock } from '@/lib/periodLock';
import { sanitizeDataWritePayload } from '@/lib/requestValidation';

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
    const sanitizedPayload = await sanitizeDataWritePayload('data_umum', body);
    if (sanitizedPayload.error) {
      return NextResponse.json({ error: sanitizedPayload.error }, { status: 400 });
    }
    const payload = sanitizedPayload.data;

    const lock = await checkPeriodLock('data_umum', Number(payload.tahun));
    if (lock.locked && user.role !== 'admin') {
      return NextResponse.json(
        { error: `Periode ${payload.tahun} untuk data_umum sudah ${lock.status}. Hubungi admin untuk membuka kembali.` },
        { status: 403 }
      );
    }

    // Upsert into Supabase (requires unique constraint on desa_id, tahun which we added)
    const { error: upsertError } = await supabase
      .from('data_umum')
      .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'desa_id,tahun' });

    if (upsertError) throw upsertError;

    const { data: desa } = await supabase.from('desa').select('nama').eq('id', payload.desa_id).single();
    await writeLog({ userId: user.userId, username: user.username, action: 'update', tableName: 'data_umum', desaNama: desa?.nama, detail: `Tahun ${payload.tahun}` });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving data umum:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}
