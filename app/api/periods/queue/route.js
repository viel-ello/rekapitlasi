/**
 * @file GET /api/periods/queue — Antrian workflow periode.
 *
 * Untuk admin: semua periode berstatus `submitted` (menunggu review) lintas
 * tabel & bulan, plus ringkasan jumlah per status.
 * Untuk non-admin: periode yang DIA submit (untuk lihat status approve/return).
 *
 * Dipakai oleh halaman Admin Approval Queue & widget "Pekerjaan Saya".
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

const TABLE_LABELS = {
  data_umum: 'Data Umum',
  data_pokja1: 'Pokja I',
  data_pokja2: 'Pokja II',
  data_pokja3: 'Pokja III',
  data_pokja4: 'Pokja IV',
  data_rekap_dawis: 'Rekapitulasi Dawis',
  data_kegiatan_warga: 'Rekapitulasi Dawis',
  data_bumil: 'Data Bumil',
};

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const isAdmin = user.role === 'admin';
    const { searchParams } = new URL(request.url);
    const fTahun = searchParams.get('tahun');
    const fBulan = searchParams.get('bulan');
    const fTable = searchParams.get('table_name');
    const fStatus = searchParams.get('status');

    let query = supabase
      .from('report_periods')
      .select('*')
      .order('updated_at', { ascending: false });

    if (isAdmin) {
      // Admin: default fokus pada yang menunggu review, tapi bisa override via filter status.
      query = query.eq('status', fStatus || 'submitted');
    } else {
      // Operator: periode yang dia ajukan.
      query = query.eq('submitted_by', user.userId);
      if (fStatus) query = query.eq('status', fStatus);
    }

    if (fTahun) query = query.eq('tahun', Number(fTahun));
    if (fBulan) query = query.eq('bulan', Number(fBulan));
    if (fTable) query = query.eq('table_name', fTable);

    const { data, error } = await query.limit(200);
    if (error) {
      // Tabel mungkin belum dimigrate
      return NextResponse.json({ items: [], summary: {} });
    }

    const items = (data || []).map((p) => ({
      ...p,
      tableLabel: TABLE_LABELS[p.table_name] || p.table_name,
    }));

    // Ringkasan jumlah per status (admin: global; operator: punya dia).
    let summaryQuery = supabase.from('report_periods').select('status');
    if (!isAdmin) summaryQuery = summaryQuery.eq('submitted_by', user.userId);
    const { data: allRows } = await summaryQuery;
    const summary = (allRows || []).reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ items, summary, isAdmin });
  } catch (error) {
    console.error('Periods queue error:', error);
    return NextResponse.json({ error: 'Gagal memuat antrian periode' }, { status: 500 });
  }
}
