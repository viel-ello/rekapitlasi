-- ==========================================================================
-- SCRIPT UPDATE v10 — `data_rekap_dawis` jadi per-bulan
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v9.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Perubahan:
--   1. Tambah kolom `bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12)`
--      ke `data_rekap_dawis`. Untuk row lama (kalau ada), bulan default = 12.
--   2. Drop unique constraint lama `(dusun_id, tahun)`.
--   3. Tambah unique constraint baru `(dusun_id, tahun, bulan)`.
--
-- ⚠️  BACKUP DULU sebelum jalankan. Free Plan tidak punya automated backup.
--    pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--      -t data_rekap_dawis --data-only > backup_rekap_dawis_pre_v10.sql
--
-- Setelah v10 dijalankan:
--   - Halaman `/dashboard/rekap-dawis/edit` akan menampilkan dropdown Bulan
--     (Januari-Desember) di toolbar.
--   - Setiap dusun bisa punya 12 baris terpisah per tahun (1 per bulan).
--   - Data lama (kalau ada) dianggap data Bulan 12 / Desember.
-- ==========================================================================

-- 1. Tambah kolom bulan -------------------------------------------------------
-- Default 12 supaya row lama (kalau ada) tetap valid setelah jadi NOT NULL.
ALTER TABLE data_rekap_dawis
  ADD COLUMN IF NOT EXISTS bulan INTEGER DEFAULT 12;

-- 2. Backfill row lama yang masih NULL (defensive) ----------------------------
UPDATE data_rekap_dawis SET bulan = 12 WHERE bulan IS NULL;

-- 3. Set NOT NULL + CHECK constraint -----------------------------------------
DO $$
BEGIN
  -- NOT NULL — skip kalau sudah NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'data_rekap_dawis'
      AND column_name = 'bulan'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE data_rekap_dawis ALTER COLUMN bulan SET NOT NULL;
  END IF;

  -- CHECK constraint — skip kalau sudah ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_rekap_dawis_bulan_check'
  ) THEN
    ALTER TABLE data_rekap_dawis
      ADD CONSTRAINT data_rekap_dawis_bulan_check CHECK (bulan BETWEEN 1 AND 12);
  END IF;
END $$;

-- 4. Drop unique constraint lama (dusun_id, tahun) ---------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_rekap_dawis_dusun_tahun_uniq'
  ) THEN
    ALTER TABLE data_rekap_dawis DROP CONSTRAINT data_rekap_dawis_dusun_tahun_uniq;
  END IF;

  -- Bonus: hapus constraint lama dari schema awal (kalau pakai naming default Postgres)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_rekap_dawis_dusun_id_tahun_key'
  ) THEN
    ALTER TABLE data_rekap_dawis DROP CONSTRAINT data_rekap_dawis_dusun_id_tahun_key;
  END IF;
END $$;

-- 5. Tambah unique constraint baru (dusun_id, tahun, bulan) ------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_rekap_dawis_dusun_tahun_bulan_uniq'
  ) THEN
    ALTER TABLE data_rekap_dawis
      ADD CONSTRAINT data_rekap_dawis_dusun_tahun_bulan_uniq UNIQUE (dusun_id, tahun, bulan);
  END IF;
END $$;

-- ==========================================================================
-- VERIFIKASI:
--
-- 1. Kolom bulan sudah ada & NOT NULL:
--      SELECT column_name, data_type, is_nullable, column_default
--      FROM information_schema.columns
--      WHERE table_name = 'data_rekap_dawis' AND column_name = 'bulan';
--
-- 2. Unique constraint baru aktif:
--      SELECT conname, pg_get_constraintdef(oid)
--      FROM pg_constraint
--      WHERE conrelid = 'data_rekap_dawis'::regclass AND contype = 'u';
--      -- Harus ada: data_rekap_dawis_dusun_tahun_bulan_uniq UNIQUE (dusun_id, tahun, bulan)
--
-- 3. Cek konsistensi data lama (semua row punya bulan):
--      SELECT COUNT(*) FROM data_rekap_dawis WHERE bulan IS NULL;
--      -- harus 0
-- ==========================================================================
