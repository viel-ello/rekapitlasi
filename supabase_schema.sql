-- ==========================================================================
-- Skema Database PostgreSQL untuk Supabase — TP PKK Desa Belikurip
-- ==========================================================================
-- Untuk env BARU: jalankan file ini, lalu v2, v3, v4 (skip v5 karena sudah konsisten).
-- Untuk env LAMA (sudah pakai struktur 13 desa): jalankan v5 untuk migrasi.
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
    'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'sekretaris', 'user',
    'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
    'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan'
  )),
  dusun_id INTEGER REFERENCES dusun(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Data Umum PKK (Lampiran 4-20b)
CREATE TABLE IF NOT EXISTS data_umum (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  jml_dusun INTEGER DEFAULT 0,
  jml_pkk_rw INTEGER DEFAULT 0,
  jml_pkk_rt INTEGER DEFAULT 0,
  jml_dasa_wisma INTEGER DEFAULT 0,
  jml_krt INTEGER DEFAULT 0,
  jml_kk INTEGER DEFAULT 0,
  jml_jiwa_l INTEGER DEFAULT 0,
  jml_jiwa_p INTEGER DEFAULT 0,
  jml_kader_tp_pkk_l INTEGER DEFAULT 0,
  jml_kader_tp_pkk_p INTEGER DEFAULT 0,
  jml_kader_umum_l INTEGER DEFAULT 0,
  jml_kader_umum_p INTEGER DEFAULT 0,
  jml_kader_khusus_l INTEGER DEFAULT 0,
  jml_kader_khusus_p INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja I (Lampiran 4-21)
CREATE TABLE IF NOT EXISTS data_pokja1 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  kader_pkbn INTEGER DEFAULT 0,
  kader_pkdrt INTEGER DEFAULT 0,
  kader_pola_asuh INTEGER DEFAULT 0,
  pkbn_jml_klp_simulasi INTEGER DEFAULT 0,
  pkbn_jml_anggota INTEGER DEFAULT 0,
  pkdrt_jml_klp_simulasi INTEGER DEFAULT 0,
  pkdrt_jml_anggota INTEGER DEFAULT 0,
  pola_asuh_jml_klp INTEGER DEFAULT 0,
  pola_asuh_jml_anggota INTEGER DEFAULT 0,
  lansia_jml_klp INTEGER DEFAULT 0,
  lansia_jml_anggota INTEGER DEFAULT 0,
  gr_kerja_bakti INTEGER DEFAULT 0,
  gr_rukun_kematian INTEGER DEFAULT 0,
  gr_keagamaan INTEGER DEFAULT 0,
  gr_jimpitan INTEGER DEFAULT 0,
  gr_arisan INTEGER DEFAULT 0,
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja II
CREATE TABLE IF NOT EXISTS data_pokja2 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  jml_warga_3_buta INTEGER DEFAULT 0,
  paket_a_klp INTEGER DEFAULT 0,
  paket_a_wrg INTEGER DEFAULT 0,
  paket_b_klp INTEGER DEFAULT 0,
  paket_b_wrg INTEGER DEFAULT 0,
  paket_c_klp INTEGER DEFAULT 0,
  paket_c_wrg INTEGER DEFAULT 0,
  kf_klp INTEGER DEFAULT 0,
  kf_wrg INTEGER DEFAULT 0,
  paud_sejenis INTEGER DEFAULT 0,
  taman_bacaan INTEGER DEFAULT 0,
  klp_pembaca INTEGER DEFAULT 0,
  bkb_klp INTEGER DEFAULT 0,
  bkb_jml_ibu_peserta INTEGER DEFAULT 0,
  bkb_ape_set_a INTEGER DEFAULT 0,
  bkb_ape_set_b INTEGER DEFAULT 0,
  kader_tutor_kf INTEGER DEFAULT 0,
  kader_tutor_paud INTEGER DEFAULT 0,
  kader_bkb INTEGER DEFAULT 0,
  kader_khusus_koperasi INTEGER DEFAULT 0,
  kader_khusus_keterampilan INTEGER DEFAULT 0,
  yg_dilatih_lp3pkk INTEGER DEFAULT 0,
  yg_dilatih_tp3pkk INTEGER DEFAULT 0,
  yg_dilatih_damaspkk INTEGER DEFAULT 0,
  up2k_pemula_klp INTEGER DEFAULT 0,
  up2k_pemula_psrt INTEGER DEFAULT 0,
  up2k_madya_klp INTEGER DEFAULT 0,
  up2k_madya_psrt INTEGER DEFAULT 0,
  up2k_utama_klp INTEGER DEFAULT 0,
  up2k_utama_psrt INTEGER DEFAULT 0,
  up2k_mandiri_klp INTEGER DEFAULT 0,
  up2k_mandiri_psrt INTEGER DEFAULT 0,
  koperasi_berbadan_hukum_kop INTEGER DEFAULT 0,
  koperasi_berbadan_hukum_angg INTEGER DEFAULT 0,
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja III (Lampiran 4-23)
CREATE TABLE IF NOT EXISTS data_pokja3 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  kader_pangan INTEGER DEFAULT 0,
  kader_sandang INTEGER DEFAULT 0,
  kader_tata_laksana_rt INTEGER DEFAULT 0,
  pangan_beras INTEGER DEFAULT 0,
  pangan_non_beras INTEGER DEFAULT 0,
  pemanfaatan_peternakan INTEGER DEFAULT 0,
  pemanfaatan_perikanan INTEGER DEFAULT 0,
  pemanfaatan_warung_hidup INTEGER DEFAULT 0,
  pemanfaatan_lumbung_hidup INTEGER DEFAULT 0,
  pemanfaatan_toga INTEGER DEFAULT 0,
  pemanfaatan_tanaman_keras INTEGER DEFAULT 0,
  industri_pangan INTEGER DEFAULT 0,
  industri_sandang INTEGER DEFAULT 0,
  industri_jasa INTEGER DEFAULT 0,
  rumah_sehat INTEGER DEFAULT 0,
  rumah_kurang_sehat INTEGER DEFAULT 0,
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Pokja IV (Lampiran 4-24)
CREATE TABLE IF NOT EXISTS data_pokja4 (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  kader_posyandu INTEGER DEFAULT 0,
  kader_gizi INTEGER DEFAULT 0,
  kader_kesling INTEGER DEFAULT 0,
  kader_penyuluh_narkoba INTEGER DEFAULT 0,
  kader_phbs INTEGER DEFAULT 0,
  kader_kb INTEGER DEFAULT 0,
  posyandu_jumlah INTEGER DEFAULT 0,
  posyandu_terintegrasi INTEGER DEFAULT 0,
  lansia_jml_klp INTEGER DEFAULT 0,
  lansia_jml_anggota INTEGER DEFAULT 0,
  lansia_jml_kartu_berobat INTEGER DEFAULT 0,
  rumah_jamban INTEGER DEFAULT 0,
  rumah_spal INTEGER DEFAULT 0,
  rumah_tempat_sampah INTEGER DEFAULT 0,
  rumah_mck INTEGER DEFAULT 0,
  air_pdam INTEGER DEFAULT 0,
  air_sumur INTEGER DEFAULT 0,
  air_lain INTEGER DEFAULT 0,
  jml_pus INTEGER DEFAULT 0,
  jml_wus INTEGER DEFAULT 0,
  akseptor_kb_l INTEGER DEFAULT 0,
  akseptor_kb_p INTEGER DEFAULT 0,
  kk_tabungan INTEGER DEFAULT 0,
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Rekapitulasi Dawis (sebelumnya: data_kegiatan_warga, Lampiran 4-17b)
CREATE TABLE IF NOT EXISTS data_rekap_dawis (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  jml_rw INTEGER DEFAULT 0,
  jml_rt INTEGER DEFAULT 0,
  jml_dawis INTEGER DEFAULT 0,
  jml_krt INTEGER DEFAULT 0,
  jml_kk INTEGER DEFAULT 0,
  jml_anggota_l INTEGER DEFAULT 0,
  jml_anggota_p INTEGER DEFAULT 0,
  balita_l INTEGER DEFAULT 0,
  balita_p INTEGER DEFAULT 0,
  pus INTEGER DEFAULT 0,
  wus INTEGER DEFAULT 0,
  ibu_hamil INTEGER DEFAULT 0,
  ibu_menyusui INTEGER DEFAULT 0,
  lansia INTEGER DEFAULT 0,
  tiga_buta INTEGER DEFAULT 0,
  berkebutuhan_khusus INTEGER DEFAULT 0,
  rumah_sehat INTEGER DEFAULT 0,
  rumah_kurang_sehat INTEGER DEFAULT 0,
  punya_tempat_sampah INTEGER DEFAULT 0,
  punya_spal INTEGER DEFAULT 0,
  jamban INTEGER DEFAULT 0,
  stiker_p4k INTEGER DEFAULT 0,
  air_pdam INTEGER DEFAULT 0,
  air_sumur INTEGER DEFAULT 0,
  air_sungai INTEGER DEFAULT 0,
  air_dll INTEGER DEFAULT 0,
  makan_beras INTEGER DEFAULT 0,
  makan_non_beras INTEGER DEFAULT 0,
  ikut_up2k INTEGER DEFAULT 0,
  ikut_pekarangan INTEGER DEFAULT 0,
  ikut_kesling INTEGER DEFAULT 0,
  jkn_bpjs INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun)
);

-- Tabel Data Bumil (Lampiran 4-19b)
CREATE TABLE IF NOT EXISTS data_bumil (
  id SERIAL PRIMARY KEY,
  dusun_id INTEGER NOT NULL REFERENCES dusun(id),
  tahun INTEGER NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  jml_dusun INTEGER DEFAULT 0,
  jml_rw INTEGER DEFAULT 0,
  jml_rt INTEGER DEFAULT 0,
  jml_dasa_wisma INTEGER DEFAULT 0,
  ibu_hamil INTEGER DEFAULT 0,
  ibu_melahirkan INTEGER DEFAULT 0,
  ibu_nifas INTEGER DEFAULT 0,
  ibu_meninggal INTEGER DEFAULT 0,
  bayi_lahir_l INTEGER DEFAULT 0,
  bayi_lahir_p INTEGER DEFAULT 0,
  akte_ada INTEGER DEFAULT 0,
  akte_tidak INTEGER DEFAULT 0,
  akte_l INTEGER DEFAULT 0,
  akte_p INTEGER DEFAULT 0,
  bayi_meninggal_l INTEGER DEFAULT 0,
  bayi_meninggal_p INTEGER DEFAULT 0,
  balita_meninggal_l INTEGER DEFAULT 0,
  balita_meninggal_p INTEGER DEFAULT 0,
  keterangan TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (dusun_id, tahun, bulan)
);

-- Tabel Audit Logs
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
