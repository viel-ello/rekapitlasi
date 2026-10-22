import { NextResponse } from 'next/server';
import { getPublicYears, publicPeriod, readPublicPeriod, publicUnitStatus, PUBLIC_TABLES } from '@/lib/publicRepository';
import { toNumericValue } from '@/lib/chartStats';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { tahun, bulan } = publicPeriod(new URL(request.url).searchParams);
    const [source, years] = await Promise.all([readPublicPeriod(tahun, bulan), getPublicYears()]);
    const sum = (table, key) => source.rows[table].reduce((total, row) => total + toNumericValue(row[key]), 0);
    const totals = {
      total_kk: sum('data_umum', 'jml_kk'),
      total_jiwa: sum('data_umum', 'jml_jiwa_l') + sum('data_umum', 'jml_jiwa_p'),
      total_dasa_wisma: sum('data_umum', 'jml_dasa_wisma'),
      total_kader_pokja1: sum('data_pokja1', 'kader_pkbn') + sum('data_pokja1', 'kader_pkdrt') + sum('data_pokja1', 'kader_pola_asuh'),
      total_paket_pokja2: sum('data_pokja2', 'paket_a_wrg') + sum('data_pokja2', 'paket_b_wrg') + sum('data_pokja2', 'paket_c_wrg'),
      total_rumah_sehat: sum('data_pokja3', 'rumah_sehat') + sum('data_rekap_dawis', 'rumah_sehat'),
      total_posyandu: sum('data_pokja4', 'posyandu_jumlah'),
      total_bumil: sum('data_bumil', 'ibu_hamil'),
      total_kelahiran: sum('data_bumil', 'bayi_lahir_l') + sum('data_bumil', 'bayi_lahir_p'),
      total_jkn_bpjs: sum('data_rekap_dawis', 'jkn_bpjs'),
    };
    const dusun = source.dusun.map((row) => ({ id: row.id, nama: row.nama, status: publicUnitStatus(source, row.id).status }));
    const completeness = {
      complete: dusun.filter((row) => row.status === 'lengkap').length,
      needsCheck: dusun.filter((row) => row.status === 'perlu_dicek').length,
      incomplete: dusun.filter((row) => row.status === 'belum_lengkap').length,
    };
    const timestamps = source.rows.data_umum.map((row) => row.updated_at).filter((value) => value && Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a));
    const perDusunChart = source.dusun.map((row) => {
      const umum = source.rows.data_umum.find((item) => item.dusun_id === row.id);
      return { nama: row.nama, hasData: !!umum, kk: toNumericValue(umum?.jml_kk), jiwa: toNumericValue(umum?.jml_jiwa_l) + toNumericValue(umum?.jml_jiwa_p) };
    });
    return NextResponse.json({ tahun, bulan, totalDusun: dusun.length, totalDesa: dusun.length, totals, completeness, lastUpdated: timestamps[0] || null, perDusunChart, dusun, desa: dusun, tables: PUBLIC_TABLES, years: years.map((row) => row.tahun), hasData: source.hasData, availability: source.availability, periods: source.periods });
  } catch {
    return NextResponse.json({ error: 'Ringkasan publik belum dapat dimuat. Silakan coba lagi.' }, { status: 503 });
  }
}
