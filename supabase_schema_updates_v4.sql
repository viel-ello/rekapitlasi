-- ==========================================
-- SCRIPT UPDATE v4 — Workflow, Notifications, Profile Activity
-- ==========================================
-- Jalankan di SQL Editor Supabase.

-- 1. Workflow & Period Lock
CREATE TABLE IF NOT EXISTS report_periods (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  tahun INTEGER NOT NULL,
  bulan INTEGER,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','locked')),
  submitted_by INTEGER REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (table_name, tahun, bulan)
);

-- Index untuk query status
CREATE INDEX IF NOT EXISTS idx_report_periods_lookup
  ON report_periods(table_name, tahun, bulan);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

-- 3. Profile — last login timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
