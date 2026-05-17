/**
 * @file Allowlist tabel & kolom untuk public API.
 * Hanya field agregat/non-sensitif yang aman ditampilkan ke publik.
 *
 * Migration v5:
 * - Tabel `data_kegiatan_warga` di-rename → `data_rekap_dawis`. Kedua nama
 *   ada di allowlist supaya transition smooth.
 * - Tabel `dusun` mengganti `desa` sebagai unit data utama.
 *
 * Aturan:
 * - Tidak boleh ada field PII (nama warga, alamat, NIK, telepon) — schema PKK saat ini hanya angka agregat per dusun.
 * - Tidak boleh expose tabel users, audit_logs, table_column_overrides, table_schemas, rate_limits, notifications, report_periods.
 * - dusun: hanya id, nama, nomor_urut, is_active.
 */

// Canonical list of tables yang aman untuk public.
export const PUBLIC_TABLES = [
  'data_umum',
  'data_pokja1',
  'data_pokja2',
  'data_pokja3',
  'data_pokja4',
  'data_rekap_dawis',
  'data_bumil',
];

// Backward-compat alias: nama lama. Tidak masuk ke iterator default.
const LEGACY_PUBLIC_TABLES = ['data_kegiatan_warga']; // eslint-disable-line no-unused-vars

const REKAP_DAWIS_PUBLIC_COLS = ['jml_kk', 'jml_anggota_l', 'jml_anggota_p', 'rumah_sehat', 'jamban', 'jkn_bpjs'];

export const PUBLIC_COLUMNS = {
  data_umum: ['jml_dusun', 'jml_pkk_rw', 'jml_pkk_rt', 'jml_dasa_wisma', 'jml_krt', 'jml_kk', 'jml_jiwa_l', 'jml_jiwa_p'],
  data_pokja1: ['kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh', 'lansia_jml_klp', 'lansia_jml_anggota', 'gr_kerja_bakti', 'gr_keagamaan', 'gr_jimpitan', 'gr_arisan'],
  data_pokja2: ['paket_a_wrg', 'paket_b_wrg', 'paket_c_wrg', 'taman_bacaan'],
  data_pokja3: ['kader_pangan', 'kader_sandang', 'kader_tata_laksana_rt', 'pemanfaatan_toga', 'rumah_sehat', 'rumah_kurang_sehat'],
  data_pokja4: ['kader_posyandu', 'kader_gizi', 'kader_kesling', 'kader_kb', 'posyandu_jumlah', 'posyandu_terintegrasi', 'rumah_jamban', 'rumah_spal', 'air_pdam', 'air_sumur'],
  data_rekap_dawis: REKAP_DAWIS_PUBLIC_COLS,
  data_bumil: ['ibu_hamil', 'ibu_melahirkan', 'bayi_lahir_l', 'bayi_lahir_p'],
};

/** Backward-compat alias: legacy caller boleh pakai data_kegiatan_warga. */
const LEGACY_TABLE_ALIAS = {
  data_kegiatan_warga: 'data_rekap_dawis',
};

function resolveTable(tableName) {
  return LEGACY_TABLE_ALIAS[tableName] || tableName;
}

// Field dusun (sebelumnya `desa`) yang aman ditampilkan publik. Skema masih sama.
export const PUBLIC_DUSUN_FIELDS = ['id', 'nama', 'nomor_urut', 'is_active'];
// Backward-compat alias
export const PUBLIC_DESA_FIELDS = PUBLIC_DUSUN_FIELDS;

/** Pick kolom safe dari row sesuai allowlist. */
export function pickPublicFields(row, tableName) {
  const canonical = resolveTable(tableName);
  const allowed = PUBLIC_COLUMNS[canonical] || [];
  const out = {};
  for (const k of allowed) {
    if (row && row[k] !== undefined && row[k] !== null) out[k] = row[k];
    else out[k] = 0;
  }
  return out;
}

export function isPublicTable(tableName) {
  const canonical = resolveTable(tableName);
  return PUBLIC_TABLES.includes(canonical);
}

export function getPublicColumns(tableName) {
  return PUBLIC_COLUMNS[resolveTable(tableName)] || [];
}
