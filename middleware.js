import { NextResponse } from 'next/server';

export function middleware(request) {
  // Hanya lindungi rute yang diawali dengan /dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')?.value;

    // Jika tidak ada token (belum login), tendang kembali ke halaman utama
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Terapkan middleware ini untuk semua halaman di dalam /dashboard
  matcher: ['/dashboard/:path*'],
};
