-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  RESET OPERATIONAL DATA — JALANKAN MANUAL                                 ║
-- ║  Aplikasi PKK Lumbung Data — TP PKK Desa Belikurip                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ⚠️ ⚠️ ⚠️  PERHATIAN — SCRIPT DESTRUKTIF  ⚠️ ⚠️ ⚠️
--
-- Script ini akan MENGOSONGKAN seluruh data operasional aplikasi sehingga
-- tampilan web kembali ke kondisi "fresh / kosong" seperti baru di-install.
--
-- Setelah script ini dijalankan:
--   - Semua data Pokja, Data Umum, Bumil, Rekap Dawis akan terhapus permanen.
--   - Riwayat audit log akan terhapus.
--   - Notifikasi user akan terhapus.
--   - Rate limit counter akan ter-reset.
--
-- Yang TIDAK terhapus (master data tetap utuh):
--   - Tabel `dusun` (9 dusun Belikurip).
--   - Akun `users` (admin, kader-dusun, dll).
--   - Tabel `report_years` (daftar tahun aktif untuk dropdown).
--   - Tabel `table_schemas` (kolom dinamis).
--   - Tabel `table_column_overrides` (rename/hide kolom standar).
--   - Tabel `report_periods` (status workflow per periode).
--
-- ──────────────────────────────────────────────────────────────────────────
-- BACKUP DULU SEBELUM JALANKAN — WAJIB
-- ──────────────────────────────────────────────────────────────────────────
--
-- Supabase Free Plan TIDAK menyediakan automated backup. Jangan asumsikan
-- ada snapshot otomatis. Lakukan backup manual SEBELUM jalankan SALAH SATU
-- cara di bawah:
--
--   OPSI A — pg_dump (paling lengkap, recommended)
--     Jalankan dari shell lokal Anda:
--
--     pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--       -t data_umum -t data_pokja1 -t data_pokja2 -t data_pokja3 -t data_pokja4 \
--       -t data_rekap_dawis -t data_bumil -t audit_logs -t notifications \
--       --data-only > backup_pre_reset_$(date +%Y%m%d_%H%M).sql
--
--   OPSI B — Export CSV per tabel
--     Buka Supabase Dashboard → Table Editor → klik tabel → tab Data →
--     tombol Export → CSV. Ulangi untuk tiap tabel data_*.
--
--   OPSI C — Export Excel dari aplikasi
--     Login admin → /dashboard/admin → tab "Database" → unduh export Excel
--     untuk tiap tabel. Cocok untuk backup parsial yang bisa dibuka manual.
--
-- ──────────────────────────────────────────────────────────────────────────
-- CARA JALANKAN SCRIPT INI
-- ──────────────────────────────────────────────────────────────────────────
--
--   1. Pastikan backup sudah dibuat & disimpan di tempat yang aman.
--   2. Pastikan tidak ada user lain yang sedang input data di aplikasi.
--   3. Buka Supabase Dashboard → SQL Editor → New query.
--   4. Copy SELURUH isi file ini dan paste ke editor.
--   5. Buka blok pengaman RAISE EXCEPTION dan hilangkan tanda komentar (--) pada perintah:
/*
TRUNCATE TABLE
  data_umum,
  data_pokja1,
  data_pokja2,
  data_pokja3,
  data_pokja4,
  data_rekap_dawis,
  data_bumil,
  audit_logs,
  notifications,
  rate_limits
RESTART IDENTITY CASCADE;
*/
--   6. Klik tombol Run (Ctrl + Enter).
--   7. Setelah selesai, jalankan blok VERIFIKASI di akhir file untuk memastikan
--      hasilnya sesuai (tabel data 0 baris, master data tetap utuh).
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BLOK PENGAMAN AKTIF — HAPUS BLOK INI SEBELUM EKSEKUSI MANUAL            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
DO $$
BEGIN
  RAISE EXCEPTION 'BLOK PENGAMAN AKTIF: File ini adalah skrip reset destruktif. Jika Anda BENAR-BENAR bermaksud mengosongkan seluruh data operasional, buat backup terlebih dahulu, lalu hapus blok RAISE EXCEPTION ini sebelum mengeksekusi TRUNCATE di bawah secara sadar.';
END $$;

-- TRUNCATE TABLE
--   data_umum,
--   data_pokja1,
--   data_pokja2,
--   data_pokja3,
--   data_pokja4,
--   data_rekap_dawis,
--   data_bumil,
--   audit_logs,
--   notifications,
--   rate_limits
-- RESTART IDENTITY CASCADE;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VERIFIKASI — wajib dijalankan setelah reset                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Jalankan blok di bawah satu per satu, atau seluruhnya sekaligus.

-- 1. Tabel data harus 0 baris
SELECT 'data_umum' AS tabel, COUNT(*) AS jumlah_baris FROM data_umum
UNION ALL SELECT 'data_pokja1', COUNT(*) FROM data_pokja1
UNION ALL SELECT 'data_pokja2', COUNT(*) FROM data_pokja2
UNION ALL SELECT 'data_pokja3', COUNT(*) FROM data_pokja3
UNION ALL SELECT 'data_pokja4', COUNT(*) FROM data_pokja4
UNION ALL SELECT 'data_rekap_dawis', COUNT(*) FROM data_rekap_dawis
UNION ALL SELECT 'data_bumil', COUNT(*) FROM data_bumil
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'rate_limits', COUNT(*) FROM rate_limits;
-- EXPECTED: setiap baris jumlah_baris = 0.

-- 2. Master data harus tetap utuh
SELECT 'dusun' AS tabel, COUNT(*) AS jumlah_baris FROM dusun
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'report_years', COUNT(*) FROM report_years
UNION ALL SELECT 'table_schemas', COUNT(*) FROM table_schemas
UNION ALL SELECT 'table_column_overrides', COUNT(*) FROM table_column_overrides
UNION ALL SELECT 'report_periods', COUNT(*) FROM report_periods;
-- EXPECTED:
--   dusun       = 9   (Soko, Melikan, Jamprit Wetan, Jamprit Kulon,
--                      Belikurip, Pagersari, Klerong, Tanjung, Banyuripan)
--   users       >= 1  (minimal admin)
--   report_years>= 1  (minimal 1 tahun aktif untuk dropdown)
--   3 tabel terakhir bebas (boleh 0).

-- 3. Konfirmasi 9 dusun urut sesuai layout resmi
SELECT id, nama, nomor_urut, is_active
FROM dusun
ORDER BY nomor_urut;
-- EXPECTED: 9 baris urut Soko..Banyuripan, semua is_active = 1.

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Setelah verifikasi sukses, login ke aplikasi dan cek:                    ║
-- ║    - Dashboard menampilkan 0 di semua KPI dan chart.                      ║
-- ║    - Halaman edit (mis. /dashboard/pokja1/edit) menampilkan 9 baris dusun ║
-- ║      kosong, siap diisi.                                                  ║
-- ║    - Login admin masih jalan dengan kredensial existing.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
