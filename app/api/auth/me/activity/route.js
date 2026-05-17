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
      .select('id, action, table_name, dusun_nama, desa_nama, detail, created_at')
      .eq('user_id', user.userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ items: [] });
    }
    // Normalisasi nama unit ke field canonical `dusun_nama`. Fallback ke
    // legacy `desa_nama` supaya history audit log lama tetap tampil.
    const items = (data || []).map((row) => ({
      ...row,
      dusun_nama: row.dusun_nama || row.desa_nama || null,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error('Profile activity error:', err);
    return NextResponse.json({ items: [] });
  }
}
