/**
 * @file Desa API Route — DEPRECATED
 *
 * Migration v5: scope unit data sudah pindah ke `dusun`. Endpoint ini dipertahankan
 * sebagai backward-compat alias yang melayani data dari tabel `dusun`. Response
 * memuat field `id`/`nama`/`nomor_urut`/`is_active` sehingga client lama tetap jalan.
 *
 * Header `Deprecation` & `Sunset` dipasang supaya tooling tahu endpoint ini akan
 * dihapus di release berikutnya. Caller sebaiknya pindah ke `/api/dusun`.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { data: dusun, error } = await supabase
      .from('dusun')
      .select('id, nama, nomor_urut, is_active')
      .eq('is_active', 1)
      .order('nomor_urut', { ascending: true });

    if (error) throw error;

    const response = NextResponse.json(dusun);
    response.headers.set('Deprecation', 'true');
    response.headers.set('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
    response.headers.set('Link', '</api/dusun>; rel="successor-version"');
    return response;
  } catch (error) {
    console.error('Error fetching dusun (legacy /api/desa):', error);
    return NextResponse.json({ error: 'Gagal mengambil data dusun' }, { status: 500 });
  }
}
