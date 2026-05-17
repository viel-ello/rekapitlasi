-- ==========================================================================
-- SCRIPT UPDATE v7 — Unique constraint (dusun_id, tahun) untuk upsert
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v6.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Alasan: v5 menambah kolom `dusun_id`, tapi unique constraint yang dipakai
-- upsert masih `(desa_id, tahun)` lama. Akibatnya saat user simpan data,
-- Postgres tolak ON CONFLICT karena constraint target tidak ada.
--
-- Fix: tambah unique constraint baru pada (dusun_id, tahun) untuk semua
-- tabel data_* (dan (dusun_id, tahun, bulan) untuk data_bumil).
-- ==========================================================================

-- 1. Constraint untuk tabel non-bumil --------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
    'data_rekap_dawis'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Skip kalau constraint sudah ada
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = format('%s_dusun_tahun_uniq', tbl)
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (dusun_id, tahun)',
        tbl, format('%s_dusun_tahun_uniq', tbl)
      );
    END IF;
  END LOOP;
END $$;

-- 2. Constraint untuk data_bumil (include bulan) ---------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'data_bumil_dusun_tahun_bulan_uniq'
  ) THEN
    ALTER TABLE data_bumil ADD CONSTRAINT data_bumil_dusun_tahun_bulan_uniq
      UNIQUE (dusun_id, tahun, bulan);
  END IF;
END $$;

-- ==========================================================================
-- v7 SELESAI. Verifikasi:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'data_pokja1'::regclass AND contype = 'u';
--   -- harus ada: data_pokja1_dusun_tahun_uniq
-- ==========================================================================
