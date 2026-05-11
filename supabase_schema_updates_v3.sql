-- ==========================================
-- SCRIPT UPDATE v3 — Tahun aktif (report_years)
-- ==========================================
-- Jalankan di SQL Editor Supabase.

-- 1. Tabel daftar tahun yang diaktifkan admin
CREATE TABLE IF NOT EXISTS report_years (
  id SERIAL PRIMARY KEY,
  tahun INTEGER NOT NULL UNIQUE CHECK (tahun BETWEEN 2000 AND 2100),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Seed tahun default supaya UI tidak kosong setelah migrasi
INSERT INTO report_years (tahun, is_active) VALUES
  (EXTRACT(YEAR FROM NOW())::int - 2, 1),
  (EXTRACT(YEAR FROM NOW())::int - 1, 1),
  (EXTRACT(YEAR FROM NOW())::int, 1),
  (EXTRACT(YEAR FROM NOW())::int + 1, 1)
ON CONFLICT (tahun) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_report_years_active ON report_years(is_active, tahun DESC);
