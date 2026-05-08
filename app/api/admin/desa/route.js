/**
 * @file Admin Desa Management API
 * GET — list all desa
 * PUT — update desa (rename, toggle active)
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: desa, error } = await supabase.from('desa').select('*').order('nomor_urut', { ascending: true });
    if (error) throw error;
    return NextResponse.json(desa);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data desa' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, nama, is_active } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID desa harus diisi' }, { status: 400 });

    const updates = {};
    if (nama !== undefined) updates.nama = nama;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('desa').update(updates).eq('id', id);
      if (error) throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui desa' }, { status: 500 });
  }
}
