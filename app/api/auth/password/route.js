/**
 * @file Change Password API
 * POST /api/auth/password — Change current user's password
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, verifyPassword, hashPassword } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 12;

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Kata sandi lama dan baru harus diisi' }, { status: 400 });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Kata sandi baru minimal ${MIN_PASSWORD_LENGTH} karakter` }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama' }, { status: 400 });
    }

    const { data: dbUser, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.userId)
      .single();

    if (fetchError || !dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, dbUser.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Kata sandi lama tidak cocok' }, { status: 403 });
    }

    const newHash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.userId);

    if (updateError) throw updateError;

    const response = NextResponse.json({ success: true, message: 'Kata sandi berhasil diubah. Silakan login kembali.' });
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Gagal mengubah kata sandi' }, { status: 500 });
  }
}
