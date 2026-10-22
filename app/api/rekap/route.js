/**
 * @file Rekap API Route — Aggregated summary data for dashboard.
 * GET /api/rekap?tahun=2025
 * Termasuk completeness status per dusun.
 *
 * Migration v5: unit data dusun (sebelumnya desa). Response shape backward-compat:
 * `perDesa` & `perDesaJiwa` dipertahankan sebagai alias dari `perDusun` (sama isi,
 * field id/nama tetap, plus `desa_id`/`desa_nama` aliasing `dusun_id`/`dusun_nama`).
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  COMPLETENESS_STATUS,
  OPERATIONAL_TABLES,
  STATUS_LABELS,
  evaluateRecordCompleteness,
  getTableKeys,
  isKnownOperationalTable,
  mergeStatus,
} from '@/lib/dataQuality';
import { toNumericValue } from '@/lib/chartStats';
import { queryWithOptionalMonth } from '@/lib/monthlyFallback';

// Tabel canonical untuk completeness check (dedup yang `aliasOf`-nya canonical).
const ALL_TABLES = OPERATIONAL_TABLES.filter((item) => !item.aliasOf).map((item) => item.table);
const MONTHLY_TABLES = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);

async function getHiddenKeysPerTable() {
  const { data } = await supabase
    .from('table_column_overrides')
    .select('table_name, column_key, is_hidden')
    .eq('is_hidden', 1);
  const hidden = {};
  (data || []).forEach((r) => {
    if (!hidden[r.table_name]) hidden[r.table_name] = new Set();
    hidden[r.table_name].add(r.column_key);
  });
  return hidden;
}

/** Resolve unit_id row dengan fallback dusun_id → desa_id. */
function unitIdOf(row) {
  return row?.dusun_id ?? row?.desa_id;
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const bulan = Number(searchParams.get('bulan') || 12);
    const jenis = searchParams.get('jenis') || 'all';
    const selectedTables = jenis !== 'all' && isKnownOperationalTable(jenis) ? [jenis] : ALL_TABLES;

    // Fetch dusun
    const { data: dusunList, error: dusunError } = await supabase
      .from('dusun')
      .select('id, nama, nomor_urut, is_active')
      .eq('is_active', 1)
      .order('nomor_urut');
    if (dusunError) throw dusunError;
    const totalDusun = dusunList.length;

    // Fetch data_umum — per-bulan sejak v12, filter agar total tidak ter-multiply 12x.
    const { data: umumList, error: umumError } = await queryWithOptionalMonth(
      () => supabase
        .from('data_umum')
        .select('*')
        .eq('tahun', tahun),
      bulan
    );
    if (umumError) throw umumError;

    const dataUmum = (umumList || []).reduce(
      (acc, curr) => {
        acc.total_kk += toNumericValue(curr.jml_kk);
        acc.total_jiwa_l += toNumericValue(curr.jml_jiwa_l);
        acc.total_jiwa_p += toNumericValue(curr.jml_jiwa_p);
        acc.total_krt += toNumericValue(curr.jml_krt);
        acc.total_dasa_wisma += toNumericValue(curr.jml_dasa_wisma);
        return acc;
      },
      { total_kk: 0, total_jiwa_l: 0, total_jiwa_p: 0, total_krt: 0, total_dasa_wisma: 0 }
    );

    const perDusunJiwa = dusunList.map((d) => {
      const du = (umumList || []).find((u) => unitIdOf(u) === d.id) || {};
      return {
        nama: d.nama,
        nomor_urut: d.nomor_urut,
        jiwa_l: toNumericValue(du.jml_jiwa_l),
        jiwa_p: toNumericValue(du.jml_jiwa_p),
        kk: toNumericValue(du.jml_kk),
      };
    });

    // ── Per-dusun aggregation untuk dashboard charts ──
    // Dipindah ke bawah (setelah semua fetch p1List/p3List/p4List/bumilList/dawisList)
    // supaya tidak terjadi ReferenceError (temporal dead zone).

    // Pokja I
    const { data: p1List } = await supabase.from('data_pokja1').select('*').eq('tahun', tahun);
    const kaderPokja1 = (p1List || []).reduce(
      (sum, c) => sum + toNumericValue(c.kader_pkbn) + toNumericValue(c.kader_pkdrt) + toNumericValue(c.kader_pola_asuh),
      0
    );

    // Pokja II
    const { data: p2List } = await supabase.from('data_pokja2').select('*').eq('tahun', tahun);
    const pokja2Summary = (p2List || []).reduce(
      (acc, row) => {
        acc.paket += toNumericValue(row.paket_a_wrg) + toNumericValue(row.paket_b_wrg) + toNumericValue(row.paket_c_wrg);
        acc.up2k += toNumericValue(row.up2k_pemula_psrt) + toNumericValue(row.up2k_madya_psrt) + toNumericValue(row.up2k_utama_psrt) + toNumericValue(row.up2k_mandiri_psrt);
        acc.koperasi += toNumericValue(row.koperasi_berbadan_hukum_angg);
        return acc;
      },
      { paket: 0, up2k: 0, koperasi: 0 }
    );

    // Pokja III
    const { data: p3List } = await supabase.from('data_pokja3').select('*').eq('tahun', tahun);
    const kaderPokja3 = (p3List || []).reduce(
      (sum, c) => sum + toNumericValue(c.kader_pangan) + toNumericValue(c.kader_sandang) + toNumericValue(c.kader_tata_laksana_rt),
      0
    );
    const rumahSehatTotal = (p3List || []).reduce((sum, c) => sum + toNumericValue(c.rumah_sehat), 0);

    // Pokja IV
    const { data: p4List } = await supabase.from('data_pokja4').select('*').eq('tahun', tahun);
    const kaderPokja4 = (p4List || []).reduce(
      (sum, c) => sum + toNumericValue(c.kader_posyandu) + toNumericValue(c.kader_gizi) + toNumericValue(c.kader_kesling) + toNumericValue(c.kader_kb),
      0
    );
    const posyanduTotal = (p4List || []).reduce((sum, c) => sum + toNumericValue(c.posyandu_jumlah), 0);

    // Bumil
    const { data: bumilList } = await queryWithOptionalMonth(
      () => supabase
        .from('data_bumil')
        .select('*')
        .eq('tahun', tahun),
      bulan
    );
    const bumilSummary = (bumilList || []).reduce(
      (acc, curr) => {
        acc.total_hamil += toNumericValue(curr.ibu_hamil);
        acc.total_melahirkan += toNumericValue(curr.ibu_melahirkan);
        acc.total_bayi_lahir += toNumericValue(curr.bayi_lahir_l) + toNumericValue(curr.bayi_lahir_p);
        return acc;
      },
      { total_hamil: 0, total_melahirkan: 0, total_bayi_lahir: 0 }
    );

    // Rekap Dawis (sebelumnya kegiatan_warga) — per-bulan sejak v10
    const { data: dawisList } = await queryWithOptionalMonth(
      () => supabase
        .from('data_rekap_dawis')
        .select('*')
        .eq('tahun', tahun),
      bulan
    );
    const rekapDawisSummary = (dawisList || []).reduce(
      (acc, row) => {
        acc.anggota += toNumericValue(row.jml_anggota_l) + toNumericValue(row.jml_anggota_p);
        acc.balita += toNumericValue(row.balita_l) + toNumericValue(row.balita_p);
        acc.pus += toNumericValue(row.pus);
        acc.lansia += toNumericValue(row.lansia);
        acc.rumahSehat += toNumericValue(row.rumah_sehat);
        acc.jknBpjs += toNumericValue(row.jkn_bpjs);
        return acc;
      },
      { anggota: 0, balita: 0, pus: 0, lansia: 0, rumahSehat: 0, jknBpjs: 0 }
    );

    // ── Per-dusun aggregation untuk dashboard charts ──
    // v6: kolom data sekarang TEXT — coerce via toNumericValue (string non-numerik = 0).
    const perDusunMetrics = dusunList.map((d) => {
      const du = (umumList || []).find((u) => unitIdOf(u) === d.id) || {};
      const p1 = (p1List || []).find((r) => unitIdOf(r) === d.id) || {};
      const p3 = (p3List || []).find((r) => unitIdOf(r) === d.id) || {};
      const p4 = (p4List || []).find((r) => unitIdOf(r) === d.id) || {};
      const bumilRow = (bumilList || []).find((r) => unitIdOf(r) === d.id) || {};
      const dawisRow = (dawisList || []).find((r) => unitIdOf(r) === d.id) || {};

      const jiwaL = toNumericValue(du.jml_jiwa_l);
      const jiwaP = toNumericValue(du.jml_jiwa_p);
      const kaderTpPkk = toNumericValue(du.jml_kader_tp_pkk_l) + toNumericValue(du.jml_kader_tp_pkk_p);
      const kaderUmum = toNumericValue(du.jml_kader_umum_l) + toNumericValue(du.jml_kader_umum_p);
      const kaderKhusus = toNumericValue(du.jml_kader_khusus_l) + toNumericValue(du.jml_kader_khusus_p);

      return {
        id: d.id,
        nama: d.nama,
        kk: toNumericValue(du.jml_kk),
        jiwa: jiwaL + jiwaP,
        jiwaL,
        jiwaP,
        dasaWisma: toNumericValue(du.jml_dasa_wisma),
        kaderTotal: kaderTpPkk + kaderUmum + kaderKhusus
          + toNumericValue(p1.kader_pkbn) + toNumericValue(p1.kader_pkdrt) + toNumericValue(p1.kader_pola_asuh)
          + toNumericValue(p3.kader_pangan) + toNumericValue(p3.kader_sandang) + toNumericValue(p3.kader_tata_laksana_rt)
          + toNumericValue(p4.kader_posyandu) + toNumericValue(p4.kader_gizi) + toNumericValue(p4.kader_kesling)
          + toNumericValue(p4.kader_kb) + toNumericValue(p4.kader_phbs),
        posyandu: toNumericValue(p4.posyandu_jumlah),
        rumahSehat: toNumericValue(p3.rumah_sehat) + toNumericValue(dawisRow.rumah_sehat),
        ibuHamil: toNumericValue(bumilRow.ibu_hamil),
        bayiLahir: toNumericValue(bumilRow.bayi_lahir_l) + toNumericValue(bumilRow.bayi_lahir_p),
        ibuMelahirkan: toNumericValue(bumilRow.ibu_melahirkan),
        ibuNifas: toNumericValue(bumilRow.ibu_nifas),
        jknBpjs: toNumericValue(dawisRow.jkn_bpjs),
        anggotaDawis: toNumericValue(dawisRow.jml_anggota_l) + toNumericValue(dawisRow.jml_anggota_p),
        balita: toNumericValue(dawisRow.balita_l) + toNumericValue(dawisRow.balita_p),
        lansia: toNumericValue(dawisRow.lansia),
      };
    });

    // ── Aggregate kader breakdown untuk donut chart ──
    const kaderBreakdown = (() => {
      const acc = {
        kaderUmum: 0, // TP PKK + Umum + Khusus
        kaderPokja1: 0,
        kaderPokja3: 0,
        kaderPokja4: 0,
      };
      for (const du of umumList || []) {
        acc.kaderUmum +=
          toNumericValue(du.jml_kader_tp_pkk_l) + toNumericValue(du.jml_kader_tp_pkk_p) +
          toNumericValue(du.jml_kader_umum_l) + toNumericValue(du.jml_kader_umum_p) +
          toNumericValue(du.jml_kader_khusus_l) + toNumericValue(du.jml_kader_khusus_p);
      }
      for (const r of p1List || []) {
        acc.kaderPokja1 += toNumericValue(r.kader_pkbn) + toNumericValue(r.kader_pkdrt) + toNumericValue(r.kader_pola_asuh);
      }
      for (const r of p3List || []) {
        acc.kaderPokja3 += toNumericValue(r.kader_pangan) + toNumericValue(r.kader_sandang) + toNumericValue(r.kader_tata_laksana_rt);
      }
      for (const r of p4List || []) {
        acc.kaderPokja4 += toNumericValue(r.kader_posyandu) + toNumericValue(r.kader_gizi) + toNumericValue(r.kader_kesling)
          + toNumericValue(r.kader_kb) + toNumericValue(r.kader_phbs);
      }
      return acc;
    })();

    const dashboardIndicators = [
      { label: 'KK', value: dataUmum.total_kk, category: 'Data Umum', tone: 'primary' },
      { label: 'Jiwa', value: dataUmum.total_jiwa_l + dataUmum.total_jiwa_p, category: 'Data Umum', tone: 'blue' },
      { label: 'Dasa Wisma', value: dataUmum.total_dasa_wisma, category: 'Data Umum', tone: 'green' },
      { label: 'Kader Pokja I', value: kaderPokja1, category: 'Pokja I', tone: 'amber' },
      { label: 'Warga Paket A-C', value: pokja2Summary.paket, category: 'Pokja II', tone: 'blue' },
      { label: 'Peserta UP2K', value: pokja2Summary.up2k, category: 'Pokja II', tone: 'primary' },
      { label: 'Rumah Sehat', value: rumahSehatTotal + rekapDawisSummary.rumahSehat, category: 'Pokja III/Dawis', tone: 'green' },
      { label: 'Posyandu', value: posyanduTotal, category: 'Pokja IV', tone: 'amber' },
      { label: 'Ibu Hamil', value: bumilSummary.total_hamil, category: 'Bumil', tone: 'blue' },
      { label: 'JKN/BPJS', value: rekapDawisSummary.jknBpjs, category: 'Rekap Dawis', tone: 'primary' },
    ];

    // ── Completeness check ──
    const hiddenKeysPerTable = await getHiddenKeysPerTable();

    const prefetchedCurrent = {
      data_umum: umumList || [],
      data_pokja1: p1List || [],
      data_pokja2: p2List || [],
      data_pokja3: p3List || [],
      data_pokja4: p4List || [],
      data_rekap_dawis: dawisList || [],
      data_bumil: bumilList || [],
    };

    const tableChecks = await Promise.all(
      selectedTables.map(async (tableName) => {
        const allKeys = getTableKeys(tableName);
        const hidden = hiddenKeysPerTable[tableName] || new Set();
        const keys = allKeys.filter((k) => !hidden.has(k));

        const fetchPreviousYearRows = () => {
          const buildQuery = () => supabase.from(tableName).select('*').eq('tahun', Number(tahun) - 1);
          return MONTHLY_TABLES.has(tableName)
            ? queryWithOptionalMonth(buildQuery, bulan)
            : buildQuery();
        };

        const currentRows = prefetchedCurrent[tableName] || [];
        const { data: previousRows } = await fetchPreviousYearRows();
        const currentMap = {};
        const previousMap = {};

        currentRows.forEach((row) => {
          const id = unitIdOf(row);
          if (id != null) currentMap[id] = row;
        });
        (previousRows || []).forEach((row) => {
          const id = unitIdOf(row);
          if (id != null) previousMap[id] = row;
        });

        return { table: tableName, keys, currentMap, previousMap };
      })
    );

    const perDusun = dusunList.map((d) => {
      const tables = {};
      const tableStatuses = {};
      const statuses = [];
      let filled = 0;
      let issueCount = 0;

      for (const tc of tableChecks) {
        const result = evaluateRecordCompleteness(tc.currentMap[d.id], tc.keys, tc.previousMap[d.id]);
        tableStatuses[tc.table] = result;
        tables[tc.table] = result.status === COMPLETENESS_STATUS.COMPLETE;
        statuses.push(result.status);
        issueCount += result.issueCount || 0;
        if (result.status === COMPLETENESS_STATUS.COMPLETE) filled++;
      }

      const status = mergeStatus(statuses);
      return {
        id: d.id,
        nama: d.nama,
        status,
        statusLabel: STATUS_LABELS[status],
        filled,
        total: selectedTables.length,
        issueCount,
        tables,
        tableStatuses,
      };
    });

    const completeness = {
      total: totalDusun,
      complete: perDusun.filter((d) => d.status === COMPLETENESS_STATUS.COMPLETE).length,
      incomplete: perDusun.filter((d) => d.status === COMPLETENESS_STATUS.INCOMPLETE).length,
      needsCheck: perDusun.filter((d) => d.status === COMPLETENESS_STATUS.NEEDS_CHECK).length,
      partial: perDusun.filter((d) => d.status === COMPLETENESS_STATUS.INCOMPLETE).length,
      empty: perDusun.filter((d) => d.status === COMPLETENESS_STATUS.INCOMPLETE && d.filled === 0).length,
      filter: { jenis, bulan, tables: selectedTables },
      perDusun,
      // Backward-compat alias untuk client lama
      perDesa: perDusun,
    };

    // ── Last activity ──
    const { data: lastLog } = await supabase
      .from('audit_logs')
      .select('username, action, table_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      tahun: Number(tahun),
      totalDusun,
      totalDesa: totalDusun, // alias
      dataUmum,
      perDusunJiwa,
      perDesaJiwa: perDusunJiwa, // alias
      perDusunMetrics,
      kaderBreakdown,
      kaderSummary: {
        pokja1: kaderPokja1,
        pokja2: pokja2Summary,
        pokja3: kaderPokja3,
        pokja4: kaderPokja4,
      },
      posyanduTotal,
      bumilSummary,
      rekapDawisSummary,
      kegiatanWargaSummary: rekapDawisSummary, // alias backward-compat
      dashboardIndicators,
      completeness,
      lastActivity: lastLog?.[0] || null,
    });
  } catch (error) {
    console.error('Error fetching rekap:', error);
    return NextResponse.json({ error: 'Gagal mengambil rekapitulasi' }, { status: 500 });
  }
}
