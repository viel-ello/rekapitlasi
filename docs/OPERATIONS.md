# Operations — Lumbung Data PKK

Panduan operasional harian untuk admin & operator.

---

## 1. Rotasi / Ganti Password Admin

Seed awal: **`admin` / `admin123`** (bootstrap). **WAJIB diganti sebelum online.**

### Ganti via aplikasi (disarankan)
1. Login sebagai admin.
2. Topbar → menu profil → **Ganti Password** (atau buka `/dashboard/profile`).
   Bisa juga lewat tombol **Ganti Password** di sidebar.
3. Masukkan password lama + password baru (minimal 12 karakter).
4. Setelah sukses, sesi logout otomatis → login ulang dengan password baru.

### Memaksa user lain ganti password
Belum ada pemaksaan otomatis saat first-login (keputusan pemilik project).
Untuk memaksa reset, admin bisa:
- Buat user baru lewat panel admin, atau
- Reset password user dari panel admin (Users tab), lalu beri tahu user.

### Catatan
- Jangan pakai password yang sama dengan akun lain.
- `JWT_SECRET` di production sebaiknya juga string acak kuat (bukan default dev).

---

## 2. Backup Supabase (Free Plan — manual)

Free Plan **tidak** punya automated backup. Lakukan minimal sebelum migration / perubahan besar.

**Opsi A — pg_dump (paling lengkap):**
```
pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" --data-only > backup_YYYYMMDD.sql
```

**Opsi B — Export CSV per tabel:** Supabase → Table Editor → pilih tabel → Export.

**Opsi C — Export Excel dari aplikasi:** panel admin → tab Import/Export → unduh.
Backup parsial per tabel, cukup untuk data operasional.

Tabel penting untuk dibackup: `data_umum`, `data_pokja1..4`, `data_rekap_dawis`,
`data_bumil`, `report_periods`, `users`, `dusun`, `audit_logs`.

---

## 3. Import & Export Excel

### Import (panel admin → tab Import)
1. Unduh **template** untuk tabel yang dituju (agar format sesuai).
2. Isi data. Pastikan nama dusun sesuai 9 dusun resmi.
3. Pilih **Tahun** dan **Bulan** target. ⚠️ Untuk tabel bulanan (Data Umum,
   Rekap Dawis, Bumil) **bulan menentukan periode penyimpanan**.
4. Upload file → review **preview diff** (insert/update/skip per baris).
5. Klik **Konfirmasi** untuk menyimpan. Sebelum konfirmasi, data belum berubah.

### Export
- Panel admin / dashboard → Export Excel / Word.
- Bisa pilih bulan untuk tabel bulanan.

---

## 4. Recovery — Import ke Bulan yang Salah

Kalau tidak sengaja meng-import data ke bulan yang keliru:

1. **Identifikasi**: catat tabel, tahun, dan bulan yang keliru.
2. **Jangan panik** — data lama bulan lain tidak terpengaruh (upsert per
   `dusun_id, tahun, bulan`).
3. **Perbaiki manual lewat aplikasi**: buka halaman data tabel tersebut, pilih
   bulan yang salah, perbaiki/ kosongkan nilai per dusun, simpan. Lalu import
   ulang ke bulan yang benar.
4. **Atau lewat SQL (admin, hati-hati, backup dulu)**: hapus baris periode keliru
   ```sql
   -- CONTOH — review & backup dulu. Ganti nilai sesuai kasus.
   DELETE FROM data_umum WHERE tahun = 2026 AND bulan = 12 AND dusun_id IN (...);
   ```
   lalu import ulang ke bulan benar.
5. Periksa **audit_logs** untuk melihat siapa & kapan import dilakukan
   (action `import`, detail memuat tahun & bulan).

> Pencegahan: panel import menampilkan target periode ("Data akan disimpan ke
> <Bulan> <Tahun>") sebelum konfirmasi. Selalu periksa sebelum klik Konfirmasi.

---

## 5. Workflow Periode (Approval)

Status: `draft → submitted → approved → locked`.

- **Operator/kader**: isi data → **Ajukan Review** (submit) di badge periode.
- **Admin**: buka **Persetujuan** (`/dashboard/approval`) → **Setujui** /
  **Kembalikan**. Bisa juga **Kunci** periode final dari halaman data.
- Periode `locked` tidak bisa diedit kecuali admin membuka kembali.
- Notifikasi terkirim otomatis saat submit/approve/return/lock.

---

## 6. Rate Limit Login

- 5 percobaan gagal / 15 menit / IP → blokir 30 menit.
- Reset manual (admin): hapus baris terkait di tabel `rate_limits`.
