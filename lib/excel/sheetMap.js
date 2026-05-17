/**
 * @file Shared constants for Excel import/export
 * Used by: /api/chat, /api/import/excel, /api/export/excel
 *
 * Migration v5:
 * - Sheet "KEGIATAN WARGA" di-rename → "REKAP DAWIS" dengan tabel `data_rekap_dawis`.
 * - Pokja II: drop kolom legacy, tambah kolom baru sesuai Annex C.
 * - Pokja I/II/III/IV/Bumil: tambah kolom `keterangan`.
 * - Bumil: tambah `akte_l`, `akte_p`.
 * - Rekap Dawis: drop `jml_dusun`, `tiga_buta_l/p`, `ikut_industri`. Tambah `tiga_buta`, `berkebutuhan_khusus`.
 * - Unit data: dusun (sebelumnya desa).
 *
 * Backward compat: `'KEGIATAN WARGA'` alias dipertahankan supaya import file lama tetap jalan.
 */

const REKAP_DAWIS_KEYS = [
  'jml_rw', 'jml_rt', 'jml_dawis', 'jml_krt', 'jml_kk',
  'jml_anggota_l', 'jml_anggota_p', 'balita_l', 'balita_p', 'pus', 'wus',
  'ibu_hamil', 'ibu_menyusui', 'lansia', 'tiga_buta', 'berkebutuhan_khusus',
  'rumah_sehat', 'rumah_kurang_sehat', 'punya_tempat_sampah', 'punya_spal',
  'jamban', 'stiker_p4k', 'air_pdam', 'air_sumur', 'air_sungai', 'air_dll',
  'makan_beras', 'makan_non_beras', 'ikut_up2k', 'ikut_pekarangan',
  'ikut_kesling', 'jkn_bpjs',
];

const REKAP_DAWIS_SHEET = {
  table: 'data_rekap_dawis',
  keys: REKAP_DAWIS_KEYS,
};

// Map Excel sheet names → database table + column keys
export const SHEET_MAP = {
  'DATA UMUM': {
    table: 'data_umum',
    keys: [
      'jml_dusun', 'jml_pkk_rw', 'jml_pkk_rt', 'jml_dasa_wisma', 'jml_krt', 'jml_kk',
      'jml_jiwa_l', 'jml_jiwa_p', 'jml_kader_tp_pkk_l', 'jml_kader_tp_pkk_p',
      'jml_kader_umum_l', 'jml_kader_umum_p', 'jml_kader_khusus_l', 'jml_kader_khusus_p',
      'jml_tenaga_honorer_l', 'jml_tenaga_honorer_p',
      'jml_tenaga_bantuan_l', 'jml_tenaga_bantuan_p',
      'keterangan',
    ],
  },
  'POKJA I': {
    table: 'data_pokja1',
    keys: [
      'kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh',
      'pkbn_jml_klp_simulasi', 'pkbn_jml_anggota',
      'pkdrt_jml_klp_simulasi', 'pkdrt_jml_anggota',
      'pola_asuh_jml_klp', 'pola_asuh_jml_anggota',
      'lansia_jml_klp', 'lansia_jml_anggota',
      'gr_kerja_bakti', 'gr_rukun_kematian', 'gr_keagamaan', 'gr_jimpitan', 'gr_arisan',
      'keterangan',
    ],
  },
  'POKJA II': {
    table: 'data_pokja2',
    keys: [
      'jml_warga_3_buta',
      'paket_a_klp', 'paket_a_wrg', 'paket_b_klp', 'paket_b_wrg',
      'paket_c_klp', 'paket_c_wrg', 'kf_klp', 'kf_wrg',
      'paud_sejenis', 'taman_bacaan',
      'bkb_klp', 'bkb_jml_ibu_peserta', 'bkb_ape_set_a', 'bkb_ape_set_b',
      'kader_tutor_kf', 'kader_tutor_paud', 'kader_bkb',
      'kader_khusus_koperasi', 'kader_khusus_keterampilan',
      'yg_dilatih_lp3pkk', 'yg_dilatih_tp3pkk', 'yg_dilatih_damaspkk',
      'up2k_pemula_klp', 'up2k_pemula_psrt',
      'up2k_madya_klp', 'up2k_madya_psrt',
      'up2k_utama_klp', 'up2k_utama_psrt',
      'up2k_mandiri_klp', 'up2k_mandiri_psrt',
      'koperasi_berbadan_hukum_kop', 'koperasi_berbadan_hukum_angg',
      'keterangan',
    ],
  },
  'POKJA III': {
    table: 'data_pokja3',
    keys: [
      'kader_pangan', 'kader_sandang', 'kader_tata_laksana_rt',
      'pangan_beras', 'pangan_non_beras',
      'pemanfaatan_peternakan', 'pemanfaatan_perikanan',
      'pemanfaatan_warung_hidup', 'pemanfaatan_lumbung_hidup', 'pemanfaatan_toga',
      'pemanfaatan_tanaman_keras',
      'industri_pangan', 'industri_sandang', 'industri_jasa',
      'rumah_sehat', 'rumah_kurang_sehat',
      'keterangan',
    ],
  },
  'POKJA IV': {
    table: 'data_pokja4',
    keys: [
      'kader_posyandu', 'kader_gizi', 'kader_kesling',
      'kader_penyuluh_narkoba', 'kader_phbs', 'kader_kb',
      'posyandu_jumlah', 'posyandu_terintegrasi',
      'lansia_jml_klp', 'lansia_jml_anggota', 'lansia_jml_kartu_berobat',
      'rumah_jamban', 'rumah_spal', 'rumah_tempat_sampah', 'rumah_mck',
      'air_pdam', 'air_sumur', 'air_lain',
      'jml_pus', 'jml_wus', 'akseptor_kb_l', 'akseptor_kb_p', 'kk_tabungan',
      'keterangan',
    ],
  },
  'DATA BUMIL': {
    table: 'data_bumil',
    keys: [
      'ibu_hamil', 'ibu_melahirkan', 'ibu_nifas', 'ibu_meninggal',
      'bayi_lahir_l', 'bayi_lahir_p', 'akte_l', 'akte_p',
      'bayi_meninggal_l', 'bayi_meninggal_p',
      'balita_meninggal_l', 'balita_meninggal_p',
      'keterangan',
    ],
  },
  'REKAP DAWIS': REKAP_DAWIS_SHEET,
  // Backward-compat: file Excel lama yang dibuat dengan sheet name "KEGIATAN WARGA"
  // tetap bisa di-import. Server akan resolve ke tabel data_rekap_dawis.
  'KEGIATAN WARGA': REKAP_DAWIS_SHEET,
};

/**
 * Role → allowed database tables mapping (table-level access).
 *
 * Aliases: `data_kegiatan_warga` ≡ `data_rekap_dawis`. Role yang bisa write ke
 * salah satu otomatis bisa write ke yang lain (transition window).
 *
 * Role kader-dusun (`dusun_*`) ada di lib/auth.js dengan scope row-level.
 */
export const ROLE_TABLE_MAP = {
  admin: ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4', 'data_kegiatan_warga', 'data_rekap_dawis', 'data_bumil'],
  pokja1: ['data_pokja1'],
  pokja2: ['data_pokja2'],
  pokja3: ['data_pokja3'],
  pokja4: ['data_pokja4'],
  sekretaris: ['data_umum', 'data_kegiatan_warga', 'data_rekap_dawis', 'data_bumil'],
  user: [],
};
