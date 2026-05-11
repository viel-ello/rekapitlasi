/**
 * @file Shared constants for Excel import/export
 * Used by: /api/chat, /api/import/excel, /api/export/excel
 */

// Map Excel sheet names → database table + column keys
export const SHEET_MAP = {
  'DATA UMUM': {
    table: 'data_umum',
    keys: [
      'jml_dusun','jml_pkk_rw','jml_pkk_rt','jml_dasa_wisma','jml_krt','jml_kk',
      'jml_jiwa_l','jml_jiwa_p','jml_kader_tp_pkk_l','jml_kader_tp_pkk_p',
      'jml_kader_umum_l','jml_kader_umum_p','jml_kader_khusus_l','jml_kader_khusus_p',
    ],
  },
  'POKJA I': {
    table: 'data_pokja1',
    keys: [
      'kader_pkbn','kader_pkdrt','kader_pola_asuh',
      'pkbn_jml_klp_simulasi','pkbn_jml_anggota',
      'pkdrt_jml_klp_simulasi','pkdrt_jml_anggota',
      'pola_asuh_jml_klp','pola_asuh_jml_anggota',
      'lansia_jml_klp','lansia_jml_anggota',
      'gr_kerja_bakti','gr_rukun_kematian','gr_keagamaan','gr_jimpitan','gr_arisan',
    ],
  },
  'POKJA II': {
    table: 'data_pokja2',
    keys: [
      'paket_a_klp','paket_a_wrg','paket_b_klp','paket_b_wrg',
      'paket_c_klp','paket_c_wrg','taman_bacaan','usaha_mikro',
      'up2k_pemula_klp','up2k_pemula_psrt','toko_pkk',
      'koperasi_belum_bh_kop','koperasi_berbadan_hukum_kop','koperasi_berbadan_hukum_angg',
    ],
  },
  'POKJA III': {
    table: 'data_pokja3',
    keys: [
      'kader_pangan','kader_sandang','kader_tata_laksana_rt',
      'pangan_beras','pemanfaatan_peternakan','pemanfaatan_perikanan',
      'pemanfaatan_warung_hidup','pemanfaatan_lumbung_hidup','pemanfaatan_toga',
      'industri_pangan','industri_sandang','industri_jasa',
      'rumah_sehat','rumah_kurang_sehat',
    ],
  },
  'POKJA IV': {
    table: 'data_pokja4',
    keys: [
      'kader_posyandu','kader_gizi','kader_kesling','kader_kb',
      'posyandu_jumlah','posyandu_terintegrasi',
      'lansia_jml_klp','lansia_jml_anggota',
      'rumah_jamban','rumah_spal','air_pdam','air_sumur',
      'jml_pus','jml_wus','akseptor_kb_l','akseptor_kb_p','kk_tabungan',
    ],
  },
  'DATA BUMIL': {
    table: 'data_bumil',
    keys: [
      'ibu_hamil','ibu_melahirkan','ibu_nifas','ibu_meninggal',
      'bayi_lahir_l','bayi_lahir_p','akte_ada','akte_tidak',
      'bayi_meninggal_l','bayi_meninggal_p',
    ],
  },
  'KEGIATAN WARGA': {
    table: 'data_kegiatan_warga',
    keys: [
      'jml_dusun','jml_rw','jml_rt','jml_dawis','jml_krt','jml_kk',
      'jml_anggota_l','jml_anggota_p','balita_l','balita_p','pus','wus',
      'ibu_hamil','ibu_menyusui','lansia','rumah_sehat','rumah_kurang_sehat',
      'punya_tempat_sampah','punya_spal','stiker_p4k','air_pdam','air_sumur',
      'air_sungai','air_dll','jamban','makan_beras','makan_non_beras',
      'ikut_up2k','ikut_pekarangan','ikut_industri','ikut_kesling','jkn_bpjs',
    ],
  },
};

// Role → allowed database tables mapping
// Determines which tables each role can write to
export const ROLE_TABLE_MAP = {
  admin: ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4', 'data_kegiatan_warga', 'data_bumil'],
  pokja1: ['data_pokja1'],
  pokja2: ['data_pokja2'],
  pokja3: ['data_pokja3'],
  pokja4: ['data_pokja4'],
  sekretaris: ['data_umum', 'data_kegiatan_warga', 'data_bumil'],
  user: [],
};
