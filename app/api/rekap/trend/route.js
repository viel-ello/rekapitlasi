/**
 * @file Trend/Rekap multi-year API
 * GET /api/rekap/trend?desa_ids=1,2,3
 *
 * - Tanpa desa_ids: aggregate semua desa, return array {tahun,total_*}
 * - Dengan 1+ desa_ids: return { aggregate: [...], byDesa: { [desaId]: { nama, rows: [...] } } }
 *   sehingga client bisa render comparison line.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const desaIdsRaw = searchParams.get('desa_ids');
    const desaIds = desaIdsRaw
      ? desaIdsRaw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);

    let duQ = supabase.from('data_umum').select('tahun, desa_id, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma').in('tahun', years);
    let p4Q = supabase.from('data_pokja4').select('tahun, desa_id, posyandu_jumlah').in('tahun', years);
    let bumilQ = supabase.from('data_bumil').select('tahun, desa_id, ibu_hamil, bayi_lahir_l, bayi_lahir_p').in('tahun', years);

    if (desaIds.length > 0) {
      duQ = duQ.in('desa_id', desaIds);
      p4Q = p4Q.in('desa_id', desaIds);
      bumilQ = bumilQ.in('desa_id', desaIds);
    }

    const [{ data: duAll }, { data: p4All }, { data: bumilAll }] = await Promise.all([duQ, p4Q, bumilQ]);

    const buildRow = (tahun, duRows, p4Rows, bumilRows) => {
      const du = (duRows || []).reduce((acc, curr) => {
        acc.total_kk += curr.jml_kk || 0;
        acc.total_jiwa_l += curr.jml_jiwa_l || 0;
        acc.total_jiwa_p += curr.jml_jiwa_p || 0;
        acc.total_dasa_wisma += curr.jml_dasa_wisma || 0;
        return acc;
      }, { total_kk: 0, total_jiwa_l: 0, total_jiwa_p: 0, total_dasa_wisma: 0 });
      const p4 = (p4Rows || []).reduce((sum, curr) => sum + (curr.posyandu_jumlah || 0), 0);
      const bumil = (bumilRows || []).reduce((acc, curr) => {
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
    };

    const aggregate = years.map((tahun) => buildRow(
      tahun,
      (duAll || []).filter((r) => r.tahun === tahun),
      (p4All || []).filter((r) => r.tahun === tahun),
      (bumilAll || []).filter((r) => r.tahun === tahun),
    ));

    if (desaIds.length === 0) {
      return NextResponse.json(aggregate);
    }

    // Build per-desa series
    const { data: desaList } = await supabase.from('desa').select('id, nama').in('id', desaIds);
    const byDesa = {};
    for (const d of desaList || []) {
      const rows = years.map((tahun) => buildRow(
        tahun,
        (duAll || []).filter((r) => r.tahun === tahun && r.desa_id === d.id),
        (p4All || []).filter((r) => r.tahun === tahun && r.desa_id === d.id),
        (bumilAll || []).filter((r) => r.tahun === tahun && r.desa_id === d.id),
      ));
      byDesa[d.id] = { nama: d.nama, rows };
    }

    return NextResponse.json({ aggregate, byDesa, desaIds });
  } catch (error) {
    console.error('Trend error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data tren' }, { status: 500 });
  }
}
