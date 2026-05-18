-- ==========================================================================
-- Skema Database PostgreSQL untuk Supabase — TP PKK Desa Belikurip
-- ==========================================================================
-- Untuk env BARU: jalankan file ini, lalu v2, v3, v4 (skip v5 karena sudah konsisten).
-- Untuk env LAMA (sudah pakai struktur 13 desa): jalankan v5 untuk migrasi.
--
-- Catatan tipe kolom data (penting):
--   Sejak v6, semua kolom data numerik di tabel data_* memakai tipe TEXT
--   dengan DEFAULT ''. Tujuannya supaya user bisa mengisi kolom dengan
--   angka maupun keterangan teks pendek (mis. "—", "tidak ada", "5 KK").
--   Aggregasi dashboard memakai helper `toNumericValue()` di lib/chartStats.js
--   yang mengembalikan 0 untuk string non-numerik.
--
--   Fresh install dari file ini sudah konsisten dengan v6, jadi tidak perlu
--   menjalankan v6 lagi setelah file ini.
-- ==========================================================================

-- Tabel Dusun (9 dusun Belikurip)
CREATE TABLE IF NOT EXISTS dusun (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  nomor_urut INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN (
    'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'user',
    'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
    'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan'
  )),
  dusun_id INTEGER REFERENCES dusun(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Data Umum PKK (Lampiran 4-20b)
-- Catatan: kolom data numerik memakai TEXT (bisa diisi angka atau teks pendek).
CREATE TABLE IF NOT EXISTS data_umum (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  jml_dusun TEXT DEFAULT '',
  jml_pkk_rw TEXT DEFAULT '',
  jml_pkk_rt TEXT DEFAULT '',
  jml_dasa_wisma TEXT DEFAULT '',
  jml_krt TEXT DEFAULT '',
  jml_kk TEXT DEFAULT '',
  jml_jiwa_l TEXT DEFAULT '',
  jml_jiwa_p TEXT DEFAULT '',
  jml_kader_tp_pkk_l TEXT DEFAULT '',
  jml_kader_tp_pkk_p TEXT DEFAULT '',
  jml_kader_umum_l TEXT DEFAULT '',
  jml_kader_umum_p TEXT DEFAULT '',
  jml_kader_khusus_l TEXT DEFAULT '',
  jml_kader_khusus_p TEXT DEFAULT '',
  jml_tenaga_honorer_l TEXT DEFAULT '',
  jml_tenaga_honorer_p TEXT DEFAULT '',
  jml_tenaga_bantuan_l TEXT DEFAULT '',
  jml_tenaga_bantuan_p TEXT DEFAULT '',
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja I (Lampiran 4-21)
CREATE TABLE IF NOT EXISTS data_pokja1 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  kader_pkbn TEXT DEFAULT '',
  kader_pkdrt TEXT DEFAULT '',
  kader_pola_asuh TEXT DEFAULT '',
  pkbn_jml_klp_simulasi TEXT DEFAULT '',
  pkbn_jml_anggota TEXT DEFAULT '',
  pkdrt_jml_klp_simulasi TEXT DEFAULT '',
  pkdrt_jml_anggota TEXT DEFAULT '',
  pola_asuh_jml_klp TEXT DEFAULT '',
  pola_asuh_jml_anggota TEXT DEFAULT '',
  lansia_jml_klp TEXT DEFAULT '',
  lansia_jml_anggota TEXT DEFAULT '',
  gr_kerja_bakti TEXT DEFAULT '',
  gr_rukun_kematian TEXT DEFAULT '',
  gr_keagamaan TEXT DEFAULT '',
  gr_jimpitan TEXT DEFAULT '',
  gr_arisan TEXT DEFAULT '',
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja II
CREATE TABLE IF NOT EXISTS data_pokja2 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  jml_warga_3_buta TEXT DEFAULT '',
  paket_a_klp TEXT DEFAULT '',
  paket_a_wrg TEXT DEFAULT '',
  paket_b_klp TEXT DEFAULT '',
  paket_b_wrg TEXT DEFAULT '',
  paket_c_klp TEXT DEFAULT '',
  paket_c_wrg TEXT DEFAULT '',
  kf_klp TEXT DEFAULT '',
  kf_wrg TEXT DEFAULT '',
  paud_sejenis TEXT DEFAULT '',
  taman_bacaan TEXT DEFAULT '',
  klp_pembaca TEXT DEFAULT '',
  bkb_klp TEXT DEFAULT '',
  bkb_jml_ibu_peserta TEXT DEFAULT '',
  bkb_ape_set_a TEXT DEFAULT '',
  bkb_ape_set_b TEXT DEFAULT '',
  kader_tutor_kf TEXT DEFAULT '',
  kader_tutor_paud TEXT DEFAULT '',
  kader_bkb TEXT DEFAULT '',
  kader_khusus_koperasi TEXT DEFAULT '',
  kader_khusus_keterampilan TEXT DEFAULT '',
  yg_dilatih_lp3pkk TEXT DEFAULT '',
  yg_dilatih_tp3pkk TEXT DEFAULT '',
  yg_dilatih_damaspkk TEXT DEFAULT '',
  up2k_pemula_klp TEXT DEFAULT '',
  up2k_pemula_psrt TEXT DEFAULT '',
  up2k_madya_klp TEXT DEFAULT '',
  up2k_madya_psrt TEXT DEFAULT '',
  up2k_utama_klp TEXT DEFAULT '',
  up2k_utama_psrt TEXT DEFAULT '',
  up2k_mandiri_klp TEXT DEFAULT '',
  up2k_mandiri_psrt TEXT DEFAULT '',
  koperasi_berbadan_hukum_kop TEXT DEFAULT '',
  koperasi_berbadan_hukum_angg TEXT DEFAULT '',
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja III (Lampiran 4-23)
CREATE TABLE IF NOT EXISTS data_pokja3 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  kader_pangan TEXT DEFAULT '',
  kader_sandang TEXT DEFAULT '',
  kader_tata_laksana_rt TEXT DEFAULT '',
  pangan_beras TEXT DEFAULT '',
  pangan_non_beras TEXT DEFAULT '',
  pemanfaatan_peternakan TEXT DEFAULT '',
  pemanfaatan_perikanan TEXT DEFAULT '',
  pemanfaatan_warung_hidup TEXT DEFAULT '',
  pemanfaatan_lumbung_hidup TEXT DEFAULT '',
  pemanfaatan_toga TEXT DEFAULT '',
  pemanfaatan_tanaman_keras TEXT DEFAULT '',
  industri_pangan TEXT DEFAULT '',
  industri_sandang TEXT DEFAULT '',
  industri_jasa TEXT DEFAULT '',
  rumah_sehat TEXT DEFAULT '',
  rumah_kurang_sehat TEXT DEFAULT '',
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja IV (Lampiran 4-24)
CREATE TABLE IF NOT EXISTS data_pokja4 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  kader_posyandu TEXT DEFAULT '',
  kader_gizi TEXT DEFAULT '',
  kader_kesling TEXT DEFAULT '',
  kader_penyuluh_narkoba TEXT DEFAULT '',
  kader_phbs TEXT DEFAULT '',
  kader_kb TEXT DEFAULT '',
  posyandu_jumlah TEXT DEFAULT '',
  posyandu_terintegrasi TEXT DEFAULT '',
  lansia_jml_klp TEXT DEFAULT '',
  lansia_jml_anggota TEXT DEFAULT '',
  lansia_jml_kartu_berobat TEXT DEFAULT '',
  rumah_jamban TEXT DEFAULT '',
  rumah_spal TEXT DEFAULT '',
  rumah_tempat_sampah TEXT DEFAULT '',
  rumah_mck TEXT DEFAULT '',
  air_pdam TEXT DEFAULT '',
  air_sumur TEXT DEFAULT '',
  air_lain TEXT DEFAULT '',
  jml_pus TEXT DEFAULT '',
  jml_wus TEXT DEFAULT '',
  akseptor_kb_l TEXT DEFAULT '',
  akseptor_kb_p TEXT DEFAULT '',
  kk_tabungan TEXT DEFAULT '',
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Rekapitulasi Dawis (sebelumnya: data_kegiatan_warga, Lampiran 4-17b)
-- Per-bulan sejak v10: setiap dusun punya 12 baris per tahun (1 per bulan).
CREATE TABLE IF NOT EXISTS data_rekap_dawis (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  jml_rw TEXT DEFAULT '',
  jml_rt TEXT DEFAULT '',
  jml_dawis TEXT DEFAULT '',
  jml_krt TEXT DEFAULT '',
  jml_kk TEXT DEFAULT '',
  jml_anggota_l TEXT DEFAULT '',
  jml_anggota_p TEXT DEFAULT '',
  balita_l TEXT DEFAULT '',
  balita_p TEXT DEFAULT '',
  pus TEXT DEFAULT '',
  wus TEXT DEFAULT '',
  ibu_hamil TEXT DEFAULT '',
  ibu_menyusui TEXT DEFAULT '',
  lansia TEXT DEFAULT '',
  tiga_buta TEXT DEFAULT '',
  berkebutuhan_khusus TEXT DEFAULT '',
  rumah_sehat TEXT DEFAULT '',
  rumah_kurang_sehat TEXT DEFAULT '',
  punya_tempat_sampah TEXT DEFAULT '',
  punya_spal TEXT DEFAULT '',
  jamban TEXT DEFAULT '',
  stiker_p4k TEXT DEFAULT '',
  air_pdam TEXT DEFAULT '',
  air_sumur TEXT DEFAULT '',
  air_sungai TEXT DEFAULT '',
  air_dll TEXT DEFAULT '',
  makan_beras TEXT DEFAULT '',
  makan_non_beras TEXT DEFAULT '',
  ikut_up2k TEXT DEFAULT '',
  ikut_pekarangan TEXT DEFAULT '',
  ikut_kesling TEXT DEFAULT '',
  jkn_bpjs TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun, bulan)
);

-- Tabel Data Bumil (Lampiran 4-19b)
CREATE TABLE IF NOT EXISTS data_bumil (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  jml_dusun TEXT DEFAULT '',
  jml_rw TEXT DEFAULT '',
  jml_rt TEXT DEFAULT '',
  jml_dasa_wisma TEXT DEFAULT '',
  ibu_hamil TEXT DEFAULT '',
  ibu_melahirkan TEXT DEFAULT '',
  ibu_nifas TEXT DEFAULT '',
  ibu_meninggal TEXT DEFAULT '',
  bayi_lahir_l TEXT DEFAULT '',
  bayi_lahir_p TEXT DEFAULT '',
  akte_ada TEXT DEFAULT '',
  akte_tidak TEXT DEFAULT '',
  akte_l TEXT DEFAULT '',
  akte_p TEXT DEFAULT '',
  bayi_meninggal_l TEXT DEFAULT '',
  bayi_meninggal_p TEXT DEFAULT '',
  balita_meninggal_l TEXT DEFAULT '',
  balita_meninggal_p TEXT DEFAULT '',
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun, bulan)
);

-- Tabel Audit Logs
-- Catatan: kolom desa_nama dipertahankan untuk history lama, tapi caller baru
-- harus pakai dusun_nama (lihat lib/audit.js).
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'update',
  table_name TEXT NOT NULL,
  desa_nama TEXT,
  dusun_nama TEXT,
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSERT DATA DUSUN DEFAULT (Belikurip)
INSERT INTO dusun (nama, nomor_urut, is_active) VALUES
  ('Soko', 1, 1),
  ('Melikan', 2, 1),
  ('Jamprit Wetan', 3, 1),
  ('Jamprit Kulon', 4, 1),
  ('Belikurip', 5, 1),
  ('Pagersari', 6, 1),
  ('Klerong', 7, 1),
  ('Tanjung', 8, 1),
  ('Banyuripan', 9, 1)
ON CONFLICT (nama) DO NOTHING;

-- INSERT ADMIN DEFAULT (password: admin123)
INSERT INTO users (username, password_hash, nama_lengkap, role) VALUES
  ('admin', '$2a$10$wT0ESt0yX1W5b4vA2v9oO.l2Jd0RkZg3c3tV.g2f1s0y.l2Jd0RkZ', 'Administrator', 'admin')
ON CONFLICT DO NOTHING;
