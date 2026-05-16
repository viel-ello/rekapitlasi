/**
 * @file GET /api/public/desa/[id]?tahun=&bulan=
 * Public desa detail. Hanya mengembalikan kolom di allowlist + nama/nomor desa.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PUBLIC_DESA_FIELDS, PUBLIC_COLUMNS, PUBLIC_TABLES } from '@/lib/publicData';
import {
  evaluateRecordCompleteness,
  getTableKeys,
  mergeStatus,
  STATUS_LABELS,
  COMPLETENESS_STATUS,
} from '@/lib/dataQuality';

export const dynamic = 'force-dynamic';

function clampYear(input) {
  const n = Number(input);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return new Date().getFullYear();
  return n;
}

function clampMonth(input) {
  const n = Number(input);
  if (!Number.isInteger(n) || n < 1 || n > 12) return 12;
  return n;
}

export async function GET(request, ctx) {
  try {
    const { id } = await ctx.params;
    const desaId = Number(id);
    if (!Number.isInteger(desaId) || desaId < 1) {
      return NextResponse.json({ error: 'ID desa tidak valid' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = clampYear(searchParams.get('tahun') || new Date().getFullYear());
    const bulan = clampMonth(searchParams.get('bulan') || 12);

    const { data: desa } = await supabase
      .from('desa')
      .select(PUBLIC_DESA_FIELDS.join(','))
      .eq('id', desaId)
      .eq('is_active', 1)
      .maybeSingle();

    if (!desa) {
      return NextResponse.json({ error: 'Desa tidak ditemukan' }, { status: 404 });
    }

    // Fetch tiap tabel dengan kolom-kolom dari allowlist saja
    const fetchOne = async (table, fields) => {
      const cols = ['desa_id', 'tahun', ...fields];
      let query = supabase.from(table).select(cols.join(',')).eq('desa_id', desaId).eq('tahun', tahun);
      if (table === 'data_bumil') query = query.eq('bulan', bulan);
      const { data } = await query.maybeSingle();
      return data || null;
    };

    const tables = {};
    for (const t of PUBLIC_TABLES) {
      tables[t] = await fetchOne(t, PUBLIC_COLUMNS[t]);
    }

    // Trend 5 tahun untuk indikator agregat
    const currentYear = tahun;
    const trendYears = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

    const { data: trendUmum } = await supabase
      .from('data_umum')
      .select('tahun, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma')
      .eq('desa_id', desaId)
      .in('tahun', trendYears)
      .order('tahun');

    const { data: trendP4 } = await supabase
      .from('data_pokja4')
      .select('tahun, posyandu_jumlah')
      .eq('desa_id', desaId)
      .in('tahun', trendYears)
      .order('tahun');

    const trend = trendYears.map((y) => {
      const u = (trendUmum || []).find((r) => r.tahun === y) || {};
      const p = (trendP4 || []).find((r) => r.tahun === y) || {};
      return {
        tahun: y,
        total_kk: u.jml_kk || 0,
        total_jiwa: (u.jml_jiwa_l || 0) + (u.jml_jiwa_p || 0),
        total_dasa_wisma: u.jml_dasa_wisma || 0,
        total_posyandu: p.posyandu_jumlah || 0,
      };
    });

    // Completeness — gabungkan semua tabel
    const tableStatuses = {};
    for (const t of PUBLIC_TABLES) {
      const keys = getTableKeys(t);
      const result = evaluateRecordCompleteness(tables[t], keys);
      tableStatuses[t] = { status: result.status, label: STATUS_LABELS[result.status] };
    }
    const overall = mergeStatus(Object.values(tableStatuses).map((s) => s.status));

    return NextResponse.json({
      desa,
      tahun,
      bulan,
      tables,
      trend,
      tableStatuses,
      status: overall,
      statusLabel: STATUS_LABELS[overall] || STATUS_LABELS[COMPLETENESS_STATUS.INCOMPLETE],
    });
  } catch (error) {
    console.error('Public desa detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat data publik desa' }, { status: 500 });
  }
}
