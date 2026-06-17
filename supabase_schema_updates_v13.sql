-- ==========================================================================
-- SCRIPT UPDATE v13 — Perbaiki uniqueness `report_periods` (tahunan vs bulanan)
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v12.
-- Script ini IDEMPOTENT & NON-DESTRUKTIF (tidak menghapus data).
--
-- MASALAH:
--   Constraint `UNIQUE(table_name, tahun, bulan)` TIDAK menjamin unik saat
--   `bulan IS NULL`. Di PostgreSQL, dua NULL dianggap berbeda, sehingga periode
--   tahunan (bulan = NULL) bisa terduplikasi untuk (table_name, tahun) yang sama.
--   Akibatnya `maybeSingle()` di workflow bisa error & status periode kacau.
--
-- SOLUSI:
--   Ganti dengan DUA partial unique index:
--     - unik (table_name, tahun)        WHERE bulan IS NULL      → periode tahunan
--     - unik (table_name, tahun, bulan) WHERE bulan IS NOT NULL  → periode bulanan
--
-- ⚠️  BACKUP DULU. Free Plan tanpa automated backup.
--    pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--      -t report_periods --data-only > backup_report_periods_pre_v13.sql
--
-- ⚠️  CEK DUPLIKAT DULU sebelum membuat unique index (lihat STEP 0).
--    Kalau ada duplikat, index akan GAGAL dibuat. Bersihkan manual dengan
--    panduan di STEP 0b (TIDAK otomatis — perlu review manusia).
-- ==========================================================================

-- STEP 0 — AUDIT: cek duplikat periode TAHUNAN (bulan IS NULL) ----------------
-- Jalankan ini DULU. Kalau mengembalikan baris, ada duplikat yang harus
-- dibereskan sebelum lanjut ke STEP 1.
--
--   SELECT table_name, tahun, COUNT(*) AS jml, array_agg(id ORDER BY updated_at DESC) AS ids
--   FROM report_periods
--   WHERE bulan IS NULL
--   GROUP BY table_name, tahun
--   HAVING COUNT(*) > 1;
--
-- Cek juga duplikat periode BULANAN (seharusnya sudah dijaga constraint lama,
-- tapi periksa untuk aman):
--
--   SELECT table_name, tahun, bulan, COUNT(*) AS jml, array_agg(id ORDER BY updated_at DESC) AS ids
--   FROM report_periods
--   WHERE bulan IS NOT NULL
--   GROUP BY table_name, tahun, bulan
--   HAVING COUNT(*) > 1;

-- STEP 0b — (MANUAL, OPSIONAL) Dedup jika STEP 0 menemukan duplikat ----------
-- TIDAK dijalankan otomatis. Strategi aman: pertahankan row paling baru
-- (updated_at terbesar), hapus sisanya. CONTOH (review dulu sebelum run):
--
--   WITH ranked AS (
--     SELECT id,
--            ROW_NUMBER() OVER (
--              PARTITION BY table_name, tahun, COALESCE(bulan, -1)
--              ORDER BY updated_at DESC, id DESC
--            ) AS rn
--     FROM report_periods
--   )
--   DELETE FROM report_periods
--   WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--
-- Jalankan blok di atas HANYA setelah yakin row yang dipertahankan benar.

-- STEP 1 — Drop constraint lama (table-level UNIQUE) -------------------------
DO $$
DECLARE
  cons_name TEXT;
BEGIN
  SELECT conname INTO cons_name
  FROM pg_constraint
  WHERE conrelid = 'report_periods'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(table_name, tahun, bulan)%';
  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE report_periods DROP CONSTRAINT %I', cons_name);
  END IF;
END $$;

-- STEP 2 — Buat partial unique indexes ---------------------------------------
-- Periode tahunan: satu row per (table_name, tahun) saat bulan NULL.
CREATE UNIQUE INDEX IF NOT EXISTS report_periods_yearly_uniq
  ON report_periods (table_name, tahun)
  WHERE bulan IS NULL;

-- Periode bulanan: satu row per (table_name, tahun, bulan) saat bulan ada.
CREATE UNIQUE INDEX IF NOT EXISTS report_periods_monthly_uniq
  ON report_periods (table_name, tahun, bulan)
  WHERE bulan IS NOT NULL;

-- ==========================================================================
-- VERIFIKASI:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'report_periods' AND indexname LIKE '%uniq';
--   -- Harus muncul report_periods_yearly_uniq & report_periods_monthly_uniq.
--
-- CATATAN APLIKASI:
--   `app/api/periods/route.js` sudah TIDAK lagi pakai upsert onConflict.
--   Ia fetch row existing (pakai .is('bulan', null) / .eq('bulan', n)) lalu
--   update-by-id atau insert. Jadi tidak bergantung pada conflict target.
-- ==========================================================================
