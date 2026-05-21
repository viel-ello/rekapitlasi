-- ==========================================================================
-- SCRIPT UPDATE v11 - Canonical dusun unique indexes + legacy table view
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v10.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Tujuan:
--   1. Pastikan semua upsert aplikasi yang memakai `on_conflict=dusun_id,tahun`
--      atau `on_conflict=dusun_id,tahun,bulan` punya unique index canonical.
--      Ini memperbaiki error PostgREST:
--        400 /rest/v1/data_bumil?on_conflict=dusun_id,tahun,bulan
--      pada database lama yang masih hanya punya constraint unik berbasis
--      `desa_id`.
--   2. Buat compatibility view `data_kegiatan_warga` -> `data_rekap_dawis`
--      supaya caller lama yang masih SELECT tabel legacy tidak kena 404.
--
-- NON-DESTRUKTIF:
--   - Tidak ada DROP/TRUNCATE/DELETE.
--   - Kalau ada duplikat `(dusun_id,tahun[,bulan])`, CREATE UNIQUE INDEX akan
--     gagal. Bersihkan duplikat manual dulu setelah backup.
--
-- BACKUP DULU sebelum jalankan di production. Supabase Free Plan tidak punya
-- automated backup. Minimal export tabel data_* dari Supabase Dashboard atau
-- panel admin aplikasi.
-- ==========================================================================

CREATE OR REPLACE FUNCTION pg_temp.ensure_unique_index(
  p_table_name TEXT,
  p_columns TEXT[],
  p_index_name TEXT
) RETURNS VOID AS $$
DECLARE
  has_matching_index BOOLEAN;
  column_sql TEXT;
BEGIN
  IF to_regclass(format('public.%I', p_table_name)) IS NULL THEN
    RAISE NOTICE 'Skip %, tabel tidak ada.', p_table_name;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_index idx
    JOIN pg_class tbl ON tbl.oid = idx.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = p_table_name
      AND idx.indisunique = TRUE
      AND idx.indpred IS NULL
      AND idx.indexprs IS NULL
      AND (
        SELECT array_agg(att.attname::text ORDER BY key_ord.ord)
        FROM unnest(idx.indkey) WITH ORDINALITY AS key_ord(attnum, ord)
        JOIN pg_attribute att
          ON att.attrelid = tbl.oid
         AND att.attnum = key_ord.attnum
      ) = p_columns
  ) INTO has_matching_index;

  IF has_matching_index THEN
    RAISE NOTICE 'Unique index untuk %.% sudah ada.', p_table_name, array_to_string(p_columns, ',');
    RETURN;
  END IF;

  SELECT string_agg(format('%I', c), ', ')
    INTO column_sql
  FROM unnest(p_columns) AS c;

  EXECUTE format(
    'CREATE UNIQUE INDEX %I ON public.%I (%s)',
    p_index_name,
    p_table_name,
    column_sql
  );

  RAISE NOTICE 'Created unique index %.', p_index_name;
END;
$$ LANGUAGE plpgsql;

-- Tabel tahunan: conflict target `dusun_id,tahun`
SELECT pg_temp.ensure_unique_index('data_umum',   ARRAY['dusun_id', 'tahun'], 'data_umum_dusun_tahun_uidx');
SELECT pg_temp.ensure_unique_index('data_pokja1', ARRAY['dusun_id', 'tahun'], 'data_pokja1_dusun_tahun_uidx');
SELECT pg_temp.ensure_unique_index('data_pokja2', ARRAY['dusun_id', 'tahun'], 'data_pokja2_dusun_tahun_uidx');
SELECT pg_temp.ensure_unique_index('data_pokja3', ARRAY['dusun_id', 'tahun'], 'data_pokja3_dusun_tahun_uidx');
SELECT pg_temp.ensure_unique_index('data_pokja4', ARRAY['dusun_id', 'tahun'], 'data_pokja4_dusun_tahun_uidx');

-- Tabel bulanan: conflict target `dusun_id,tahun,bulan`
SELECT pg_temp.ensure_unique_index('data_bumil', ARRAY['dusun_id', 'tahun', 'bulan'], 'data_bumil_dusun_tahun_bulan_uidx');
SELECT pg_temp.ensure_unique_index('data_rekap_dawis', ARRAY['dusun_id', 'tahun', 'bulan'], 'data_rekap_dawis_dusun_tahun_bulan_uidx');

-- Compatibility view untuk caller lama yang masih membaca tabel legacy.
DO $$
BEGIN
  IF to_regclass('public.data_rekap_dawis') IS NULL THEN
    RAISE NOTICE 'Skip compatibility view: data_rekap_dawis belum ada.';
    RETURN;
  END IF;

  IF to_regclass('public.data_kegiatan_warga') IS NULL THEN
    EXECUTE 'CREATE VIEW public.data_kegiatan_warga AS SELECT * FROM public.data_rekap_dawis';
    RAISE NOTICE 'Created compatibility view public.data_kegiatan_warga.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class cls
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = 'public'
      AND cls.relname = 'data_kegiatan_warga'
      AND cls.relkind = 'v'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.data_kegiatan_warga AS SELECT * FROM public.data_rekap_dawis';
    RAISE NOTICE 'Refreshed compatibility view public.data_kegiatan_warga.';
  ELSE
    RAISE NOTICE 'Skip compatibility view: public.data_kegiatan_warga sudah ada dan bukan view.';
  END IF;
END $$;

-- Minta PostgREST/Supabase refresh schema cache setelah index/view baru.
NOTIFY pgrst, 'reload schema';

-- ==========================================================================
-- VERIFIKASI:
--
-- 1. Conflict target bumil sudah tersedia:
--      SELECT indexname, indexdef
--      FROM pg_indexes
--      WHERE tablename = 'data_bumil'
--        AND indexdef ILIKE '%dusun_id%'
--        AND indexdef ILIKE '%tahun%'
--        AND indexdef ILIKE '%bulan%';
--
-- 2. Legacy select tidak 404:
--      SELECT COUNT(*) FROM data_kegiatan_warga;
-- ==========================================================================
