/**
 * @file Admin Audit Logs API
 * GET /api/admin/logs?limit=50
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil log' }, { status: 500 });
  }
}
