-- ==========================================================================
-- SCRIPT v6 RESET — TRUNCATE semua data tabel ke 0 baris
-- ==========================================================================
-- ⚠️  MANUAL ONLY — Jangan jalankan di production tanpa konfirmasi user.
-- ⚠️  PERMANEN — Semua baris di tabel data_*, audit_logs, notifications,
--     dan rate_limits akan hilang. Tabel master (dusun, users, report_years,
--     table_schemas, report_periods) TIDAK di-truncate.
--
-- Pemakaian umum:
--   - Reset staging environment ke kondisi "website baru".
--   - Hapus dummy data setelah testing v5/v6.
--
-- PREREQUISITE:
--   1. Backup pg_dump atau export Excel/CSV per tabel sebelum jalankan.
--   2. Konfirmasi langsung dengan owner aplikasi.
-- ==========================================================================

-- ─── BACKUP CLI (jalankan dari shell lokal sebelum yang lain) ───────────────
-- pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--   -t data_umum -t data_pokja1 -t data_pokja2 -t data_pokja3 -t data_pokja4 \
--   -t data_rekap_dawis -t data_bumil -t audit_logs -t notifications \
--   --data-only > backup_pre_reset.sql
-- ----------------------------------------------------------------------------


-- ─── BAGIAN 1 — Truncate data tables (data baru migrasi) ────────────────────
-- Hapus comment di bawah HANYA setelah backup confirm.
--
-- TRUNCATE TABLE
--   data_umum,
--   data_pokja1,
--   data_pokja2,
--   data_pokja3,
--   data_pokja4,
--   data_rekap_dawis,
--   data_bumil
-- RESTART IDENTITY CASCADE;


-- ─── BAGIAN 2 — Truncate operational tables (history & rate limit) ──────────
-- Audit log dan notifications boleh di-truncate kalau memang reset penuh.
--
-- TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE rate_limits RESTART IDENTITY CASCADE;


-- ==========================================================================
-- VERIFIKASI:
--   SELECT 'data_umum' as tabel, COUNT(*) as rows FROM data_umum
--   UNION ALL SELECT 'data_pokja1', COUNT(*) FROM data_pokja1
--   UNION ALL SELECT 'data_pokja2', COUNT(*) FROM data_pokja2
--   UNION ALL SELECT 'data_pokja3', COUNT(*) FROM data_pokja3
--   UNION ALL SELECT 'data_pokja4', COUNT(*) FROM data_pokja4
--   UNION ALL SELECT 'data_rekap_dawis', COUNT(*) FROM data_rekap_dawis
--   UNION ALL SELECT 'data_bumil', COUNT(*) FROM data_bumil;
--   -- semua harus 0
--
--   SELECT COUNT(*) FROM dusun;          -- harus tetap 9
--   SELECT COUNT(*) FROM users;          -- harus tetap ≥ 1 (admin)
-- ==========================================================================
