-- ==========================================================================
-- SCRIPT UPDATE v5 — Migrasi Level Kecamatan (13 desa) → Level Desa Belikurip (9 dusun)
-- ==========================================================================
-- PREREQUISITE: jalankan v1 (supabase_schema.sql), v2, v3, v4 terlebih dahulu.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Yang dilakukan:
--   1. Verifikasi prerequisite (table report_periods harus sudah ada dari v4).
--   2. Buat tabel `dusun` + seed 9 dusun Belikurip.
--   3. Tambah kolom `dusun_id` ke semua tabel data.
--   4. Rename `data_kegiatan_warga` → `data_rekap_dawis`.
--   5. Tambah kolom `dusun_nama` di `audit_logs`.
--   6. Tambah kolom `dusun_id` di `users` + extend CHECK constraint role.
--   7. Tambah kolom `keterangan` ke pokja1-4 + bumil; `akte_l`/`akte_p` ke bumil.
--   8. Tambah kolom Pokja II baru sesuai layout resmi.
--   9. DROP PERMANEN kolom legacy Pokja II yang tidak dipakai.
--
-- BACKUP DULU SEBELUM JALANKAN: Supabase Dashboard → Database → Backups.
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
  'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'sekretaris', 'user',
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

-- 9. DROP PERMANEN kolom legacy Pokja II ----------------------------------------
-- ⚠️ HARD DELETE — pastikan backup sudah dibuat sebelum jalankan.
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS rumah_dilan;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS kampung_mandiri;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS usaha_mikro;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS toko_pkk;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS koperasi_belum_bh_kop;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS koperasi_belum_bh_angg;

-- 9b. Rekap Dawis: drop kolom yang tidak ada di laporan resmi --------------------
-- ⚠️ HARD DELETE — pastikan backup sudah dibuat sebelum jalankan.
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS jml_dusun;
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS tiga_buta_l;
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS tiga_buta_p;
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS ikut_industri;

-- Tambah kolom baru sesuai layout resmi (col 17 & 18 di Annex F)
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS tiga_buta           INTEGER DEFAULT 0;
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS berkebutuhan_khusus INTEGER DEFAULT 0;

-- ==========================================================================
-- 10. (OPSIONAL) Migrasi data lama 13 desa
-- ==========================================================================
-- Default v5 TIDAK menyentuh data lama. Pilih SALAH SATU opsi di bawah, jalankan manual.
--
-- ─── OPSI A — ARCHIVE (recommended) ─────────────────────────────────────────
-- Rename tabel data lama ke *_archive_kecamatan_2026 supaya tidak diakses aplikasi
-- tapi tetap bisa di-read manual via SQL Editor:
--
--   ALTER TABLE desa RENAME TO desa_archive_kecamatan;
--   -- Catatan: tabel data_* sudah punya FK ke desa(id), constraint akan break.
--   -- Solusi: drop FK constraint dulu, lalu archive desa terpisah dari data_*.
--
-- Atau archive tabel data_* yang masih punya baris desa_id != NULL:
--
--   CREATE TABLE data_umum_archive_kecamatan AS SELECT * FROM data_umum WHERE desa_id IS NOT NULL;
--   DELETE FROM data_umum WHERE desa_id IS NOT NULL;
--   -- ulangi untuk data_pokja1-4, data_rekap_dawis, data_bumil
--
-- ─── OPSI B — DROP PERMANEN ────────────────────────────────────────────────
-- 1. Backup dulu di terminal lokal:
--      pg_dump postgres://USER:PASS@db.HOST.supabase.co:5432/postgres \
--        -t data_umum -t data_pokja1 -t data_pokja2 -t data_pokja3 -t data_pokja4 \
--        -t data_kegiatan_warga -t data_bumil -t desa \
--        --data-only > backup_kecamatan_2026.sql
--
-- 2. Drop FK & data:
--      DELETE FROM data_umum WHERE desa_id IS NOT NULL;
--      -- ulangi untuk semua tabel data_*
--      ALTER TABLE data_umum DROP COLUMN desa_id;
--      -- ulangi untuk semua tabel data_*
--      DROP TABLE desa CASCADE;
--
-- ─── OPSI C — RE-SEED CEPAT (untuk staging/testing) ────────────────────────
--   TRUNCATE TABLE data_umum, data_pokja1, data_pokja2, data_pokja3, data_pokja4,
--                  data_rekap_dawis, data_bumil RESTART IDENTITY CASCADE;
--   -- dusun + 9 row sudah ter-seed di langkah 2 di atas.
--
-- ==========================================================================
-- v5 SELESAI. Verifikasi:
--   SELECT COUNT(*) FROM dusun WHERE is_active = 1;     -- harus 9
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'data_pokja2' ORDER BY column_name;  -- cek kolom baru
--   \d audit_logs                                       -- harus ada kolom dusun_nama
-- ==========================================================================
