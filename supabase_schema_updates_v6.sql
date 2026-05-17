-- ==========================================================================
-- SCRIPT UPDATE v6 — Kolom data fleksibel (angka + huruf)
-- ==========================================================================
-- PREREQUISITE: jalankan v1 (supabase_schema.sql), v2, v3, v4, v5.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- ⚠️  NON-DESTRUKTIF — Tidak ada TRUNCATE atau DROP di file ini.
--   Untuk reset data ke 0 baris (mis. staging/testing), pakai
--   `supabase_schema_updates_v6_reset.sql` (manual).
--
-- ⚠️  BACKUP DULU — Konversi kolom INTEGER → TEXT mengubah tipe data.
--   Walaupun nilai numerik bisa di-cast aman ke TEXT, lakukan backup pg_dump
--   atau export Excel/CSV per tabel sebelum jalankan (Free Plan tidak punya
--   automated backup).
--
-- Tujuan:
--   1. Pastikan semua kolom baru sudah ada (Data Umum tenaga, Pokja2 bkb,
--      Bumil keterangan, dsb) — ADD COLUMN IF NOT EXISTS.
--   2. Ubah semua kolom data numerik di data_* → TEXT supaya user bisa isi
--      angka ATAU teks (mis. "—", "tidak ada", "5 KK", "lansia 12").
--   3. Default kolom diubah dari `0` → `''` agar konsisten.
--   4. Aggregasi di dashboard tetap aman: helper `toNumericValue()` di
--      `lib/chartStats.js` mengembalikan 0 untuk string non-numerik.
--
-- Setelah v6 jalan, fresh `supabase_schema.sql` juga harus konsisten
-- (lihat update di file utama): kolom data CREATE TABLE pakai TEXT.
-- ==========================================================================

-- 0. Pastikan semua kolom baru ada (idempotent ADD COLUMN) -------------------
-- Data Umum: tenaga honorer/bantuan + keterangan
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_honorer_l INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_honorer_p INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_bantuan_l INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_bantuan_p INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- Pokja II: kolom bkb_jml_ibu_peserta + keterangan (kalau v5 belum lengkap)
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_jml_ibu_peserta INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- Pokja I/III/IV: keterangan
ALTER TABLE data_pokja1 ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE data_pokja3 ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE data_pokja4 ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- Bumil: akte L/P + keterangan
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS akte_l INTEGER DEFAULT 0;
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS akte_p INTEGER DEFAULT 0;
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- Rekap Dawis: kolom layout resmi
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS tiga_buta INTEGER DEFAULT 0;
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS berkebutuhan_khusus INTEGER DEFAULT 0;

-- 1. Konversi tipe kolom INTEGER → TEXT untuk semua tabel data ----------------
-- Semua statement IDEMPOTENT: skip kalau sudah TEXT.

DO $$
DECLARE
  rec RECORD;
  cols_data_umum TEXT[] := ARRAY[
    'jml_dusun', 'jml_pkk_rw', 'jml_pkk_rt', 'jml_dasa_wisma', 'jml_krt', 'jml_kk',
    'jml_jiwa_l', 'jml_jiwa_p', 'jml_kader_tp_pkk_l', 'jml_kader_tp_pkk_p',
    'jml_kader_umum_l', 'jml_kader_umum_p', 'jml_kader_khusus_l', 'jml_kader_khusus_p',
    'jml_tenaga_honorer_l', 'jml_tenaga_honorer_p',
    'jml_tenaga_bantuan_l', 'jml_tenaga_bantuan_p'
  ];
  cols_pokja1 TEXT[] := ARRAY[
    'kader_pkbn', 'kader_pkdrt', 'kader_pola_asuh',
    'pkbn_jml_klp_simulasi', 'pkbn_jml_anggota',
    'pkdrt_jml_klp_simulasi', 'pkdrt_jml_anggota',
    'pola_asuh_jml_klp', 'pola_asuh_jml_anggota',
    'lansia_jml_klp', 'lansia_jml_anggota',
    'gr_kerja_bakti', 'gr_rukun_kematian', 'gr_keagamaan', 'gr_jimpitan', 'gr_arisan'
  ];
  cols_pokja2 TEXT[] := ARRAY[
    'jml_warga_3_buta',
    'paket_a_klp', 'paket_a_wrg', 'paket_b_klp', 'paket_b_wrg',
    'paket_c_klp', 'paket_c_wrg', 'kf_klp', 'kf_wrg',
    'paud_sejenis', 'taman_bacaan', 'klp_pembaca',
    'bkb_klp', 'bkb_jml_ibu_peserta', 'bkb_ape_set_a', 'bkb_ape_set_b',
    'kader_tutor_kf', 'kader_tutor_paud', 'kader_bkb',
    'kader_khusus_koperasi', 'kader_khusus_keterampilan',
    'yg_dilatih_lp3pkk', 'yg_dilatih_tp3pkk', 'yg_dilatih_damaspkk',
    'up2k_pemula_klp', 'up2k_pemula_psrt',
    'up2k_madya_klp', 'up2k_madya_psrt',
    'up2k_utama_klp', 'up2k_utama_psrt',
    'up2k_mandiri_klp', 'up2k_mandiri_psrt',
    'koperasi_berbadan_hukum_kop', 'koperasi_berbadan_hukum_angg'
  ];
  cols_pokja3 TEXT[] := ARRAY[
    'kader_pangan', 'kader_sandang', 'kader_tata_laksana_rt',
    'pangan_beras', 'pangan_non_beras',
    'pemanfaatan_peternakan', 'pemanfaatan_perikanan',
    'pemanfaatan_warung_hidup', 'pemanfaatan_lumbung_hidup', 'pemanfaatan_toga',
    'pemanfaatan_tanaman_keras',
    'industri_pangan', 'industri_sandang', 'industri_jasa',
    'rumah_sehat', 'rumah_kurang_sehat'
  ];
  cols_pokja4 TEXT[] := ARRAY[
    'kader_posyandu', 'kader_gizi', 'kader_kesling',
    'kader_penyuluh_narkoba', 'kader_phbs', 'kader_kb',
    'posyandu_jumlah', 'posyandu_terintegrasi',
    'lansia_jml_klp', 'lansia_jml_anggota', 'lansia_jml_kartu_berobat',
    'rumah_jamban', 'rumah_spal', 'rumah_tempat_sampah', 'rumah_mck',
    'air_pdam', 'air_sumur', 'air_lain',
    'jml_pus', 'jml_wus', 'akseptor_kb_l', 'akseptor_kb_p', 'kk_tabungan'
  ];
  cols_bumil TEXT[] := ARRAY[
    'ibu_hamil', 'ibu_melahirkan', 'ibu_nifas', 'ibu_meninggal',
    'bayi_lahir_l', 'bayi_lahir_p',
    'akte_l', 'akte_p', 'akte_ada', 'akte_tidak',
    'bayi_meninggal_l', 'bayi_meninggal_p',
    'balita_meninggal_l', 'balita_meninggal_p'
  ];
  cols_dawis TEXT[] := ARRAY[
    'jml_rw', 'jml_rt', 'jml_dawis', 'jml_krt', 'jml_kk',
    'jml_anggota_l', 'jml_anggota_p', 'balita_l', 'balita_p',
    'pus', 'wus', 'ibu_hamil', 'ibu_menyusui', 'lansia',
    'tiga_buta', 'berkebutuhan_khusus',
    'rumah_sehat', 'rumah_kurang_sehat',
    'punya_tempat_sampah', 'punya_spal', 'jamban', 'stiker_p4k',
    'air_pdam', 'air_sumur', 'air_sungai', 'air_dll',
    'makan_beras', 'makan_non_beras',
    'ikut_up2k', 'ikut_pekarangan', 'ikut_kesling', 'jkn_bpjs'
  ];
  col_name TEXT;
BEGIN
  -- Helper inline: ALTER COLUMN <col> TYPE TEXT USING coalesce(<col>::text,'')
  -- Skip kolom yang sudah TEXT atau tidak ada.
  FOR col_name IN SELECT unnest(cols_data_umum) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_umum' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_umum ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_umum ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;

  FOR col_name IN SELECT unnest(cols_pokja1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_pokja1' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_pokja1 ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_pokja1 ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;

  FOR col_name IN SELECT unnest(cols_pokja2) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_pokja2' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_pokja2 ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_pokja2 ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;

  FOR col_name IN SELECT unnest(cols_pokja3) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_pokja3' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_pokja3 ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_pokja3 ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;

  FOR col_name IN SELECT unnest(cols_pokja4) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_pokja4' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_pokja4 ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_pokja4 ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;

  FOR col_name IN SELECT unnest(cols_bumil) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_bumil' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_bumil ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_bumil ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;

  FOR col_name IN SELECT unnest(cols_dawis) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'data_rekap_dawis' AND column_name = col_name
                 AND data_type <> 'text') THEN
      EXECUTE format('ALTER TABLE data_rekap_dawis ALTER COLUMN %I TYPE TEXT USING COALESCE(%I::text, %L)', col_name, col_name, '');
      EXECUTE format('ALTER TABLE data_rekap_dawis ALTER COLUMN %I SET DEFAULT %L', col_name, '');
    END IF;
  END LOOP;
END $$;

-- ==========================================================================
-- v6 SELESAI (NON-DESTRUKTIF). Verifikasi:
--   SELECT data_type FROM information_schema.columns
--     WHERE table_name = 'data_umum' AND column_name = 'jml_kk';
--   -- harus 'text'
-- ==========================================================================
--
-- Untuk RESET data ke 0 baris (TRUNCATE) — staging/testing only:
-- jalankan `supabase_schema_updates_v6_reset.sql` (manual).
-- ==========================================================================
