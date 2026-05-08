/**
 * @file Trend/Rekap multi-year API
 * GET /api/rekap/trend — Returns aggregated stats for recent years
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    // Fetch all data for the 3 years at once to avoid loop queries
    const { data: duAll } = await supabase.from('data_umum').select('tahun, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma').in('tahun', years);
    const { data: p4All } = await supabase.from('data_pokja4').select('tahun, posyandu_jumlah').in('tahun', years);
    const { data: bumilAll } = await supabase.from('data_bumil').select('tahun, ibu_hamil, bayi_lahir_l, bayi_lahir_p').in('tahun', years);

    const trend = years.map(tahun => {
      const du = (duAll || []).filter(d => d.tahun === tahun).reduce((acc, curr) => {
        acc.total_kk += curr.jml_kk || 0;
        acc.total_jiwa_l += curr.jml_jiwa_l || 0;
        acc.total_jiwa_p += curr.jml_jiwa_p || 0;
        acc.total_dasa_wisma += curr.jml_dasa_wisma || 0;
        return acc;
      }, { total_kk: 0, total_jiwa_l: 0, total_jiwa_p: 0, total_dasa_wisma: 0 });

      const p4 = (p4All || []).filter(d => d.tahun === tahun).reduce((sum, curr) => sum + (curr.posyandu_jumlah || 0), 0);

      const bumil = (bumilAll || []).filter(d => d.tahun === tahun).reduce((acc, curr) => {
        acc.total_bumil += curr.ibu_hamil || 0;
        acc.total_kelahiran += (curr.bayi_lahir_l || 0) + (curr.bayi_lahir_p || 0);
        return acc;
      }, { total_bumil: 0, total_kelahiran: 0 });

      return {
        tahun,
        total_kk: du.total_kk,
        total_jiwa: du.total_jiwa_l + du.total_jiwa_p,
        total_dasa_wisma: du.total_dasa_wisma,
        total_posyandu: p4,
        total_bumil: bumil.total_bumil,
        total_kelahiran: bumil.total_kelahiran,
      };
    });
    return NextResponse.json(trend);
  } catch (error) {
    console.error('Trend error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data tren' }, { status: 500 });
  }
}
