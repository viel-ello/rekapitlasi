/**
 * @file Profile activity — list user's own audit logs (30 days / last 20).
 * GET /api/auth/me/activity
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, table_name, desa_nama, detail, created_at')
      .eq('user_id', user.userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('Profile activity error:', err);
    return NextResponse.json({ items: [] });
  }
}
