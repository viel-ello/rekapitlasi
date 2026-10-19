/**
 * @file Audit log CSV export.
 * GET /api/admin/logs/export?user_id=&table_name=&action=&dusun=&from=&to=
 *
 * Default cap 5000 rows per request untuk mencegah OOM.
 *
 * Migration v5: filter unit data sekarang `dusun` (kolom `dusun_nama`). Param
 * lama `?desa=...` masih diterima sebagai alias.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

const CSV_MAX_ROWS = 5000;

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Formula injection defense (CWE-1236): netralkan awalan formula jika bukan angka
  if (typeof value !== 'number' && !(!isNaN(Number(str)) && str.trim() !== '') && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const tableName = searchParams.get('table_name');
    const action = searchParams.get('action');
    const unitNama = (searchParams.get('dusun') || searchParams.get('desa') || '').trim();
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('audit_logs')
      .select('created_at, username, action, table_name, dusun_nama, desa_nama, detail, ip')
      .order('created_at', { ascending: false })
      .limit(CSV_MAX_ROWS);

    if (userId) query = query.eq('user_id', Number(userId));
    if (tableName) query = query.eq('table_name', tableName);
    if (action) query = query.eq('action', action);
    if (unitNama) {
      if (!/^[a-zA-Z0-9\s-]+$/.test(unitNama)) {
        return NextResponse.json({ error: 'Parameter dusun tidak valid' }, { status: 400 });
      }
      query = query.or(`dusun_nama.eq.${unitNama},desa_nama.eq.${unitNama}`);
    }
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw error;

    const header = ['Waktu', 'User', 'Action', 'Tabel', 'Dusun', 'Detail', 'IP'];
    const lines = [header.join(',')];
    for (const r of data || []) {
      lines.push([
        csvEscape(r.created_at),
        csvEscape(r.username),
        csvEscape(r.action),
        csvEscape(r.table_name),
        // Canonical dusun_nama dengan fallback ke desa_nama (history lama)
        csvEscape(r.dusun_nama || r.desa_nama),
        csvEscape(r.detail),
        csvEscape(r.ip),
      ].join(','));
    }
    const csv = '\uFEFF' + lines.join('\n'); // BOM untuk Excel

    const timestamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit_logs_${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('Logs export error:', error);
    return NextResponse.json({ error: 'Gagal export log' }, { status: 500 });
  }
}
