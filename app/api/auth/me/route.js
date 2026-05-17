/**
 * @file Auth Me API — return current user info from JWT cookie + last_login_at.
 * GET /api/auth/me
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, ROLE_PERMISSIONS } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    let lastLoginAt = null;
    let namaLengkap = null;
    let dusunId = user.dusun_id ?? null;
    try {
      const { data } = await supabase
        .from('users')
        .select('last_login_at, nama_lengkap, dusun_id')
        .eq('id', user.userId)
        .single();
      lastLoginAt = data?.last_login_at || null;
      namaLengkap = data?.nama_lengkap || null;
      // Override JWT dusun_id dengan nilai dari DB (lebih authoritative kalau admin baru update)
      if (data?.dusun_id != null) dusunId = data.dusun_id;
    } catch { /* silent */ }

    return NextResponse.json({
      userId: user.userId,
      username: user.username,
      role: user.role,
      dusun_id: dusunId,
      permissions: ROLE_PERMISSIONS[user.role] || [],
      lastLoginAt,
      namaLengkap,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memverifikasi sesi' }, { status: 500 });
  }
}
