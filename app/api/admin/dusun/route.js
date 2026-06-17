/**
 * @file Admin Dusun Management API (canonical, pengganti /api/admin/desa).
 * GET  — list all dusun
 * PUT  — update dusun (rename, toggle active)
 * Semua method butuh admin role.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { invalidateDusunServerCache } from '@/lib/server/dusunCache';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { data: dusun, error } = await supabase
      .from('dusun')
      .select('*')
      .order('nomor_urut', { ascending: true });
    if (error) throw error;
    return NextResponse.json(dusun);
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data dusun' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { id, nama, is_active } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID dusun harus diisi' }, { status: 400 });
    const dusunId = Number(id);
    if (!Number.isInteger(dusunId) || dusunId < 1) {
      return NextResponse.json({ error: 'ID dusun tidak valid' }, { status: 400 });
    }

    const updates = {};
    if (nama !== undefined) {
      const cleanName = String(nama).trim();
      if (cleanName.length < 2 || cleanName.length > 100) {
        return NextResponse.json({ error: 'Nama dusun harus 2-100 karakter' }, { status: 400 });
      }
      updates.nama = cleanName;
    }
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('dusun').update(updates).eq('id', dusunId);
      if (error) throw error;
      invalidateDusunServerCache();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui dusun' }, { status: 500 });
  }
}
