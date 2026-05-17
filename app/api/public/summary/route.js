/**
 * @file GET /api/public/summary?tahun=&bulan=
 * Public aggregate ringkasan untuk welcome + portal publik.
 * TIDAK butuh auth. Hanya mengembalikan agregat dari tabel di allowlist.
 *
 * Migration v5: unit data dusun. Response shape backward-compat (`totalDesa`/`desa` field tetap, isi dusun).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PUBLIC_DUSUN_FIELDS, PUBLIC_COLUMNS, PUBLIC_TABLES } from '@/lib/publicData';
import {
  COMPLETENESS_STATUS,
  evaluateRecordCompleteness,
  getTableKeys,
  mergeStatus,
  OPERATIONAL_TABLES,
} from '@/lib/dataQuality';

export const dynamic = 'force-dynamic';

const ALLOWED_TABLES_FOR_COMPLETENESS = OPERATIONAL_TABLES.filter((t) => !t.aliasOf).map((t) => t.table);

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

function unitIdOf(row) {
  return row?.dusun_id ?? row?.desa_id;
}

function indexByUnit(rows) {
  const out = {};
  for (const r of rows || []) {
    const id = unitIdOf(r);
    if (id != null) out[id] = r;
  }
  return out;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = clampYear(searchParams.get('tahun') || new Date().getFullYear());
    const bulan = clampMonth(searchParams.get('bulan') || 12);

    // Dusun allowlist field
    const { data: dusunList } = await supabase
      .from('dusun')
      .select(PUBLIC_DUSUN_FIELDS.join(','))
      .eq('is_active', 1)
      .order('nomor_urut');

    const totalDusun = (dusunList || []).length;

    const fetchTable = async (table, fields) => {
      // Select dusun_id (canonical) plus desa_id (legacy) untuk safety
      const cols = ['dusun_id', 'desa_id', ...fields].join(',');
      let query = supabase.from(table).select(cols).eq('tahun', tahun);
      if (table === 'data_bumil') query = query.eq('bulan', bulan);
      const { data } = await query;
      return data || [];
    };

    const [umum, p1, p2, p3, p4, dawis, bumil] = await Promise.all([
      fetchTable('data_umum', PUBLIC_COLUMNS.data_umum),
      fetchTable('data_pokja1', PUBLIC_COLUMNS.data_pokja1),
      fetchTable('data_pokja2', PUBLIC_COLUMNS.data_pokja2),
      fetchTable('data_pokja3', PUBLIC_COLUMNS.data_pokja3),
      fetchTable('data_pokja4', PUBLIC_COLUMNS.data_pokja4),
      fetchTable('data_rekap_dawis', PUBLIC_COLUMNS.data_rekap_dawis),
      fetchTable('data_bumil', PUBLIC_COLUMNS.data_bumil),
    ]);

    const sumColumn = (rows, col) => rows.reduce((s, r) => s + Number(r?.[col] || 0), 0);

    const totals = {
      total_kk: sumColumn(umum, 'jml_kk'),
      total_jiwa: sumColumn(umum, 'jml_jiwa_l') + sumColumn(umum, 'jml_jiwa_p'),
      total_dasa_wisma: sumColumn(umum, 'jml_dasa_wisma'),
      total_kader_pokja1: sumColumn(p1, 'kader_pkbn') + sumColumn(p1, 'kader_pkdrt') + sumColumn(p1, 'kader_pola_asuh'),
      total_paket_pokja2: sumColumn(p2, 'paket_a_wrg') + sumColumn(p2, 'paket_b_wrg') + sumColumn(p2, 'paket_c_wrg'),
      total_rumah_sehat: sumColumn(p3, 'rumah_sehat') + sumColumn(dawis, 'rumah_sehat'),
      total_posyandu: sumColumn(p4, 'posyandu_jumlah'),
      total_bumil: sumColumn(bumil, 'ibu_hamil'),
      total_kelahiran: sumColumn(bumil, 'bayi_lahir_l') + sumColumn(bumil, 'bayi_lahir_p'),
      total_jkn_bpjs: sumColumn(dawis, 'jkn_bpjs'),
    };

    const tableMaps = {
      data_umum: indexByUnit(umum),
      data_pokja1: indexByUnit(p1),
      data_pokja2: indexByUnit(p2),
      data_pokja3: indexByUnit(p3),
      data_pokja4: indexByUnit(p4),
      data_rekap_dawis: indexByUnit(dawis),
      data_kegiatan_warga: indexByUnit(dawis), // alias
      data_bumil: indexByUnit(bumil),
    };

    const perDusun = (dusunList || []).map((d) => {
      const statuses = [];
      for (const t of ALLOWED_TABLES_FOR_COMPLETENESS) {
        const keys = getTableKeys(t);
        const result = evaluateRecordCompleteness(tableMaps[t]?.[d.id], keys);
        statuses.push(result.status);
      }
      return { id: d.id, nama: d.nama, status: mergeStatus(statuses) };
    });

    const completeness = {
      complete: perDusun.filter((p) => p.status === COMPLETENESS_STATUS.COMPLETE).length,
      needsCheck: perDusun.filter((p) => p.status === COMPLETENESS_STATUS.NEEDS_CHECK).length,
      incomplete: perDusun.filter((p) => p.status === COMPLETENESS_STATUS.INCOMPLETE).length,
    };

    return NextResponse.json({
      tahun,
      bulan,
      totalDusun,
      totalDesa: totalDusun, // alias
      totals,
      completeness,
      dusun: perDusun,
      desa: perDusun, // alias backward-compat
      tables: PUBLIC_TABLES,
    });
  } catch (error) {
    console.error('Public summary error:', error);
    return NextResponse.json({ error: 'Gagal memuat ringkasan publik' }, { status: 500 });
  }
}
