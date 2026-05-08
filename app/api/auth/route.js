/**
 * @file Auth API Route
 * POST /api/auth — Login
 * DELETE /api/auth — Logout
 */

import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    // --- Rate Limiting Check ---
    const { limited, retryAfter } = checkRateLimit(request);
    if (limited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${retryAfter} menit.` },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(username, password);

    if (!result) {
      // Record failed attempt for rate limiting
      recordFailedAttempt(request);
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Login success — clear failed attempts
    clearAttempts(request);

    // Set JWT token as httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return response;
}
