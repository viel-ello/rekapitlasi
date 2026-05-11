/**
 * @file Admin Desa Management API
 * GET — list all desa
 * PUT — update desa (rename, toggle active)
 * All methods require admin role.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { data: desa, error } = await supabase.from('desa').select('*').order('nomor_urut', { ascending: true });
    if (error) throw error;
    return NextResponse.json(desa);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data desa' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { id, nama, is_active } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID desa harus diisi' }, { status: 400 });
    const desaId = Number(id);
    if (!Number.isInteger(desaId) || desaId < 1) {
      return NextResponse.json({ error: 'ID desa tidak valid' }, { status: 400 });
    }

    const updates = {};
    if (nama !== undefined) {
      const cleanName = String(nama).trim();
      if (cleanName.length < 2 || cleanName.length > 100) {
        return NextResponse.json({ error: 'Nama desa harus 2-100 karakter' }, { status: 400 });
      }
      updates.nama = cleanName;
    }
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('desa').update(updates).eq('id', desaId);
      if (error) throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui desa' }, { status: 500 });
  }
}
