/**
 * @file Notifications API — list notifikasi user saat ini.
 * GET /api/notifications?unread=1&limit=20
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', 0);

    const { data, error } = await query;
    if (error) {
      // Tabel belum ada / RLS — return empty
      return NextResponse.json({ items: [], unreadCount: 0 });
    }

    // Hitung unread total
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .eq('is_read', 0);

    return NextResponse.json({
      items: data || [],
      unreadCount: count || 0,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ items: [], unreadCount: 0 });
  }
}
