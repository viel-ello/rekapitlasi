/**
 * @file GET /api/rekap/desa/[id]?tahun=&bulan=
 * Internal desa drill-down — butuh login. Kembalikan ALL kolom (tidak filter PUBLIC_COLUMNS).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  evaluateRecordCompleteness,
  getTableKeys,
  isKnownOperationalTable,
  mergeStatus,
  STATUS_LABELS,
  OPERATIONAL_TABLES,
} from '@/lib/dataQuality';
import { validateRow, countIssues } from '@/lib/validation';
import { DATA_PAGES } from '@/lib/dataPages';

export const dynamic = 'force-dynamic';

const TABLES = OPERATIONAL_TABLES.map((t) => t.table);

export async function GET(request, ctx) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { id } = await ctx.params;
    const desaId = Number(id);
    if (!Number.isInteger(desaId) || desaId < 1) {
      return NextResponse.json({ error: 'ID desa tidak valid' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear();
    const bulan = Number(searchParams.get('bulan')) || 12;

    const { data: desa } = await supabase
      .from('desa')
      .select('*')
      .eq('id', desaId)
      .maybeSingle();

    if (!desa) return NextResponse.json({ error: 'Desa tidak ditemukan' }, { status: 404 });

    // Fetch hidden columns supaya tidak ikut di completeness
    const { data: overrideRows } = await supabase
      .from('table_column_overrides')
      .select('table_name, column_key, is_hidden')
      .eq('is_hidden', 1);
    const hiddenMap = {};
    (overrideRows || []).forEach((o) => {
      if (!hiddenMap[o.table_name]) hiddenMap[o.table_name] = new Set();
      hiddenMap[o.table_name].add(o.column_key);
    });

    // Fetch current + prev year per tabel
    const tablesData = {};
    const prevTablesData = {};
    const validation = {};
    const tableStatuses = {};
    let issueTotal = { errors: 0, warnings: 0, infos: 0 };

    for (const t of TABLES) {
      let q = supabase.from(t).select('*').eq('desa_id', desaId).eq('tahun', tahun);
      let qp = supabase.from(t).select('*').eq('desa_id', desaId).eq('tahun', tahun - 1);
      if (t === 'data_bumil') {
        q = q.eq('bulan', bulan);
        qp = qp.eq('bulan', bulan);
      }
      const [curRes, prevRes] = await Promise.all([q.maybeSingle(), qp.maybeSingle()]);
      tablesData[t] = curRes.data || null;
      prevTablesData[t] = prevRes.data || null;

      // Completeness — filter hidden
      const allKeys = getTableKeys(t);
      const hidden = hiddenMap[t] || new Set();
      const visibleKeys = allKeys.filter((k) => !hidden.has(k));
      const result = evaluateRecordCompleteness(curRes.data, visibleKeys, prevRes.data);
      tableStatuses[t] = { status: result.status, label: STATUS_LABELS[result.status], issueCount: result.issueCount };

      // Validation per kolom (visible only) untuk panel "Validasi"
      if (curRes.data) {
        const cols = visibleKeys.map((k) => ({ key: k, label: k }));
        const v = validateRow(curRes.data, cols, prevRes.data);
        validation[t] = v;
        const cnt = countIssues(v);
        issueTotal.errors += cnt.errors;
        issueTotal.warnings += cnt.warnings;
        issueTotal.infos += cnt.infos;
      }
    }

    const status = mergeStatus(Object.values(tableStatuses).map((s) => s.status));

    // Trend 5 tahun
    const trendYears = Array.from({ length: 5 }, (_, i) => tahun - 4 + i);
    const { data: trendUmum } = await supabase
      .from('data_umum').select('tahun, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma')
      .eq('desa_id', desaId).in('tahun', trendYears).order('tahun');
    const { data: trendP4 } = await supabase
      .from('data_pokja4').select('tahun, posyandu_jumlah')
      .eq('desa_id', desaId).in('tahun', trendYears).order('tahun');

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

    // Last activity untuk desa ini
    const { data: lastActivity } = await supabase
      .from('audit_logs')
      .select('username, action, table_name, detail, created_at')
      .eq('desa_nama', desa.nama)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      desa,
      tahun,
      bulan,
      status,
      statusLabel: STATUS_LABELS[status],
      tableStatuses,
      tables: tablesData,
      prevTables: prevTablesData,
      validation,
      issueTotal,
      trend,
      lastActivity: lastActivity || [],
    });
  } catch (error) {
    console.error('Internal desa detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat detail desa' }, { status: 500 });
  }
}
