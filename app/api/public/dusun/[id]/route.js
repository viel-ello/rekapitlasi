/**
 * @file GET /api/public/dusun/[id]?tahun=&bulan=
 * Public dusun detail (canonical). Hanya mengembalikan kolom di allowlist
 * + nama/nomor unit. TIDAK butuh auth.
 *
 * Endpoint legacy `/api/public/desa/[id]` redirect ke endpoint ini.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PUBLIC_DUSUN_FIELDS, PUBLIC_COLUMNS, PUBLIC_TABLES } from '@/lib/publicData';
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
    const dusunId = Number(id);
    if (!Number.isInteger(dusunId) || dusunId < 1) {
      return NextResponse.json({ error: 'ID dusun tidak valid' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = clampYear(searchParams.get('tahun') || new Date().getFullYear());
    const bulan = clampMonth(searchParams.get('bulan') || 12);

    const { data: dusun } = await supabase
      .from('dusun')
      .select(PUBLIC_DUSUN_FIELDS.join(','))
      .eq('id', dusunId)
      .eq('is_active', 1)
      .maybeSingle();

    if (!dusun) {
      return NextResponse.json({ error: 'Dusun tidak ditemukan' }, { status: 404 });
    }

    const fetchOne = async (table, fields) => {
      // Schema baru hanya pakai dusun_id.
      const cols = ['dusun_id', 'tahun', ...fields].join(',');
      let query = supabase
        .from(table)
        .select(cols)
        .eq('dusun_id', dusunId)
        .eq('tahun', tahun);
      if (table === 'data_bumil' || table === 'data_rekap_dawis') query = query.eq('bulan', bulan);
      const { data } = await query.maybeSingle();
      return data || null;
    };

    const tables = {};
    for (const t of PUBLIC_TABLES) {
      tables[t] = await fetchOne(t, PUBLIC_COLUMNS[t]);
    }

    // Trend 5 tahun
    const trendYears = [tahun - 4, tahun - 3, tahun - 2, tahun - 1, tahun];

    const { data: trendUmum } = await supabase
      .from('data_umum')
      .select('tahun, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma')
      .eq('dusun_id', dusunId)
      .in('tahun', trendYears)
      .order('tahun');

    const { data: trendP4 } = await supabase
      .from('data_pokja4')
      .select('tahun, posyandu_jumlah')
      .eq('dusun_id', dusunId)
      .in('tahun', trendYears)
      .order('tahun');

    const trend = trendYears.map((y) => {
      const u = (trendUmum || []).find((r) => r.tahun === y) || {};
      const p = (trendP4 || []).find((r) => r.tahun === y) || {};
      return {
        tahun: y,
        total_kk: Number(u.jml_kk || 0),
        total_jiwa: Number(u.jml_jiwa_l || 0) + Number(u.jml_jiwa_p || 0),
        total_dasa_wisma: Number(u.jml_dasa_wisma || 0),
        total_posyandu: Number(p.posyandu_jumlah || 0),
      };
    });

    const tableStatuses = {};
    for (const t of PUBLIC_TABLES) {
      const keys = getTableKeys(t);
      const result = evaluateRecordCompleteness(tables[t], keys);
      tableStatuses[t] = { status: result.status, label: STATUS_LABELS[result.status] };
    }
    const overall = mergeStatus(Object.values(tableStatuses).map((s) => s.status));

    return NextResponse.json({
      dusun,
      desa: dusun, // alias backward-compat (response shape only)
      tahun,
      bulan,
      tables,
      trend,
      tableStatuses,
      status: overall,
      statusLabel: STATUS_LABELS[overall] || STATUS_LABELS[COMPLETENESS_STATUS.INCOMPLETE],
    });
  } catch (error) {
    console.error('Public dusun detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat data publik dusun' }, { status: 500 });
  }
}
