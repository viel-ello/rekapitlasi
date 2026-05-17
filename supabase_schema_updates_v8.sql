-- ==========================================================================
-- SCRIPT UPDATE v8 — Relax legacy `desa_id` NOT NULL constraint
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v7.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Alasan: kolom `desa_id` dari v1 di-set NOT NULL. Setelah migrasi v5 ke
-- `dusun_id`, server hanya kirim `dusun_id` saat insert/upsert — Postgres
-- tolak karena `desa_id` masih NOT NULL.
--
-- Fix: drop NOT NULL constraint dari `desa_id` di semua tabel data_*.
-- Kolom tetap dipertahankan untuk backward-compat history (read-only).
-- ==========================================================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
    'data_rekap_dawis', 'data_bumil'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Cek kolom desa_id ada DAN masih NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'desa_id'
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN desa_id DROP NOT NULL', tbl);
    END IF;
  END LOOP;
END $$;

-- ==========================================================================
-- v8 SELESAI. Verifikasi:
--   SELECT table_name, column_name, is_nullable
--   FROM information_schema.columns
--   WHERE column_name = 'desa_id'
--     AND table_name LIKE 'data_%'
--   ORDER BY table_name;
--   -- semua is_nullable harus 'YES'
-- ==========================================================================
