/**
 * @file GET /api/rekap/desa/[id] — DEPRECATED redirect ke /api/rekap/dusun/[id]
 *
 * Migration v5: scope unit data sudah pindah ke `dusun`. Endpoint ini
 * dipertahankan sebagai backward-compat alias dengan redirect 308.
 */
import { NextResponse } from 'next/server';

export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const target = `/api/rekap/dusun/${encodeURIComponent(id)}${url.search}`;

  const response = NextResponse.redirect(new URL(target, url), 308);
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
  response.headers.set('Link', `<${target}>; rel="successor-version"`);
  return response;
}
