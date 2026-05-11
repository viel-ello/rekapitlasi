/**
 * @file POST /api/notifications/mark-read
 * Body: { ids: number[] } atau { all: true }
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const body = await request.json();
    const { ids, all } = body || {};

    let query = supabase.from('notifications').update({ is_read: 1 }).eq('user_id', user.userId);

    if (all === true) {
      query = query.eq('is_read', 0);
    } else if (Array.isArray(ids) && ids.length > 0) {
      const numericIds = ids.map((x) => Number(x)).filter((x) => Number.isInteger(x));
      if (numericIds.length === 0) {
        return NextResponse.json({ error: 'ids harus berisi integer' }, { status: 400 });
      }
      query = query.in('id', numericIds);
    } else {
      return NextResponse.json({ error: 'Berikan ids atau all=true' }, { status: 400 });
    }

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark-read error:', error);
    return NextResponse.json({ error: 'Gagal menandai notifikasi' }, { status: 500 });
  }
}
