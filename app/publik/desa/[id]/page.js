/**
 * @file Legacy redirect — `/publik/desa/[id]` → `/publik/dusun/[id]`
 *
 * Migration v5: scope unit data sudah pindah ke `dusun`. Halaman ini hanya
 * sebagai redirect supaya bookmark/SEO lama tidak rusak.
 */
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LegacyDesaRedirect({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => query.append(k, x));
    else query.set(k, String(v));
  }
  const qs = query.toString();
  redirect(`/publik/dusun/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`);
}
