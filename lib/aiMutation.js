/**
 * @file Validasi & sanitasi proposal mutasi data dari AI chat.
 *
 * Dipakai oleh:
 *   - `app/api/chat/route.js` — saat AI function-call → buat PREVIEW (tidak eksekusi).
 *   - `app/api/chat/confirm-mutation/route.js` — saat user konfirmasi → re-validasi + eksekusi.
 *
 * Prinsip keamanan: validasi SELALU dijalankan ulang di server saat konfirmasi,
 * tidak percaya payload preview dari client. Role diambil dari JWT, bukan body.
 */

import { normalizeTableName, ROLE_SCOPE } from '@/lib/auth';
import { toBoundedInteger } from '@/lib/requestValidation';

// Whitelist tabel yang boleh dimutasi via AI. `data_kegiatan_warga` alias
// dipertahankan untuk transition; akan di-normalize ke `data_rekap_dawis`.
export const VALID_TABLES = [
  'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
  'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil',
];

export const VALID_COLUMNS = {
  data_umum: ['jml_dusun', 'jml_pkk_rw', 'jml_pkk_rt', 'jml_dasa_wisma', 'jml_krt', 'jml_kk', 'jml_jiwa_l', 'jml_jiwa_p', 'jml_kader_tp_pkk_l', 'jml_kader_tp_pkk_p', 'jml_kader_umum_l', 'jml_kader_umum_p', 'jml_kader_khusus_l', 'jml_kader_khusus_p', 'jml_tenaga_honorer_l', 'jml_tenaga_honorer_p', 'jml_tenaga_bantuan_l', 'jml_tenaga_bantuan_p', 'keterangan'],
  data_pokja1: ['kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh', 'pkbn_jml_klp_simulasi', 'pkbn_jml_anggota', 'pkdrt_jml_klp_simulasi', 'pkdrt_jml_anggota', 'pola_asuh_jml_klp', 'pola_asuh_jml_anggota', 'lansia_jml_klp', 'lansia_jml_anggota', 'gr_kerja_bakti', 'gr_rukun_kematian', 'gr_keagamaan', 'gr_jimpitan', 'gr_arisan', 'keterangan'],
  data_pokja2: ['jml_warga_3_buta', 'paket_a_klp', 'paket_a_wrg', 'paket_b_klp', 'paket_b_wrg', 'paket_c_klp', 'paket_c_wrg', 'kf_klp', 'kf_wrg', 'paud_sejenis', 'taman_bacaan', 'klp_pembaca', 'bkb_klp', 'bkb_jml_ibu_peserta', 'bkb_ape_set_a', 'bkb_ape_set_b', 'kader_tutor_kf', 'kader_tutor_paud', 'kader_bkb', 'kader_khusus_koperasi', 'kader_khusus_keterampilan', 'yg_dilatih_lp3pkk', 'yg_dilatih_tp3pkk', 'yg_dilatih_damaspkk', 'up2k_pemula_klp', 'up2k_pemula_psrt', 'up2k_madya_klp', 'up2k_madya_psrt', 'up2k_utama_klp', 'up2k_utama_psrt', 'up2k_mandiri_klp', 'up2k_mandiri_psrt', 'koperasi_berbadan_hukum_kop', 'koperasi_berbadan_hukum_angg', 'keterangan'],
  data_pokja3: ['kader_pangan', 'kader_sandang', 'kader_tata_laksana_rt', 'pangan_beras', 'pangan_non_beras', 'pemanfaatan_peternakan', 'pemanfaatan_perikanan', 'pemanfaatan_warung_hidup', 'pemanfaatan_lumbung_hidup', 'pemanfaatan_toga', 'pemanfaatan_tanaman_keras', 'industri_pangan', 'industri_sandang', 'industri_jasa', 'rumah_sehat', 'rumah_kurang_sehat', 'keterangan'],
  data_pokja4: ['kader_posyandu', 'kader_gizi', 'kader_kesling', 'kader_penyuluh_narkoba', 'kader_phbs', 'kader_kb', 'posyandu_jumlah', 'posyandu_terintegrasi', 'lansia_jml_klp', 'lansia_jml_anggota', 'lansia_jml_kartu_berobat', 'rumah_jamban', 'rumah_spal', 'rumah_tempat_sampah', 'rumah_mck', 'air_pdam', 'air_sumur', 'air_lain', 'jml_pus', 'jml_wus', 'akseptor_kb_l', 'akseptor_kb_p', 'kk_tabungan', 'keterangan'],
  data_rekap_dawis: ['jml_rw', 'jml_rt', 'jml_dawis', 'jml_krt', 'jml_kk', 'jml_anggota_l', 'jml_anggota_p', 'balita_l', 'balita_p', 'pus', 'wus', 'ibu_hamil', 'ibu_menyusui', 'lansia', 'tiga_buta', 'berkebutuhan_khusus', 'rumah_sehat', 'rumah_kurang_sehat', 'punya_tempat_sampah', 'punya_spal', 'jamban', 'stiker_p4k', 'air_pdam', 'air_sumur', 'air_sungai', 'air_dll', 'makan_beras', 'makan_non_beras', 'ikut_up2k', 'ikut_pekarangan', 'ikut_kesling', 'jkn_bpjs'],
  data_bumil: ['jml_rt', 'jml_rw', 'jml_dasa_wisma', 'ibu_hamil', 'ibu_melahirkan', 'ibu_nifas', 'ibu_meninggal', 'bayi_lahir_l', 'bayi_lahir_p', 'akte_l', 'akte_p', 'akte_ada', 'akte_tidak', 'bayi_meninggal_l', 'bayi_meninggal_p', 'balita_meninggal_l', 'balita_meninggal_p', 'keterangan'],
};
// Backward-compat alias: data_kegiatan_warga ≡ data_rekap_dawis kolom set
VALID_COLUMNS.data_kegiatan_warga = VALID_COLUMNS.data_rekap_dawis;

export const TABLES_WITH_MONTH = new Set(['data_umum', 'data_rekap_dawis', 'data_bumil']);

/**
 * Validasi & sanitasi proposal mutasi AI. Murni (tidak menyentuh DB).
 *
 * @param {object} params
 * @param {{ role: string, dusun_id?: number|null }} params.user — dari JWT.
 * @param {string} params.rawTable
 * @param {number|string} params.rawUnitId — dusun_id (atau alias desa_id).
 * @param {object} params.updates — { kolom: nilai }
 * @param {number|string|null} [params.rawBulan]
 * @param {string[]} params.allowedTables — ROLE_PERMISSIONS[user.role].
 * @returns {{ error: string } | {
 *   valid: true, tableName: string, dusunId: number,
 *   bulan: number|null, isMonthly: boolean, sanitizedUpdates: object
 * }}
 */
export function validateAiMutation({ user, rawTable, rawUnitId, updates, rawBulan, allowedTables }) {
  const tableName = normalizeTableName(rawTable || '');
  const isMonthly = TABLES_WITH_MONTH.has(tableName);

  if (!VALID_TABLES.includes(rawTable) && !VALID_TABLES.includes(tableName)) {
    return { error: `Tabel '${rawTable}' tidak valid.` };
  }
  if (!allowedTables.includes(tableName) && !allowedTables.includes(rawTable)) {
    return { error: `Akses ditolak: Role '${user.role}' tidak diizinkan mengubah tabel '${tableName}'.` };
  }

  const validCols = VALID_COLUMNS[tableName] || [];
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return { error: 'Payload update tidak valid.' };
  }
  if (Object.keys(updates).length === 0) {
    return { error: 'Minimal satu kolom harus diupdate.' };
  }
  const invalidCols = Object.keys(updates).filter((k) => !validCols.includes(k));
  if (invalidCols.length > 0) {
    return { error: `Kolom tidak valid: ${invalidCols.join(', ')}. Kolom yang diizinkan: ${validCols.join(', ')}` };
  }

  const validUnitId = toBoundedInteger(rawUnitId, 'dusun_id', { min: 1, max: 2147483647 });
  if (validUnitId.error) return { error: validUnitId.error };
  let dusunId = validUnitId.value;

  // Row-level enforcement untuk role kader-dusun.
  if (ROLE_SCOPE[user.role] === 'own_dusun') {
    if (user.dusun_id == null) {
      return { error: 'Akun kader-dusun belum di-assign dusun. Hubungi admin.' };
    }
    if (Number(user.dusun_id) !== Number(dusunId)) {
      return { error: `Anda hanya boleh edit data dusun Anda sendiri, bukan dusun ID ${dusunId}.` };
    }
    dusunId = Number(user.dusun_id);
  }

  // Sanitasi nilai.
  const sanitizedUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'keterangan') {
      sanitizedUpdates[key] = String(value ?? '').slice(0, 1000);
      continue;
    }
    const parsed = toBoundedInteger(value, key);
    if (parsed.error) return { error: parsed.error };
    sanitizedUpdates[key] = parsed.value;
  }

  // Resolve bulan untuk tabel per-bulan (default bulan berjalan).
  let bulan = null;
  if (isMonthly) {
    const parsedBulan = toBoundedInteger(rawBulan ?? (new Date().getMonth() + 1), 'bulan', { min: 1, max: 12 });
    if (parsedBulan.error) return { error: parsedBulan.error };
    bulan = parsedBulan.value;
  }

  return { valid: true, tableName, dusunId, bulan, isMonthly, sanitizedUpdates };
}
