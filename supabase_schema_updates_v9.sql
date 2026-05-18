-- ==========================================================================
-- SCRIPT UPDATE v9 — Hapus role 'sekretaris' & expand scope kader-dusun
-- ==========================================================================
-- PREREQUISITE: jalankan v1-v8.
-- Script ini IDEMPOTENT: aman dijalankan ulang.
--
-- Perubahan:
--   1. User dengan role `sekretaris` (kalau ada) di-migrate ke role `admin`.
--      Alternatif: ganti manual ke role lain sebelum jalankan v9.
--   2. CHECK constraint `users.role` di-update untuk hapus 'sekretaris'.
--   3. 9 role kader-dusun (`dusun_*`) sekarang bisa edit (row-level scope):
--      - data_umum
--      - data_rekap_dawis (alias: data_kegiatan_warga)
--      - data_bumil
--      Hanya untuk baris dengan dusun_id matching role-nya.
--      Server-side enforcement ada di lib/auth.js → canWriteRow.
--
-- ⚠️  BACKUP DULU sebelum jalankan. Free Plan tidak punya automated backup.
--    pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
--      -t users --data-only > backup_users_v9.sql
-- ==========================================================================

-- 1. Migrasi user role 'sekretaris' → 'admin' (kalau ada) ----------------------
-- Catatan: kalau Anda lebih suka migrate ke role lain (mis. pokja1) atau
-- menonaktifkan akun, batalkan eksekusi v9 dan lakukan manual lewat UI admin
-- atau UPDATE manual sebelum jalankan v9.

DO $$
DECLARE
  affected INT;
BEGIN
  UPDATE users SET role = 'admin' WHERE role = 'sekretaris';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 0 THEN
    RAISE NOTICE 'v9: % user dengan role "sekretaris" di-migrate ke "admin".', affected;
  END IF;
END $$;

-- 2. Drop CHECK constraint lama (kalau ada) lalu tambah versi baru -------------
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  SELECT con.conname INTO constraint_name_var
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'users'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%role%';

  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name_var);
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'user',
  'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
  'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan'
));

-- ==========================================================================
-- VERIFIKASI:
--
-- 1. Role 'sekretaris' tidak ada lagi di users:
--      SELECT COUNT(*) FROM users WHERE role = 'sekretaris';
--      -- harus 0
--
-- 2. CHECK constraint sudah update (harus mention semua 15 role valid):
--      SELECT pg_get_constraintdef(con.oid)
--      FROM pg_constraint con
--      JOIN pg_class rel ON rel.oid = con.conrelid
--      WHERE rel.relname = 'users' AND con.contype = 'c';
--
-- 3. Role kader-dusun masih bisa login & edit:
--      Login sebagai user dengan role mis. dusun_melikan
--      Buka /dashboard/data-umum/edit, /dashboard/rekap-dawis/edit,
--      /dashboard/bumil/edit — hanya baris Melikan yang editable.
-- ==========================================================================
