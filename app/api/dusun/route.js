/**
 * @file Dusun API Route (canonical)
 * GET /api/dusun — List dusun aktif (semua user login).
 *
 * Pengganti /api/desa lama (tetap di-redirect untuk backward-compat).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getActiveDusun } from '@/lib/server/dusunCache';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const dusun = await getActiveDusun();

    return NextResponse.json(dusun);
  } catch (error) {
    console.error('Error fetching dusun:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dusun' }, { status: 500 });
  }
}
