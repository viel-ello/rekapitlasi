/**
 * @file Admin Audit Logs API
 * GET /api/admin/logs?user_id=&table_name=&action=&desa=&from=&to=&limit=&offset=
 * Requires admin role.
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
    const desa = searchParams.get('desa');
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
    if (desa) query = query.eq('desa_nama', desa);
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
