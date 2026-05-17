/**
 * @file Trend/Rekap multi-year API.
 * GET /api/rekap/trend?dusun_ids=1,2,3
 *
 * - Tanpa dusun_ids: aggregate semua dusun, return array {tahun, total_*}.
 * - Dengan 1+ dusun_ids: return { aggregate: [...], byDusun: { [dusunId]: { nama, rows: [...] } }, byDesa: alias }.
 *
 * Backward-compat: query param `desa_ids` masih diterima sebagai alias.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

function unitIdOf(row) {
  return row?.dusun_id ?? row?.desa_id;
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const idsRaw = searchParams.get('dusun_ids') ?? searchParams.get('desa_ids');
    const dusunIds = idsRaw
      ? idsRaw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);

    let duQ = supabase.from('data_umum').select('tahun, dusun_id, desa_id, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma').in('tahun', years);
    let p4Q = supabase.from('data_pokja4').select('tahun, dusun_id, desa_id, posyandu_jumlah').in('tahun', years);
    let bumilQ = supabase.from('data_bumil').select('tahun, dusun_id, desa_id, ibu_hamil, bayi_lahir_l, bayi_lahir_p').in('tahun', years);

    if (dusunIds.length > 0) {
      // PostgREST: filter via OR (dusun_id.in atau desa_id.in)
      duQ = duQ.or(`dusun_id.in.(${dusunIds.join(',')}),desa_id.in.(${dusunIds.join(',')})`);
      p4Q = p4Q.or(`dusun_id.in.(${dusunIds.join(',')}),desa_id.in.(${dusunIds.join(',')})`);
      bumilQ = bumilQ.or(`dusun_id.in.(${dusunIds.join(',')}),desa_id.in.(${dusunIds.join(',')})`);
    }

    const [{ data: duAll }, { data: p4All }, { data: bumilAll }] = await Promise.all([duQ, p4Q, bumilQ]);

    const buildRow = (tahun, duRows, p4Rows, bumilRows) => {
      const du = (duRows || []).reduce(
        (acc, curr) => {
          acc.total_kk += curr.jml_kk || 0;
          acc.total_jiwa_l += curr.jml_jiwa_l || 0;
          acc.total_jiwa_p += curr.jml_jiwa_p || 0;
          acc.total_dasa_wisma += curr.jml_dasa_wisma || 0;
          return acc;
        },
        { total_kk: 0, total_jiwa_l: 0, total_jiwa_p: 0, total_dasa_wisma: 0 }
      );
      const p4 = (p4Rows || []).reduce((sum, curr) => sum + (curr.posyandu_jumlah || 0), 0);
      const bumil = (bumilRows || []).reduce(
        (acc, curr) => {
          acc.total_bumil += curr.ibu_hamil || 0;
          acc.total_kelahiran += (curr.bayi_lahir_l || 0) + (curr.bayi_lahir_p || 0);
          return acc;
        },
        { total_bumil: 0, total_kelahiran: 0 }
      );
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

    const aggregate = years.map((tahun) =>
      buildRow(
        tahun,
        (duAll || []).filter((r) => r.tahun === tahun),
        (p4All || []).filter((r) => r.tahun === tahun),
        (bumilAll || []).filter((r) => r.tahun === tahun)
      )
    );

    if (dusunIds.length === 0) {
      return NextResponse.json(aggregate);
    }

    // Per-dusun series
    const { data: dusunList } = await supabase.from('dusun').select('id, nama').in('id', dusunIds);
    const byDusun = {};
    for (const d of dusunList || []) {
      const rows = years.map((tahun) =>
        buildRow(
          tahun,
          (duAll || []).filter((r) => r.tahun === tahun && unitIdOf(r) === d.id),
          (p4All || []).filter((r) => r.tahun === tahun && unitIdOf(r) === d.id),
          (bumilAll || []).filter((r) => r.tahun === tahun && unitIdOf(r) === d.id)
        )
      );
      byDusun[d.id] = { nama: d.nama, rows };
    }

    return NextResponse.json({
      aggregate,
      byDusun,
      byDesa: byDusun, // alias backward-compat
      dusunIds,
      desaIds: dusunIds,
    });
  } catch (error) {
    console.error('Trend error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data tren' }, { status: 500 });
  }
}
