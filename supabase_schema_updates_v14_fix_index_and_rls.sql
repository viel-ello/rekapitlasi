-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SCRIPT UPDATE v14 — PERBAIKAN UNIQUE INDEX, WORKFLOW FK, & RLS POLICIES║
-- ║  Aplikasi PKK Lumbung Data — TP PKK Desa Belikurip                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ⚠️ CATATAN OPERASIONAL:
-- File migrasi ini disiapkan untuk ditinjau oleh administrator / database engineer.
-- Jalankan melalui Supabase Dashboard → SQL Editor secara terkontrol.
-- JANGAN menjalankan script ini langsung pada runtime kode aplikasi.
--
-- CAKUPAN PERBAIKAN:
-- 1. [DB-002] Menghapus index unik sisa v11 (data_umum_dusun_tahun_uidx) yang memblokir
--    penyimpanan bulanan data_umum bulan ke-2 dan seterusnya.
-- 2. [DB-003 & DB-006] Memastikan kolom workflow report_periods tersedia dan menambahkan
--    klausa ON DELETE SET NULL pada foreign key users agar penghapusan user tidak gagal.
-- 3. [SEC-001] Mengaktifkan Row Level Security (RLS) pada seluruh tabel publik dengan
--    prinsip Least Privilege guna melindungi database dari akses langsung PostgREST anonim.
-- 4. [PERF-003] Menambahkan index performa B-Tree pada kolom (tahun) dan (tahun, bulan)
--    untuk seluruh tabel operasional guna mencegah Sequential Scan pada query filter.
--
-- ──────────────────────────────────────────────────────────────────────────
-- STEP 1: HAPUS UNIQUE INDEX SISA DARI v11 PADA data_umum [DB-002]
-- ──────────────────────────────────────────────────────────────────────────

-- Index komposit (dusun_id, tahun) dari migrasi v11 tertinggal saat v12 mengubah
-- data_umum menjadi per-bulan. Ini harus dihapus agar constraint baru
-- data_umum_dusun_tahun_bulan_uniq (dusun_id, tahun, bulan) dapat berfungsi penuh.
DROP INDEX IF EXISTS public.data_umum_dusun_tahun_uidx;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 2: PASTIKAN KOLOM WORKFLOW & FOREIGN KEY report_periods [DB-003, DB-006]
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.report_periods
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'locked')),
  ADD COLUMN IF NOT EXISTS submitted_by INTEGER,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop foreign key lama (jika ada tanpa ON DELETE SET NULL)
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.report_periods'::regclass
      AND contype = 'f'
      AND conname IN (
        'report_periods_submitted_by_fkey',
        'report_periods_approved_by_fkey',
        'report_periods_locked_by_user_id_fkey'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.report_periods DROP CONSTRAINT IF EXISTS %I;', fk_record.conname);
  END LOOP;
END $$;

-- Buat foreign key baru dengan ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_periods_submitted_by_fkey'
  ) THEN
    ALTER TABLE public.report_periods
      ADD CONSTRAINT report_periods_submitted_by_fkey
      FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_periods_approved_by_fkey'
  ) THEN
    ALTER TABLE public.report_periods
      ADD CONSTRAINT report_periods_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'report_periods' AND column_name = 'locked_by_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_periods_locked_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.report_periods
      ADD CONSTRAINT report_periods_locked_by_user_id_fkey
      FOREIGN KEY (locked_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 3: AKTIFKAN ROW LEVEL SECURITY (RLS) PADA SELURUH TABEL [SEC-001]
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Master Data & Auth
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dusun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_column_overrides ENABLE ROW LEVEL SECURITY;

-- 2. Data Operasional PKK
ALTER TABLE public.data_umum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pokja1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pokja2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pokja3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pokja4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_rekap_dawis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_bumil ENABLE ROW LEVEL SECURITY;

-- 3. Tabel Legacy (jika masih ada dari versi sebelum v5)
ALTER TABLE IF EXISTS public.desa ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 4: KEBIJAKAN LEAST PRIVILEGE (POLICIES) UNTUK POSTGREST
-- ──────────────────────────────────────────────────────────────────────────

-- CATATAN ARSITEKTUR PENTING:
-- 1. Seluruh komponen browser (React Client) TIDAK PERNAH memanggil Supabase secara langsung,
--    melainkan melalui Route Handler Next.js (/api/**).
-- 2. Route Handler terautentikasi di server menggunakan `supabase` (SUPABASE_SERVICE_ROLE_KEY),
--    yang secara native membypass RLS di PostgreSQL.
-- 3. Endpoint publik (/api/public/summary & /api/public/dusun/[id]) menggunakan `supabaseAnon`
--    (NEXT_PUBLIC_SUPABASE_ANON_KEY). Oleh karena itu, role `anon` dan `authenticated` hanya
--    diberi akses SELECT (READ-ONLY) pada tabel publik non-sensitif.
-- 4. Tabel sensitif (`users`, `audit_logs`, `rate_limits`, `notifications`, `report_periods`,
--    `table_schemas`) TIDAK memiliki policy untuk `anon`, sehingga tertutup rapat (0 akses)
--    dari internet/PostgREST publik. Semua operasi tulis (INSERT/UPDATE/DELETE) pada seluruh
--    tabel juga tertutup rapat untuk `anon`.

-- 1. Master Dusun: Anon & Authenticated dapat membaca dusun aktif
DROP POLICY IF EXISTS "Allow anon read active dusun" ON public.dusun;
CREATE POLICY "Allow anon read active dusun"
  ON public.dusun
  FOR SELECT
  TO anon, authenticated
  USING (is_active = 1);

-- 2. Tahun Laporan: Anon & Authenticated dapat membaca tahun aktif (is_active INTEGER = 1)
DROP POLICY IF EXISTS "Allow anon read active report_years" ON public.report_years;
CREATE POLICY "Allow anon read active report_years"
  ON public.report_years
  FOR SELECT
  TO anon, authenticated
  USING (is_active = 1);

-- 3. Override Kolom Standar: Anon & Authenticated dapat membaca konfigurasi label/visibilitas kolom
DROP POLICY IF EXISTS "Allow anon read table_column_overrides" ON public.table_column_overrides;
CREATE POLICY "Allow anon read table_column_overrides"
  ON public.table_column_overrides
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Tabel Users, Audit Logs, Rate Limits, Notifications, Report Periods, Table Schemas:
-- DILARANG KERAS untuk anon membaca/menulis tabel-tabel ini.
-- Dengan RLS aktif tanpa policy untuk anon, PostgREST otomatis menolak semua akses anon.

-- 5. Tabel Operasional PKK (HANYA SELECT / READ-ONLY untuk keperluan agregasi publik /api/public/*):
-- Seluruh mutasi (INSERT, UPDATE, DELETE) tetap ditolak untuk anon & authenticated, dan hanya
-- bisa dieksekusi oleh server Next.js via service_role setelah lolos verifikasi JWT & Period Lock.
DROP POLICY IF EXISTS "Allow anon select data_umum" ON public.data_umum;
CREATE POLICY "Allow anon select data_umum" ON public.data_umum FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon select data_pokja1" ON public.data_pokja1;
CREATE POLICY "Allow anon select data_pokja1" ON public.data_pokja1 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon select data_pokja2" ON public.data_pokja2;
CREATE POLICY "Allow anon select data_pokja2" ON public.data_pokja2 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon select data_pokja3" ON public.data_pokja3;
CREATE POLICY "Allow anon select data_pokja3" ON public.data_pokja3 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon select data_pokja4" ON public.data_pokja4;
CREATE POLICY "Allow anon select data_pokja4" ON public.data_pokja4 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon select data_rekap_dawis" ON public.data_rekap_dawis;
CREATE POLICY "Allow anon select data_rekap_dawis" ON public.data_rekap_dawis FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon select data_bumil" ON public.data_bumil;
CREATE POLICY "Allow anon select data_bumil" ON public.data_bumil FOR SELECT TO anon, authenticated USING (true);

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 5: TAMBAHKAN INDEX PERFORMA B-TREE PADA KOLOM TAHUN & BULAN [PERF-003]
-- ──────────────────────────────────────────────────────────────────────────
-- Mempercepat query filter tahunan dan bulanan (mencegah Sequential Scan pada
-- agregasi dashboard, ekspor Excel/Word, dan kalkulasi statistik).

CREATE INDEX IF NOT EXISTS idx_data_umum_tahun ON public.data_umum (tahun);
CREATE INDEX IF NOT EXISTS idx_data_umum_tahun_bulan ON public.data_umum (tahun, bulan);

CREATE INDEX IF NOT EXISTS idx_data_pokja1_tahun ON public.data_pokja1 (tahun);
CREATE INDEX IF NOT EXISTS idx_data_pokja2_tahun ON public.data_pokja2 (tahun);
CREATE INDEX IF NOT EXISTS idx_data_pokja3_tahun ON public.data_pokja3 (tahun);
CREATE INDEX IF NOT EXISTS idx_data_pokja4_tahun ON public.data_pokja4 (tahun);

CREATE INDEX IF NOT EXISTS idx_data_rekap_dawis_tahun ON public.data_rekap_dawis (tahun);
CREATE INDEX IF NOT EXISTS idx_data_rekap_dawis_tahun_bulan ON public.data_rekap_dawis (tahun, bulan);

CREATE INDEX IF NOT EXISTS idx_data_bumil_tahun ON public.data_bumil (tahun);
CREATE INDEX IF NOT EXISTS idx_data_bumil_tahun_bulan ON public.data_bumil (tahun, bulan);

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 6: VERIFIKASI (JALANKAN UNTUK MEMASTIKAN STATUS)
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Konfirmasi index lama telah hilang:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'data_umum' AND indexname = 'data_umum_dusun_tahun_uidx';
-- EXPECTED: 0 baris

-- 2. Konfirmasi RLS aktif pada seluruh tabel publik:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;
-- EXPECTED: relrowsecurity = true untuk seluruh tabel.

-- 3. Konfirmasi index performa telah terpasang:
-- SELECT tablename, indexname FROM pg_indexes WHERE indexname LIKE 'idx_data_%' ORDER BY tablename, indexname;
-- EXPECTED: 10 index performa B-Tree aktif pada tabel operasional.
