/**
 * @file Admin Audit Logs API
 * GET /api/admin/logs?user_id=&table_name=&action=&dusun=&from=&to=&limit=&offset=
 *
 * Requires admin role.
 *
 * Migration v5: filter unit data sekarang `dusun` (kolom `dusun_nama`). Param
 * lama `?desa=...` masih diterima sebagai alias supaya tooling lama tidak break.
 * Filter akan match `dusun_nama` (canonical) dengan fallback ke `desa_nama`
 * supaya history audit log lama tetap bisa dicari.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const tableName = searchParams.get('table_name');
    const action = searchParams.get('action');
    // Param canonical `dusun`, alias lama `desa`.
    const unitNama = searchParams.get('dusun') || searchParams.get('desa');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', Number(userId));
    if (tableName) query = query.eq('table_name', tableName);
    if (action) query = query.eq('action', action);
    if (unitNama) {
      if (!/^[a-zA-Z0-9\s-]+$/.test(unitNama)) {
        return NextResponse.json({ error: 'Parameter dusun tidak valid' }, { status: 400 });
      }
      // Match canonical dusun_nama OR legacy desa_nama (history lama)
      query = query.or(`dusun_nama.eq.${unitNama},desa_nama.eq.${unitNama}`);
    }
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    return NextResponse.json({ error: 'Gagal mengambil log' }, { status: 500 });
  }
}
