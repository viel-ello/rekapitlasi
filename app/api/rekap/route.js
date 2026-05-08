/**
 * @file Rekap API Route — Aggregated summary data for dashboard
 * GET /api/rekap?tahun=2025
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();

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
    const { data: p1List } = await supabase.from('data_pokja1').select('kader_pkbn, kader_pkdrt, kader_pola_asuh').eq('tahun', tahun);
    const kaderPokja1 = (p1List || []).reduce((sum, c) => sum + (c.kader_pkbn || 0) + (c.kader_pkdrt || 0) + (c.kader_pola_asuh || 0), 0);

    // Kader pokja 3
    const { data: p3List } = await supabase.from('data_pokja3').select('kader_pangan, kader_sandang, kader_tata_laksana_rt').eq('tahun', tahun);
    const kaderPokja3 = (p3List || []).reduce((sum, c) => sum + (c.kader_pangan || 0) + (c.kader_sandang || 0) + (c.kader_tata_laksana_rt || 0), 0);

    // Kader pokja 4
    const { data: p4List } = await supabase.from('data_pokja4').select('kader_posyandu, kader_gizi, kader_kesling, kader_kb, posyandu_jumlah').eq('tahun', tahun);
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

    return NextResponse.json({
      tahun: Number(tahun),
      totalDesa,
      dataUmum,
      perDesaJiwa,
      kaderSummary: {
        pokja1: kaderPokja1,
        pokja3: kaderPokja3,
        pokja4: kaderPokja4,
      },
      posyanduTotal,
      bumilSummary,
    });
  } catch (error) {
    console.error('Error fetching rekap:', error);
    return NextResponse.json({ error: 'Gagal mengambil rekapitulasi' }, { status: 500 });
  }
}
