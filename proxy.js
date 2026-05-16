import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * @file Proxy (Next.js 16) — pengganti middleware.js.
 * Lindungi rute /dashboard dengan verifikasi JWT, bukan sekadar cek keberadaan cookie.
 * Kalau JWT tidak valid/expired, cookie di-clear dan user diarahkan ke /login.
 */

const SECRET = process.env.JWT_SECRET;

export async function proxy(request) {
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  const loginUrl = new URL('/login', request.url);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  if (!SECRET) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const key = new TextEncoder().encode(SECRET);
    await jwtVerify(token, key);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('auth-token', '', { httpOnly: true, maxAge: 0, path: '/' });
    return res;
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
