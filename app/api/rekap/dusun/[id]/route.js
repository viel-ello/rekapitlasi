/**
 * @file GET /api/rekap/dusun/[id]?tahun=&bulan= — Internal drill-down per dusun.
 * Butuh login. Kembalikan ALL kolom (tidak filter PUBLIC_COLUMNS).
 *
 * Endpoint legacy `/api/rekap/desa/[id]` redirect ke endpoint ini.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  evaluateRecordCompleteness,
  getTableKeys,
  mergeStatus,
  STATUS_LABELS,
  OPERATIONAL_TABLES,
} from '@/lib/dataQuality';
import { validateRow, countIssues } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const TABLES = OPERATIONAL_TABLES.filter((t) => !t.aliasOf).map((t) => t.table);

export async function GET(request, ctx) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { id } = await ctx.params;
    const dusunId = Number(id);
    if (!Number.isInteger(dusunId) || dusunId < 1) {
      return NextResponse.json({ error: 'ID dusun tidak valid' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear();
    const bulan = Number(searchParams.get('bulan')) || 12;

    const { data: dusun } = await supabase
      .from('dusun')
      .select('id, nama, nomor_urut, is_active')
      .eq('id', dusunId)
      .maybeSingle();

    if (!dusun) return NextResponse.json({ error: 'Dusun tidak ditemukan' }, { status: 404 });

    // Hidden columns untuk completeness filter
    const { data: overrideRows } = await supabase
      .from('table_column_overrides')
      .select('table_name, column_key, is_hidden')
      .eq('is_hidden', 1);
    const hiddenMap = {};
    (overrideRows || []).forEach((o) => {
      if (!hiddenMap[o.table_name]) hiddenMap[o.table_name] = new Set();
      hiddenMap[o.table_name].add(o.column_key);
    });

    // Fetch current + prev year per tabel — pakai dusun_id canonical.
    const tablesData = {};
    const prevTablesData = {};
    const validation = {};
    const tableStatuses = {};
    const issueTotal = { errors: 0, warnings: 0, infos: 0 };

    for (const t of TABLES) {
      let q = supabase.from(t).select('*').eq('dusun_id', dusunId).eq('tahun', tahun);
      let qp = supabase.from(t).select('*').eq('dusun_id', dusunId).eq('tahun', tahun - 1);
      if (t === 'data_bumil' || t === 'data_rekap_dawis' || t === 'data_umum') {
        q = q.eq('bulan', bulan);
        qp = qp.eq('bulan', bulan);
      }
      const [curRes, prevRes] = await Promise.all([q.maybeSingle(), qp.maybeSingle()]);
      tablesData[t] = curRes.data || null;
      prevTablesData[t] = prevRes.data || null;

      const allKeys = getTableKeys(t);
      const hidden = hiddenMap[t] || new Set();
      const visibleKeys = allKeys.filter((k) => !hidden.has(k));
      const result = evaluateRecordCompleteness(curRes.data, visibleKeys, prevRes.data);
      tableStatuses[t] = { status: result.status, label: STATUS_LABELS[result.status], issueCount: result.issueCount };

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
      .eq('dusun_id', dusunId).eq('bulan', bulan).in('tahun', trendYears).order('tahun');
    const { data: trendP4 } = await supabase
      .from('data_pokja4').select('tahun, posyandu_jumlah')
      .eq('dusun_id', dusunId).in('tahun', trendYears).order('tahun');

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

    // Last activity untuk dusun ini — match dusun_nama (canonical) dengan
    // fallback ke desa_nama untuk history audit log lama.
    const { data: lastActivity } = await supabase
      .from('audit_logs')
      .select('username, action, table_name, detail, dusun_nama, desa_nama, created_at')
      .or(`dusun_nama.eq.${dusun.nama},desa_nama.eq.${dusun.nama}`)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      dusun,
      desa: dusun, // alias backward-compat (response shape only)
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
    console.error('Internal dusun detail error:', error);
    return NextResponse.json({ error: 'Gagal memuat detail dusun' }, { status: 500 });
  }
}
