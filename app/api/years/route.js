/**
 * @file Years API (public untuk user login)
 * GET /api/years?include_inactive=0 — Daftar tahun aktif, terbaru dulu.
 * Fallback: jika tabel kosong atau belum ada, return tahun sekitar current year.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === '1';

    let query = supabase.from('report_years').select('tahun, is_active').order('tahun', { ascending: false });
    if (!includeInactive) query = query.eq('is_active', 1);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback supaya UI tidak pernah kosong
      const currentYear = new Date().getFullYear();
      const fallback = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]
        .map((tahun) => ({ tahun, is_active: 1 }));
      return NextResponse.json(fallback);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Years fetch error:', error);
    return NextResponse.json({ error: 'Gagal mengambil daftar tahun' }, { status: 500 });
  }
}
