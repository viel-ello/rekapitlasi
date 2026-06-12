-- ==========================================================================
-- SCRIPT UPDATE v12 — `data_umum` jadi per-bulan
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v11.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Perubahan:
--   1. Tambah kolom `bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12)`
--      ke `data_umum`. Untuk row lama (kalau ada), bulan default = 12.
--   2. Drop unique constraint lama `(dusun_id, tahun)`.
--   3. Tambah unique constraint baru `(dusun_id, tahun, bulan)`.
--
-- ⚠️  BACKUP DULU sebelum jalankan. Free Plan tidak punya automated backup.
--    pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--      -t data_umum --data-only > backup_data_umum_pre_v12.sql
--
-- Setelah v12 dijalankan:
--   - Halaman `/dashboard/data-umum/edit` akan menampilkan dropdown Bulan
--     (Januari-Desember) di toolbar.
--   - Setiap dusun bisa punya 12 baris terpisah per tahun (1 per bulan).
--   - Data lama (kalau ada) dianggap data Bulan 12 / Desember.
--   - Dashboard & export memfilter `data_umum` per bulan (default Desember)
--     supaya total KK/jiwa tidak ter-multiply 12x.
-- ==========================================================================

-- 1. Tambah kolom bulan -------------------------------------------------------
-- Default 12 supaya row lama (kalau ada) tetap valid setelah jadi NOT NULL.
ALTER TABLE data_umum
  ADD COLUMN IF NOT EXISTS bulan INTEGER DEFAULT 12;

-- 2. Backfill row lama yang masih NULL (defensive) ----------------------------
UPDATE data_umum SET bulan = 12 WHERE bulan IS NULL;

-- 3. Set NOT NULL + CHECK constraint -----------------------------------------
DO $$
BEGIN
  -- NOT NULL — skip kalau sudah NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'data_umum'
      AND column_name = 'bulan'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE data_umum ALTER COLUMN bulan SET NOT NULL;
  END IF;

  -- CHECK constraint — skip kalau sudah ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_umum_bulan_check'
  ) THEN
    ALTER TABLE data_umum
      ADD CONSTRAINT data_umum_bulan_check CHECK (bulan BETWEEN 1 AND 12);
  END IF;
END $$;

-- 4. Drop unique constraint lama (dusun_id, tahun) ---------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_umum_dusun_tahun_uniq'
  ) THEN
    ALTER TABLE data_umum DROP CONSTRAINT data_umum_dusun_tahun_uniq;
  END IF;

  -- Bonus: hapus constraint lama dari schema awal (naming default Postgres)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_umum_dusun_id_tahun_key'
  ) THEN
    ALTER TABLE data_umum DROP CONSTRAINT data_umum_dusun_id_tahun_key;
  END IF;
END $$;

-- 5. Tambah unique constraint baru (dusun_id, tahun, bulan) ------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_umum_dusun_tahun_bulan_uniq'
  ) THEN
    ALTER TABLE data_umum
      ADD CONSTRAINT data_umum_dusun_tahun_bulan_uniq UNIQUE (dusun_id, tahun, bulan);
  END IF;
END $$;

-- 6. Refresh PostgREST schema cache ------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ==========================================================================
-- VERIFIKASI:
--
-- 1. Kolom bulan sudah ada & NOT NULL:
--      SELECT column_name, data_type, is_nullable, column_default
--      FROM information_schema.columns
--      WHERE table_name = 'data_umum' AND column_name = 'bulan';
--
-- 2. Unique constraint baru aktif:
--      SELECT conname, pg_get_constraintdef(oid)
--      FROM pg_constraint
--      WHERE conrelid = 'data_umum'::regclass AND contype = 'u';
--      -- Harus ada: data_umum_dusun_tahun_bulan_uniq UNIQUE (dusun_id, tahun, bulan)
--
-- 3. Cek konsistensi data lama (semua row punya bulan):
--      SELECT COUNT(*) FROM data_umum WHERE bulan IS NULL;
--      -- harus 0
-- ==========================================================================
