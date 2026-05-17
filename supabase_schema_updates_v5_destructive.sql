-- ==========================================================================
-- SCRIPT v5 DESTRUCTIVE — DROP kolom legacy & arsip data 13 desa lama
-- ==========================================================================
-- ⚠️  MANUAL ONLY — Jangan jalankan tanpa backup dan tanpa verifikasi production stable.
-- ⚠️  PERMANEN — Operasi di file ini menghapus data atau mengubah struktur.
--
-- File ini terpisah dari v5 supaya:
--   - Migration v5 default tetap aman dan idempotent.
--   - Drop kolom hanya dilakukan sekali, manual, oleh admin yang tahu konsekuensinya.
--
-- PREREQUISITE:
--   1. Supabase Free Plan TIDAK menyediakan automated backup. Lakukan manual:
--      a. pg_dump dari mesin lokal (CLI di bawah).
--      b. ATAU export CSV per tabel via Supabase SQL Editor (untuk tabel yang
--         akan di-drop kolomnya).
--      c. ATAU export Excel per tabel dari panel admin aplikasi.
--   2. v5 sudah dijalankan sebelumnya.
--   3. Aplikasi production stable minimal 1 release setelah v5.
--
-- Pilih SALAH SATU bagian sesuai kebutuhan, lalu hapus tanda komentar.
-- Default semua statement di-comment supaya nothing happens kalau salah klik Run.
-- ==========================================================================

-- ─── BACKUP CLI (jalankan dari shell lokal sebelum yang lain) ───────────────
-- pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--   -t dusun -t users -t audit_logs \
--   -t data_umum -t data_pokja1 -t data_pokja2 -t data_pokja3 -t data_pokja4 \
--   -t data_kegiatan_warga -t data_rekap_dawis -t data_bumil \
--   --data-only > backup_pre_v5_destructive.sql
-- ----------------------------------------------------------------------------


-- ─── BAGIAN 1 — DROP kolom legacy Pokja II ──────────────────────────────────
-- Kolom-kolom ini sudah tidak dipakai UI/API setelah v5 (sudah ada kolom
-- pengganti baru). Drop hanya untuk merapikan schema.
--
-- ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS rumah_dilan;
-- ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS kampung_mandiri;
-- ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS usaha_mikro;
-- ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS toko_pkk;
-- ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS koperasi_belum_bh_kop;
-- ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS koperasi_belum_bh_angg;


-- ─── BAGIAN 2 — DROP kolom legacy Rekap Dawis ───────────────────────────────
-- Kolom redundant (jml_dusun) atau diganti agregat single col (tiga_buta,
-- berkebutuhan_khusus sudah ditambahkan di v5).
--
-- ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS jml_dusun;
-- ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS tiga_buta_l;
-- ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS tiga_buta_p;
-- ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS ikut_industri;


-- ─── BAGIAN 3 — ARCHIVE data lama 13 desa ke *_archive_kecamatan ────────────
-- RECOMMENDED: simpan baris yang masih punya `desa_id` (data lama) ke tabel
-- archive sebelum di-delete. Kolom desa_id tetap ada di tabel utama supaya
-- tidak break aplikasi.
--
-- CREATE TABLE IF NOT EXISTS data_umum_archive_kecamatan AS
--   SELECT * FROM data_umum WHERE desa_id IS NOT NULL;
-- DELETE FROM data_umum WHERE desa_id IS NOT NULL AND dusun_id IS NULL;
--
-- CREATE TABLE IF NOT EXISTS data_pokja1_archive_kecamatan AS
--   SELECT * FROM data_pokja1 WHERE desa_id IS NOT NULL;
-- DELETE FROM data_pokja1 WHERE desa_id IS NOT NULL AND dusun_id IS NULL;
--
-- CREATE TABLE IF NOT EXISTS data_pokja2_archive_kecamatan AS
--   SELECT * FROM data_pokja2 WHERE desa_id IS NOT NULL;
-- DELETE FROM data_pokja2 WHERE desa_id IS NOT NULL AND dusun_id IS NULL;
--
-- CREATE TABLE IF NOT EXISTS data_pokja3_archive_kecamatan AS
--   SELECT * FROM data_pokja3 WHERE desa_id IS NOT NULL;
-- DELETE FROM data_pokja3 WHERE desa_id IS NOT NULL AND dusun_id IS NULL;
--
-- CREATE TABLE IF NOT EXISTS data_pokja4_archive_kecamatan AS
--   SELECT * FROM data_pokja4 WHERE desa_id IS NOT NULL;
-- DELETE FROM data_pokja4 WHERE desa_id IS NOT NULL AND dusun_id IS NULL;
--
-- CREATE TABLE IF NOT EXISTS data_rekap_dawis_archive_kecamatan AS
--   SELECT * FROM data_rekap_dawis WHERE desa_id IS NOT NULL;
-- DELETE FROM data_rekap_dawis WHERE desa_id IS NOT NULL AND dusun_id IS NULL;
--
-- CREATE TABLE IF NOT EXISTS data_bumil_archive_kecamatan AS
--   SELECT * FROM data_bumil WHERE desa_id IS NOT NULL;
-- DELETE FROM data_bumil WHERE desa_id IS NOT NULL AND dusun_id IS NULL;


-- ─── BAGIAN 4 — DROP tabel `desa` lama (kalau masih ada) ────────────────────
-- Setelah Bagian 3 selesai, tabel `desa` lama sudah tidak punya FK aktif.
-- Drop CASCADE menghapus tabel + index + constraint terkait.
--
-- DROP TABLE IF EXISTS desa CASCADE;


-- ─── BAGIAN 5 — DROP kolom desa_id dari tabel data ──────────────────────────
-- Hanya jalankan kalau yakin tidak butuh fallback ke data lama.
--
-- ALTER TABLE data_umum            DROP COLUMN IF EXISTS desa_id;
-- ALTER TABLE data_pokja1          DROP COLUMN IF EXISTS desa_id;
-- ALTER TABLE data_pokja2          DROP COLUMN IF EXISTS desa_id;
-- ALTER TABLE data_pokja3          DROP COLUMN IF EXISTS desa_id;
-- ALTER TABLE data_pokja4          DROP COLUMN IF EXISTS desa_id;
-- ALTER TABLE data_rekap_dawis     DROP COLUMN IF EXISTS desa_id;
-- ALTER TABLE data_bumil           DROP COLUMN IF EXISTS desa_id;


-- ─── BAGIAN 6 — DROP kolom desa_nama dari audit_logs ────────────────────────
-- Kolom dusun_nama sudah ada (v5). Drop desa_nama hilangkan history nama desa lama.
-- Sebaiknya export audit_logs lebih dulu kalau butuh history.
--
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS desa_nama;

-- ==========================================================================
-- VERIFIKASI setelah jalankan:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name LIKE 'data_%' AND column_name = 'desa_id';
--   -- harus kosong kalau Bagian 5 sudah dijalankan
--
--   SELECT table_name FROM information_schema.tables
--     WHERE table_name LIKE '%_archive_kecamatan';
--   -- list semua archive table yang sudah dibuat
-- ==========================================================================
