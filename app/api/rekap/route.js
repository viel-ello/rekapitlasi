/**
 * @file Rekap API Route — Aggregated summary data for dashboard
 * GET /api/rekap?tahun=2025
 * Includes completeness status per desa
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

const ALL_TABLES = OPERATIONAL_TABLES.map((item) => item.table);

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

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const bulan = Number(searchParams.get('bulan') || 12);
    const jenis = searchParams.get('jenis') || 'all';
    const selectedTables = jenis !== 'all' && isKnownOperationalTable(jenis) ? [jenis] : ALL_TABLES;

    // Fetch desa
    const { data: desaList, error: desaError } = await supabase.from('desa').select('*').eq('is_active', 1).order('nomor_urut');
    if (desaError) throw desaError;
    const totalDesa = desaList.length;

    // Fetch data_umum
    const { data: umumList, error: umumError } = await supabase.from('data_umum').select('*').eq('tahun', tahun);
    if (umumError) throw umumError;

    const dataUmum = umumList.reduce((acc, curr) => {
      acc.total_kk += curr.jml_kk || 0;
      acc.total_jiwa_l += curr.jml_jiwa_l || 0;
      acc.total_jiwa_p += curr.jml_jiwa_p || 0;
      acc.total_krt += curr.jml_krt || 0;
      acc.total_dasa_wisma += curr.jml_dasa_wisma || 0;
      return acc;
    }, { total_kk: 0, total_jiwa_l: 0, total_jiwa_p: 0, total_krt: 0, total_dasa_wisma: 0 });

    const perDesaJiwa = desaList.map(d => {
      const du = umumList.find(u => u.desa_id === d.id) || {};
      return {
        nama: d.nama,
        nomor_urut: d.nomor_urut,
        jiwa_l: du.jml_jiwa_l || 0,
        jiwa_p: du.jml_jiwa_p || 0,
        kk: du.jml_kk || 0
      };
    });

    // Kader pokja 1
    const { data: p1List } = await supabase.from('data_pokja1').select('*').eq('tahun', tahun);
    const kaderPokja1 = (p1List || []).reduce((sum, c) => sum + (c.kader_pkbn || 0) + (c.kader_pkdrt || 0) + (c.kader_pola_asuh || 0), 0);

    // Pokja 2
    const { data: p2List } = await supabase.from('data_pokja2').select('*').eq('tahun', tahun);
    const pokja2Summary = (p2List || []).reduce((acc, row) => {
      acc.paket += toNumericValue(row.paket_a_wrg) + toNumericValue(row.paket_b_wrg) + toNumericValue(row.paket_c_wrg);
      acc.up2k += toNumericValue(row.up2k_pemula_psrt) + toNumericValue(row.up2k_madya_psrt) + toNumericValue(row.up2k_utama_psrt) + toNumericValue(row.up2k_mandiri_psrt);
      acc.koperasi += toNumericValue(row.koperasi_belum_bh_angg) + toNumericValue(row.koperasi_berbadan_hukum_angg);
      acc.usahaMikro += toNumericValue(row.usaha_mikro);
      return acc;
    }, { paket: 0, up2k: 0, koperasi: 0, usahaMikro: 0 });

    // Kader pokja 3
    const { data: p3List } = await supabase.from('data_pokja3').select('*').eq('tahun', tahun);
    const kaderPokja3 = (p3List || []).reduce((sum, c) => sum + (c.kader_pangan || 0) + (c.kader_sandang || 0) + (c.kader_tata_laksana_rt || 0), 0);
    const rumahSehatTotal = (p3List || []).reduce((sum, c) => sum + toNumericValue(c.rumah_sehat), 0);

    // Kader pokja 4
    const { data: p4List } = await supabase.from('data_pokja4').select('*').eq('tahun', tahun);
    const kaderPokja4 = (p4List || []).reduce((sum, c) => sum + (c.kader_posyandu || 0) + (c.kader_gizi || 0) + (c.kader_kesling || 0) + (c.kader_kb || 0), 0);
    const posyanduTotal = (p4List || []).reduce((sum, c) => sum + (c.posyandu_jumlah || 0), 0);

    // Bumil
    const { data: bumilList } = await supabase.from('data_bumil').select('ibu_hamil, ibu_melahirkan, bayi_lahir_l, bayi_lahir_p').eq('tahun', tahun);
    const bumilSummary = (bumilList || []).reduce((acc, curr) => {
      acc.total_hamil += curr.ibu_hamil || 0;
      acc.total_melahirkan += curr.ibu_melahirkan || 0;
      acc.total_bayi_lahir += (curr.bayi_lahir_l || 0) + (curr.bayi_lahir_p || 0);
      return acc;
    }, { total_hamil: 0, total_melahirkan: 0, total_bayi_lahir: 0 });

    const { data: kegiatanList } = await supabase.from('data_kegiatan_warga').select('*').eq('tahun', tahun);
    const kegiatanWargaSummary = (kegiatanList || []).reduce((acc, row) => {
      acc.anggota += toNumericValue(row.jml_anggota_l) + toNumericValue(row.jml_anggota_p);
      acc.balita += toNumericValue(row.balita_l) + toNumericValue(row.balita_p);
      acc.pus += toNumericValue(row.pus);
      acc.lansia += toNumericValue(row.lansia);
      acc.rumahSehat += toNumericValue(row.rumah_sehat);
      acc.jknBpjs += toNumericValue(row.jkn_bpjs);
      return acc;
    }, { anggota: 0, balita: 0, pus: 0, lansia: 0, rumahSehat: 0, jknBpjs: 0 });

    const dashboardIndicators = [
      { label: 'KK', value: dataUmum.total_kk, category: 'Data Umum', tone: 'primary' },
      { label: 'Jiwa', value: dataUmum.total_jiwa_l + dataUmum.total_jiwa_p, category: 'Data Umum', tone: 'blue' },
      { label: 'Dasa Wisma', value: dataUmum.total_dasa_wisma, category: 'Data Umum', tone: 'green' },
      { label: 'Kader Pokja I', value: kaderPokja1, category: 'Pokja I', tone: 'amber' },
      { label: 'Warga Paket A-C', value: pokja2Summary.paket, category: 'Pokja II', tone: 'blue' },
      { label: 'Peserta UP2K', value: pokja2Summary.up2k, category: 'Pokja II', tone: 'primary' },
      { label: 'Rumah Sehat', value: rumahSehatTotal + kegiatanWargaSummary.rumahSehat, category: 'Pokja III/Warga', tone: 'green' },
      { label: 'Posyandu', value: posyanduTotal, category: 'Pokja IV', tone: 'amber' },
      { label: 'Ibu Hamil', value: bumilSummary.total_hamil, category: 'Bumil', tone: 'blue' },
      { label: 'JKN/BPJS', value: kegiatanWargaSummary.jknBpjs, category: 'Kegiatan Warga', tone: 'primary' },
    ];

    // ── Completeness check ──
    const hiddenKeysPerTable = await getHiddenKeysPerTable();

    const tableChecks = await Promise.all(
      selectedTables.map(async (tableName) => {
        const allKeys = getTableKeys(tableName);
        const hidden = hiddenKeysPerTable[tableName] || new Set();
        const keys = allKeys.filter((k) => !hidden.has(k));

        let currentQuery = supabase.from(tableName).select('*').eq('tahun', tahun);
        let previousQuery = supabase.from(tableName).select('*').eq('tahun', Number(tahun) - 1);

        if (tableName === 'data_bumil') {
          currentQuery = currentQuery.eq('bulan', bulan);
          previousQuery = previousQuery.eq('bulan', bulan);
        }

        const [{ data: currentRows }, { data: previousRows }] = await Promise.all([currentQuery, previousQuery]);
        const currentMap = {};
        const previousMap = {};

        (currentRows || []).forEach((row) => { currentMap[row.desa_id] = row; });
        (previousRows || []).forEach((row) => { previousMap[row.desa_id] = row; });

        return { table: tableName, keys, currentMap, previousMap };
      })
    );

    const perDesa = desaList.map(d => {
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
      total: totalDesa,
      complete: perDesa.filter(d => d.status === COMPLETENESS_STATUS.COMPLETE).length,
      incomplete: perDesa.filter(d => d.status === COMPLETENESS_STATUS.INCOMPLETE).length,
      needsCheck: perDesa.filter(d => d.status === COMPLETENESS_STATUS.NEEDS_CHECK).length,
      partial: perDesa.filter(d => d.status === COMPLETENESS_STATUS.INCOMPLETE).length,
      empty: perDesa.filter(d => d.status === COMPLETENESS_STATUS.INCOMPLETE && d.filled === 0).length,
      filter: { jenis, bulan, tables: selectedTables },
      perDesa,
    };

    // ── Last activity ──
    const { data: lastLog } = await supabase
      .from('audit_logs')
      .select('username, action, table_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      tahun: Number(tahun),
      totalDesa,
      dataUmum,
      perDesaJiwa,
      kaderSummary: {
        pokja1: kaderPokja1,
        pokja2: pokja2Summary,
        pokja3: kaderPokja3,
        pokja4: kaderPokja4,
      },
      posyanduTotal,
      bumilSummary,
      kegiatanWargaSummary,
      dashboardIndicators,
      completeness,
      lastActivity: lastLog?.[0] || null,
    });
  } catch (error) {
    console.error('Error fetching rekap:', error);
    return NextResponse.json({ error: 'Gagal mengambil rekapitulasi' }, { status: 500 });
  }
}
