-- ==========================================
-- SCRIPT UPDATE: FITUR KOLOM DINAMIS (JSONB)
-- ==========================================
-- Silakan jalankan script ini di menu "SQL Editor" pada dashboard Supabase Anda.

-- 1. Buat tabel untuk menyimpan definisi kolom dinamis
CREATE TABLE IF NOT EXISTS table_schemas (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL, -- contoh: 'data_pokja1'
  column_key TEXT NOT NULL, -- contoh: 'keterangan_tambahan'
  column_label TEXT NOT NULL, -- contoh: 'Keterangan Tambahan'
  column_type TEXT NOT NULL DEFAULT 'text', -- 'text' atau 'number'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_name, column_key)
);

-- 2. Tambahkan field custom_columns ke semua tabel data operasional
-- Kita menggunakan tipe JSONB dengan nilai default '{}' (objek kosong)

ALTER TABLE data_umum ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
ALTER TABLE data_pokja1 ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
ALTER TABLE data_pokja3 ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
ALTER TABLE data_pokja4 ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
ALTER TABLE data_kegiatan_warga ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;
