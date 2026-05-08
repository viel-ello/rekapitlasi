/**
 * @file Auth Me API — return current user info from JWT cookie
 * GET /api/auth/me
 */

import { NextResponse } from 'next/server';
import { getAuthUser, ROLE_PERMISSIONS } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    return NextResponse.json({
      userId: user.userId,
      username: user.username,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memverifikasi sesi' }, { status: 500 });
  }
}
