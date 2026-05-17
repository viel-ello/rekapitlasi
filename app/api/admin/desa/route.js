/**
 * @file Admin Desa Management API — DEPRECATED, alias untuk Admin Dusun.
 *
 * Migration v5: tabel `desa` digantikan oleh `dusun`. Endpoint ini di-alias
 * untuk backward-compat selama 1 release. Caller baru sebaiknya pakai
 * `/api/admin/dusun`.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { data: dusun, error } = await supabase
      .from('dusun')
      .select('*')
      .order('nomor_urut', { ascending: true });
    if (error) throw error;
    const response = NextResponse.json(dusun);
    response.headers.set('Deprecation', 'true');
    response.headers.set('Link', '</api/admin/dusun>; rel="successor-version"');
    return response;
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
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal memperbarui dusun' }, { status: 500 });
  }
}
