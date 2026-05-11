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
    try {
      const { data } = await supabase
        .from('users')
        .select('last_login_at, nama_lengkap')
        .eq('id', user.userId)
        .single();
      lastLoginAt = data?.last_login_at || null;
      namaLengkap = data?.nama_lengkap || null;
    } catch { /* silent */ }

    return NextResponse.json({
      userId: user.userId,
      username: user.username,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
      lastLoginAt,
      namaLengkap,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memverifikasi sesi' }, { status: 500 });
  }
}
