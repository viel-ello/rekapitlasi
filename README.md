# Lumbung Data PKK — TP PKK Desa Belikurip

Aplikasi web untuk rekapitulasi data kegiatan PKK **Desa Belikurip**, Kecamatan Baturetno, Kabupaten Wonogiri. Unit data terkecil adalah **dusun** (9 dusun). Aplikasi menggantikan pencatatan manual lampiran PKK (Data Umum, Pokja I–IV, Rekapitulasi Dawis, Data Bumil) dengan input digital, validasi, workflow persetujuan, export Excel/Word, dan asisten AI.

> Versi singkat brand: **Lumbung PKK** · Judul: **Lumbung Data PKK**.

---

## Fitur Utama

- **Input data per dusun** untuk Data Umum, Pokja I–IV, Rekapitulasi Dawis, dan Data Bumil. Tabel `data_umum`, `data_rekap_dawis`, dan `data_bumil` bersifat **per-bulan** (Januari–Desember); tabel Pokja per-tahun.
- **Role-based access** + **row-level** untuk kader dusun (hanya boleh edit dusunnya sendiri).
- **Workflow periode**: draft → submitted → approved → locked, dengan **Approval Queue** untuk admin & halaman "Pekerjaan Saya" untuk operator.
- **Import Excel** dengan preview/diff per baris (insert/update/skip) sebelum disimpan, month-aware.
- **Export Excel/Word** + unduh template per tabel.
- **Report Builder** (pilih tabel/tahun/bulan/dusun/kolom → Excel/Word/PDF).
- **AI Assistant** (Google Gemini) dengan **dry-run**: perubahan data dipreview dulu, baru di-commit setelah konfirmasi.
- **Dashboard** KPI, chart per dusun, matrix kelengkapan, dan tren lintas tahun.
- **Audit log**, **notifikasi**, **dark mode**, **mobile card** untuk input di HP.
- **Portal publik** `/publik` (agregat, tanpa login).

---

## Stack

- **Framework**: Next.js 16.2.5 (App Router, Turbopack). Memakai `proxy.js` (bukan `middleware.js`).
- **UI**: React 19, Tailwind CSS 3, flowbite-react-icons, framer-motion.
- **Database**: Supabase (PostgreSQL). Tidak ada SQLite.
- **Auth**: JWT (jose) via cookie httpOnly.
- **AI**: Google Gemini (`@google/generative-ai`).
- **Excel/Word**: exceljs, docx. **Test**: Jest + React Testing Library.

---

## Struktur Folder Penting

```
app/
  api/                     Route handlers (endpoint publik — auth wajib di tiap handler)
    auth/                  Login, logout, ganti password, me
    dusun/  admin/dusun/   Daftar & manajemen dusun
    data-umum/ pokja1..4/  Endpoint data per tabel (via lib/api-handler.js)
    rekap-dawis/ bumil/
    import/                preview, excel (upload), confirm  (month-aware)
    export/                excel, word, template
    periods/               workflow periode + queue
    chat/                  AI assistant + confirm-mutation (dry-run)
    public/                endpoint portal publik (pakai supabaseAnon)
    rekap/                 agregasi dashboard
  dashboard/               halaman setelah login (data entry, admin, approval, reports)
  publik/                  portal publik
lib/
  auth.js                  JWT, role permission, row-level (canWriteRow)
  supabase.js              client service-role + anon
  api-handler.js           factory GET/POST generic untuk tabel data
  dataPages.js             DATA_PAGES (single source of truth kolom & config)
  excel/                   parse, preview diff, import ke Supabase, sheet map
  aiMutation.js            validasi mutasi AI (whitelist tabel/kolom)
  notifications.js         notifikasi workflow periode
components/                UI (tabel, modal, sidebar, topbar, chart, dll)
  ui/Dialog.jsx            dialog reusable yang accessible
__tests__/server/          test domain/server (Jest project "server")
__tests__/client/          test komponen (Jest project "client")
supabase_schema.sql        skema fresh install
supabase_schema_updates_v*.sql  migration berurutan
docs/                      DEPLOYMENT.md, OPERATIONS.md
reports/                   catatan pekerjaan bertanggal
```

---

## Setup Lokal

1. **Clone & install**
   ```bash
   npm install
   ```
2. **Siapkan `.env.local`** (lihat `.env.example` dan bagian Env di bawah).
3. **Siapkan database Supabase** — jalankan migration sesuai urutan (lihat bagian Migration).
4. **Jalankan dev server**
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000.

Login default bootstrap: **admin / admin123** — WAJIB diganti (lihat peringatan keamanan di bawah).

---

## Environment Variables

Salin `.env.example` → `.env.local`, isi nilainya. Detail lengkap ada di komentar `.env.example`.

| Variable | Wajib | Keterangan |
|----------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only, RAHASIA). Dipakai endpoint internal/admin. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (production) | Anon/public key untuk endpoint publik (`/api/public/*`). Di production WAJIB — tanpa ini endpoint publik menolak request (anti bypass RLS). Di dev boleh kosong (fallback + warning). |
| `JWT_SECRET` | ✅ | Secret untuk sign JWT. `lib/auth.js` throw saat import tanpa ini. |
| `GEMINI_API_KEY` | ✅ (untuk AI) | API key Google Gemini. Tanpa ini fitur AI chat nonaktif. |
| `GEMINI_MODEL` | ❌ | Override model default `gemini-flash-latest`. |

---

## Urutan Migration Supabase

Jalankan di **Supabase Dashboard → SQL Editor**, berurutan. Aman dijalankan sekali; sebagian besar idempotent.

1. `supabase_schema.sql` — skema dasar (fresh install).
2. `supabase_schema_updates.sql`
3. `supabase_schema_updates_v2.sql` — `table_column_overrides`, `rate_limits`, audit before/after, `report_periods`.
4. `supabase_schema_updates_v3.sql`
5. `supabase_schema_updates_v4.sql` — workflow, notifications, last_login (report_periods pakai partial unique index).
6. `supabase_schema_updates_v5.sql` — migrasi level dusun (9 dusun).
7. `supabase_schema_updates_v6.sql` — kolom TEXT.
8. `...v7 … v10` (sesuai yang tersedia) — kolom per-bulan rekap dawis, dll.
9. `supabase_schema_updates_v11.sql` — unique index canonical + compatibility view.
10. `supabase_schema_updates_v12.sql` — `data_umum` per-bulan.
11. `supabase_schema_updates_v13.sql` — **partial unique index `report_periods`** (tahunan vs bulanan). **Jalankan STEP 0 dulu** untuk cek duplikat.

Detail checklist deploy ada di `docs/DEPLOYMENT.md`. Script destruktif (reset data) terpisah di `*_reset.sql` / `*_destructive.sql` / `*_EXECUTE_MANUALLY.sql` — jalankan manual hanya bila perlu, backup dulu.

---

## Role & Permission

Diatur di `lib/auth.js` (`ROLE_PERMISSIONS`, `ROLE_SCOPE`).

| Role | Akses | Scope |
|------|-------|-------|
| `admin` | Semua tabel + admin panel + approve/lock periode | all |
| `pokja1`–`pokja4` | Tabel pokja masing-masing | all (semua dusun) |
| `dusun_*` (9 kader dusun) | `data_umum`, `data_rekap_dawis`, `data_bumil` | **own_dusun** (hanya dusunnya) |
| `user` | Read-only | none |

- Role `sekretaris` sudah dihapus.
- Kader dusun: server memaksa `dusun_id` ke milik user (anti-tamper) + `canWriteRow` row-level check + audit `permission_denied` jika coba edit dusun lain.

---

## Cara Test

```bash
npm test -- --runInBand        # semua suite (server + client)
npm run test:server            # hanya test domain/server
npm run test:client            # hanya test komponen
```

Catatan: di PowerShell, exit code 1 bisa muncul karena quirk stderr meski semua test lulus — lihat baris `Tests: X passed` & `Test Suites: X passed`.

---

## Cara Build

```bash
npm run build
npm start
```

Jika build gagal `EPERM unlink .next/...` (OneDrive lock):
```powershell
Get-Process node | Stop-Process -Force; Start-Sleep -Seconds 2; Remove-Item -Recurse -Force .next; npm run build
```

---

## Checklist Deploy (ringkas)

Lihat `docs/DEPLOYMENT.md` untuk lengkapnya.

- [ ] Semua env wajib di-set di host (Vercel), termasuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Migration Supabase dijalankan sampai `v13` (cek duplikat `report_periods` via STEP 0 v13).
- [ ] Password admin default sudah diganti (lihat peringatan keamanan).
- [ ] `npm test` & `npm run build` lulus.
- [ ] Smoke test: login, input + simpan data, submit periode, approve, import preview, halaman publik.

---

## ⚠️ Peringatan Keamanan — Password Admin Default

Seed awal membuat akun **`admin` / `admin123`** (lihat `supabase_schema.sql`). Ini hanya untuk bootstrap awal.

**WAJIB ganti password admin sebelum aplikasi diakses publik/online.** Akun default yang dibiarkan adalah celah keamanan serius. Cara ganti:
1. Login sebagai admin.
2. Topbar → menu profil → **Ganti Password** (atau `/dashboard/profile`), atau tombol Ganti Password di sidebar.
3. Password baru minimal 12 karakter.

Belum ada pemaksaan ganti password saat first-login (ditunda atas keputusan pemilik project). Lakukan manual. Untuk memaksa user lain ganti password, admin bisa set ulang via DB.

---

## Troubleshooting

| Gejala | Penyebab & solusi |
|--------|-------------------|
| Build warning anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` belum di-set. Di dev hanya warning; di production endpoint publik menolak request. Set anon key. |
| `FATAL: ... JWT_SECRET is not defined` | `JWT_SECRET` belum ada di env. |
| Login gagal terus + "Terlalu banyak percobaan" | Rate limit (5×/15 menit/IP). Tunggu atau cek tabel `rate_limits`. |
| AI chat 404/model error | Set `GEMINI_API_KEY`; opsional `GEMINI_MODEL=gemini-flash-latest`. |
| Data per-bulan ter-multiply di dashboard | Pastikan migration v12/v13 sudah jalan; query agregat memfilter bulan. |
| Status periode ganda/error `maybeSingle` | Jalankan `supabase_schema_updates_v13.sql` (partial unique index). |
| Import menimpa bulan salah | Pilih bulan yang benar di panel import sebelum konfirmasi (lihat `docs/OPERATIONS.md`). |
| `EPERM unlink .next` saat build | OneDrive lock — stop proses node lalu hapus `.next` (lihat Cara Build). |

---

## Dokumentasi Lanjutan

- `docs/DEPLOYMENT.md` — checklist deploy lengkap (env, migration v13, anon key).
- `docs/OPERATIONS.md` — operasi harian: rotasi password admin, backup, import/export, recovery import salah bulan.
- `AGENTS.md` — catatan arsitektur detail untuk kontributor/agent.
- `reports/` — catatan pekerjaan bertanggal.
