-- ==========================================
-- SCRIPT UPDATE v2 — Kolom Overrides, Logo, Notes
-- ==========================================
-- Jalankan di SQL Editor Supabase.

-- 1. Tabel override kolom standar (rename/hide) per tabel
CREATE TABLE IF NOT EXISTS table_column_overrides (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  column_key TEXT NOT NULL,
  label_override TEXT,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_name, column_key)
);

CREATE INDEX IF NOT EXISTS idx_table_column_overrides_table
  ON table_column_overrides(table_name);

-- 2. Tabel rate_limits (jika belum ada dari fase sebelumnya)
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  first_attempt BIGINT NOT NULL,
  blocked_until BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Catatan opsional untuk audit log (before/after JSON)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_json JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_json JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table
  ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs(user_id);

-- 4. Tabel report_periods untuk lock periode (fitur masa depan, tabel disiapkan)
CREATE TABLE IF NOT EXISTS report_periods (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  tahun INTEGER NOT NULL,
  bulan INTEGER,
  is_locked INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by_user_id INTEGER REFERENCES users(id),
  UNIQUE(table_name, tahun, bulan)
);
