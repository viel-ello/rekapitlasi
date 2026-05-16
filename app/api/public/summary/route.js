/**
 * @file GET /api/public/summary?tahun=&bulan=
 * Public aggregate ringkasan untuk welcome + portal publik.
 * TIDAK butuh auth. Hanya mengembalikan agregat dari tabel di allowlist.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PUBLIC_DESA_FIELDS, PUBLIC_COLUMNS } from '@/lib/publicData';
import {
  COMPLETENESS_STATUS,
  evaluateRecordCompleteness,
  getTableKeys,
  mergeStatus,
  OPERATIONAL_TABLES,
} from '@/lib/dataQuality';

export const dynamic = 'force-dynamic';

const ALLOWED_TABLES_FOR_COMPLETENESS = OPERATIONAL_TABLES.map((t) => t.table);

function clampYear(input) {
  const n = Number(input);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return new Date().getFullYear();
  return n;
}

function clampMonth(input) {
  const n = Number(input);
  if (!Number.isInteger(n) || n < 1 || n > 12) return 12;
  return n;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = clampYear(searchParams.get('tahun') || new Date().getFullYear());
    const bulan = clampMonth(searchParams.get('bulan') || 12);

    // Desa allowlist field
    const { data: desaList } = await supabase
      .from('desa')
      .select(PUBLIC_DESA_FIELDS.join(','))
      .eq('is_active', 1)
      .order('nomor_urut');

    const totalDesa = (desaList || []).length;

    // Aggregate totals — hanya kolom dari PUBLIC_COLUMNS
    const fetchTable = async (table, fields) => {
      let query = supabase.from(table).select(['desa_id', ...fields].join(',')).eq('tahun', tahun);
      if (table === 'data_bumil') query = query.eq('bulan', bulan);
      const { data } = await query;
      return data || [];
    };

    const [umum, p1, p2, p3, p4, kegiatan, bumil] = await Promise.all([
      fetchTable('data_umum', PUBLIC_COLUMNS.data_umum),
      fetchTable('data_pokja1', PUBLIC_COLUMNS.data_pokja1),
      fetchTable('data_pokja2', PUBLIC_COLUMNS.data_pokja2),
      fetchTable('data_pokja3', PUBLIC_COLUMNS.data_pokja3),
      fetchTable('data_pokja4', PUBLIC_COLUMNS.data_pokja4),
      fetchTable('data_kegiatan_warga', PUBLIC_COLUMNS.data_kegiatan_warga),
      fetchTable('data_bumil', PUBLIC_COLUMNS.data_bumil),
    ]);

    const sumColumn = (rows, col) => rows.reduce((s, r) => s + Number(r?.[col] || 0), 0);

    const totals = {
      total_kk: sumColumn(umum, 'jml_kk'),
      total_jiwa: sumColumn(umum, 'jml_jiwa_l') + sumColumn(umum, 'jml_jiwa_p'),
      total_dasa_wisma: sumColumn(umum, 'jml_dasa_wisma'),
      total_kader_pokja1: sumColumn(p1, 'kader_pkbn') + sumColumn(p1, 'kader_pkdrt') + sumColumn(p1, 'kader_pola_asuh'),
      total_paket_pokja2: sumColumn(p2, 'paket_a_wrg') + sumColumn(p2, 'paket_b_wrg') + sumColumn(p2, 'paket_c_wrg'),
      total_rumah_sehat: sumColumn(p3, 'rumah_sehat') + sumColumn(kegiatan, 'rumah_sehat'),
      total_posyandu: sumColumn(p4, 'posyandu_jumlah'),
      total_bumil: sumColumn(bumil, 'ibu_hamil'),
      total_kelahiran: sumColumn(bumil, 'bayi_lahir_l') + sumColumn(bumil, 'bayi_lahir_p'),
      total_jkn_bpjs: sumColumn(kegiatan, 'jkn_bpjs'),
    };

    // Completeness per desa (gabung semua tabel)
    const tableMaps = {
      data_umum: indexByDesa(umum),
      data_pokja1: indexByDesa(p1),
      data_pokja2: indexByDesa(p2),
      data_pokja3: indexByDesa(p3),
      data_pokja4: indexByDesa(p4),
      data_kegiatan_warga: indexByDesa(kegiatan),
      data_bumil: indexByDesa(bumil),
    };

    const perDesa = (desaList || []).map((d) => {
      const statuses = [];
      for (const t of ALLOWED_TABLES_FOR_COMPLETENESS) {
        const keys = getTableKeys(t);
        const result = evaluateRecordCompleteness(tableMaps[t]?.[d.id], keys);
        statuses.push(result.status);
      }
      return { id: d.id, nama: d.nama, status: mergeStatus(statuses) };
    });

    const completeness = {
      complete: perDesa.filter((p) => p.status === COMPLETENESS_STATUS.COMPLETE).length,
      needsCheck: perDesa.filter((p) => p.status === COMPLETENESS_STATUS.NEEDS_CHECK).length,
      incomplete: perDesa.filter((p) => p.status === COMPLETENESS_STATUS.INCOMPLETE).length,
    };

    return NextResponse.json({
      tahun,
      bulan,
      totalDesa,
      totals,
      completeness,
      desa: perDesa,
    });
  } catch (error) {
    console.error('Public summary error:', error);
    return NextResponse.json({ error: 'Gagal memuat ringkasan publik' }, { status: 500 });
  }
}

function indexByDesa(rows) {
  const out = {};
  for (const r of rows || []) {
    out[r.desa_id] = r;
  }
  return out;
}
