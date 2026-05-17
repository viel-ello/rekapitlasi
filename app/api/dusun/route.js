/**
 * @file Dusun API Route (canonical)
 * GET /api/dusun — List dusun aktif (semua user login).
 *
 * Pengganti /api/desa lama (tetap di-redirect untuk backward-compat).
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

    return NextResponse.json(dusun);
  } catch (error) {
    console.error('Error fetching dusun:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dusun' }, { status: 500 });
  }
}
