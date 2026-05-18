-- ==========================================================================
-- SCRIPT UPDATE v5 — Migrasi Level Kecamatan (13 desa) → Level Desa Belikurip (9 dusun)
-- ==========================================================================
-- PREREQUISITE: jalankan v1 (supabase_schema.sql), v2, v3, v4 terlebih dahulu.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- ⚠️  PENTING — BACKUP DULU SEBELUM JALANKAN.
--
-- Supabase Free Plan TIDAK menyediakan automated backup. Lakukan salah satu:
--   1. pg_dump dari mesin lokal (lihat blok komentar di akhir file ini).
--   2. Export CSV per tabel via Supabase SQL Editor → Export.
--   3. Export Excel per tabel dari panel admin aplikasi.
--   Backup minimal direkomendasikan untuk: dusun (atau desa lama), data_umum,
--   data_pokja1-4, data_kegiatan_warga (atau data_rekap_dawis), data_bumil,
--   audit_logs, users.
--
-- Yang dilakukan default v5 (NON-DESTRUKTIF):
--   1. Verifikasi prerequisite (table report_periods harus sudah ada dari v4).
--   2. Buat tabel `dusun` + seed 9 dusun Belikurip.
--   3. Tambah kolom `dusun_id` ke semua tabel data.
--   4. Rename `data_kegiatan_warga` → `data_rekap_dawis` (kalau ada).
--   5. Tambah kolom `dusun_nama` di `audit_logs`.
--   6. Tambah kolom `dusun_id` di `users` + extend CHECK constraint role.
--   7. Tambah kolom `keterangan` ke pokja1-4 + bumil; `akte_l`/`akte_p` ke bumil.
--   8. Tambah kolom Pokja II baru sesuai layout resmi (ADD ONLY, TIDAK drop legacy).
--   9. Tambah kolom Rekap Dawis baru (`tiga_buta`, `berkebutuhan_khusus`).
--   10. Tambah kolom Data Umum baru (Tenaga Honorer/Bantuan + Keterangan).
--
-- Yang TIDAK dilakukan default (HARUS dijalankan manual via file v5_destructive.sql):
--   - DROP COLUMN legacy Pokja II (`rumah_dilan`, `kampung_mandiri`, `usaha_mikro`,
--     `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`).
--   - DROP COLUMN legacy Rekap Dawis (`jml_dusun`, `tiga_buta_l`, `tiga_buta_p`,
--     `ikut_industri`).
--   Aplikasi sudah aman tanpa drop ini — kolom legacy diabaikan oleh UI dan API.
--   Drop hanya disarankan setelah verifikasi 1 release stable.
-- ==========================================================================

-- 1. Verifikasi prerequisite -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'report_periods'
  ) THEN
    RAISE EXCEPTION 'Migration v5 prerequisite gagal: tabel report_periods belum ada. Jalankan v1-v4 lebih dulu.';
  END IF;
END $$;

-- 2. Tabel dusun ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dusun (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  nomor_urut INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 9 dusun Belikurip (urutan harus dipertahankan)
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

-- 3. Tambah kolom dusun_id ke semua tabel data ----------------------------------
ALTER TABLE data_umum            ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja1          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja2          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja3          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja4          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_bumil           ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);

-- Tabel kegiatan_warga: tambah dusun_id sebelum di-rename (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_kegiatan_warga'
  ) THEN
    EXECUTE 'ALTER TABLE data_kegiatan_warga ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id)';
  END IF;
END $$;

-- 4. Rename data_kegiatan_warga → data_rekap_dawis ------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_kegiatan_warga'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_rekap_dawis'
  ) THEN
    EXECUTE 'ALTER TABLE data_kegiatan_warga RENAME TO data_rekap_dawis';
  END IF;
END $$;

-- Pastikan dusun_id ada di tabel rekap_dawis (kalau migration baru dijalankan)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_rekap_dawis'
  ) THEN
    EXECUTE 'ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id)';
  END IF;
END $$;

-- 5. Audit logs: tambah kolom dusun_nama ----------------------------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS dusun_nama TEXT;

-- 6. Users: tambah dusun_id + extend CHECK constraint role ----------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);

-- Drop CHECK constraint lama (kalau ada) lalu tambah versi baru
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  SELECT con.conname INTO constraint_name_var
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'users'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%role%';

  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name_var);
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'user',
  'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
  'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan'
));

-- 7. Tambah kolom keterangan ke pokja1-4 + bumil --------------------------------
ALTER TABLE data_pokja1 ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE data_pokja3 ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE data_pokja4 ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE data_bumil  ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- Tambah kolom akte_l, akte_p ke data_bumil (split akte per gender)
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS akte_l INTEGER DEFAULT 0;
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS akte_p INTEGER DEFAULT 0;

-- 7b. Tambah kolom Data Umum baru (Tenaga Honorer/Bantuan + Keterangan) ---------
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_honorer_l INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_honorer_p INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_bantuan_l INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS jml_tenaga_bantuan_p INTEGER DEFAULT 0;
ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- 8. Tambah kolom Pokja II baru -------------------------------------------------
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS jml_warga_3_buta    INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kf_klp              INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kf_wrg              INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS paud_sejenis        INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_klp             INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_jml_ibu_peserta INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_ape_set_a       INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_ape_set_b       INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kader_tutor_kf      INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kader_tutor_paud    INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kader_bkb           INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS yg_dilatih_lp3pkk   INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS yg_dilatih_tp3pkk   INTEGER DEFAULT 0;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS yg_dilatih_damaspkk INTEGER DEFAULT 0;

-- 9. Tambah kolom Rekap Dawis baru (`tiga_buta`, `berkebutuhan_khusus`) ----------
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS tiga_buta           INTEGER DEFAULT 0;
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS berkebutuhan_khusus INTEGER DEFAULT 0;

-- ==========================================================================
-- v5 SELESAI (NON-DESTRUKTIF). Verifikasi:
--   SELECT COUNT(*) FROM dusun WHERE is_active = 1;     -- harus 9
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'data_pokja2' ORDER BY column_name;  -- cek kolom baru
-- ==========================================================================
--
-- Untuk OPSIONAL drop kolom legacy & migrasi data 13 desa lama:
-- jalankan `supabase_schema_updates_v5_destructive.sql` (manual) setelah backup
-- dan setelah verifikasi aplikasi production stable.
-- ==========================================================================

-- ─── BACKUP MANUAL — Supabase Free Plan ───────────────────────────────────
-- Free Plan TIDAK menyediakan automated backup. Jalankan manual sebelum drop:
--
--   pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--     -t dusun -t users -t audit_logs \
--     -t data_umum -t data_pokja1 -t data_pokja2 -t data_pokja3 -t data_pokja4 \
--     -t data_kegiatan_warga -t data_rekap_dawis -t data_bumil \
--     --data-only > backup_pre_v5_$(date +%Y%m%d).sql
--
-- Atau export CSV per tabel via Supabase SQL Editor → klik tabel → Export.
-- Atau export Excel per tabel dari panel admin aplikasi (tab "Database").
-- ==========================================================================
