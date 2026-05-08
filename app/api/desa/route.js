/**
 * @file Desa API Route
 * GET /api/desa — List all desa
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: desa, error } = await supabase
      .from('desa')
      .select('*')
      .eq('is_active', 1)
      .order('nomor_urut', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json(desa);
  } catch (error) {
    console.error('Error fetching desa:', error);
    return NextResponse.json({ error: 'Gagal mengambil data desa' }, { status: 500 });
  }
}
