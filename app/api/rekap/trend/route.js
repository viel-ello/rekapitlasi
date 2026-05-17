/**
 * @file Trend/Rekap multi-year API.
 * GET /api/rekap/trend?dusun_ids=1,2,3
 *
 * - Tanpa dusun_ids: aggregate semua dusun, return array {tahun, total_*}.
 * - Dengan 1+ dusun_ids: return { aggregate: [...], byDusun: { [dusunId]: { nama, rows: [...] } }, byDesa: alias }.
 *
 * Backward-compat: query param `desa_ids` masih diterima sebagai alias dari
 * `dusun_ids`. Schema baru pakai dusun_id only — kolom desa_id tidak ada di
 * tabel data_*, jadi query tidak boleh select/filter desa_id.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { toNumericValue } from '@/lib/chartStats';

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

    let duQ = supabase
      .from('data_umum')
      .select('tahun, dusun_id, jml_kk, jml_jiwa_l, jml_jiwa_p, jml_dasa_wisma')
      .in('tahun', years);
    let p4Q = supabase
      .from('data_pokja4')
      .select('tahun, dusun_id, posyandu_jumlah')
      .in('tahun', years);
    let bumilQ = supabase
      .from('data_bumil')
      .select('tahun, dusun_id, ibu_hamil, bayi_lahir_l, bayi_lahir_p')
      .in('tahun', years);

    if (dusunIds.length > 0) {
      duQ = duQ.in('dusun_id', dusunIds);
      p4Q = p4Q.in('dusun_id', dusunIds);
      bumilQ = bumilQ.in('dusun_id', dusunIds);
    }

    const [{ data: duAll }, { data: p4All }, { data: bumilAll }] = await Promise.all([duQ, p4Q, bumilQ]);

    const buildRow = (tahun, duRows, p4Rows, bumilRows) => {
      const du = (duRows || []).reduce(
        (acc, curr) => {
          acc.total_kk += toNumericValue(curr.jml_kk);
          acc.total_jiwa_l += toNumericValue(curr.jml_jiwa_l);
          acc.total_jiwa_p += toNumericValue(curr.jml_jiwa_p);
          acc.total_dasa_wisma += toNumericValue(curr.jml_dasa_wisma);
          return acc;
        },
        { total_kk: 0, total_jiwa_l: 0, total_jiwa_p: 0, total_dasa_wisma: 0 }
      );
      const p4 = (p4Rows || []).reduce((sum, curr) => sum + toNumericValue(curr.posyandu_jumlah), 0);
      const bumil = (bumilRows || []).reduce(
        (acc, curr) => {
          acc.total_bumil += toNumericValue(curr.ibu_hamil);
          acc.total_kelahiran += toNumericValue(curr.bayi_lahir_l) + toNumericValue(curr.bayi_lahir_p);
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
          (duAll || []).filter((r) => r.tahun === tahun && r.dusun_id === d.id),
          (p4All || []).filter((r) => r.tahun === tahun && r.dusun_id === d.id),
          (bumilAll || []).filter((r) => r.tahun === tahun && r.dusun_id === d.id)
        )
      );
      byDusun[d.id] = { nama: d.nama, rows };
    }

    return NextResponse.json({
      aggregate,
      byDusun,
      byDesa: byDusun, // alias backward-compat (response shape only)
      dusunIds,
      desaIds: dusunIds,
    });
  } catch (error) {
    console.error('Trend error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data tren' }, { status: 500 });
  }
}
