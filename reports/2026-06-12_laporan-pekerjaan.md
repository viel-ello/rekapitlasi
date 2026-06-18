# Laporan Pekerjaan — 12 Juni 2026

Ringkasan semua perubahan yang dilakukan pada tanggal ini. Diurutkan per batch pekerjaan.

---

## Batch 1 — Data Umum jadi per-bulan (TASK lanjutan)

**Tujuan:** Tiap bulan di Data Umum bisa diisi data berbeda, dan export bisa pilih bulan (mirror pola Rekap Dawis & Bumil).

**File yang diubah:**
- `lib/dataPages.js` — `dataUmum.hasMonth = true`.
- `lib/api-handler.js` — `data_umum` masuk `TABLES_WITH_MONTH` (unique `dusun_id,tahun,bulan`).
- `app/api/rekap/route.js` — query `data_umum` + completeness filter `.eq('bulan', bulan)`. **Kritis**: mencegah total KK/jiwa ter-multiply 12x di dashboard.
- `app/api/rekap/dusun/[id]/route.js` — filter bulan data_umum (current + trend pakai snapshot Desember).
- `app/api/public/summary/route.js` & `app/api/public/dusun/[id]/route.js` — filter bulan data_umum.
- `app/api/rekap/trend/route.js` — trend tahunan data_umum pakai `bulan = 12`.
- `app/api/export/excel/route.js` — `buildDataUmumSheet` terima `bulan` + label periode; `fetchDusunData('data_umum')` jadi per-bulan.
- `lib/excel/importToSupabase.js` — data_umum masuk daftar tabel per-bulan (default bulan 12).
- `components/DataUmumDataPage.js` — TitleBlock menampilkan bulan; dropdown bulan otomatis dari NestedDataPage.
- `supabase_schema.sql` — fresh install data_umum include kolom `bulan` + unique `(dusun_id, tahun, bulan)`.
- `supabase_schema_updates_v12.sql` (**baru**) — migration ADD COLUMN bulan + backfill + NOT NULL + CHECK + unique. Non-destruktif & idempotent.

**Aksi user yang diperlukan:** Jalankan `supabase_schema_updates_v12.sql` di Supabase SQL Editor. ✅ **Sudah dijalankan user.**

---

## Batch 2 — Hardening keamanan & konsistensi (dari IMPLEMENTATION_PLAN.md)

### P0-1 — Otorisasi import per-role
**Masalah:** `/api/import/*` hanya `requireAuth` → semua user login bisa import tabel apa pun, melewati role & row-level.

**File yang diubah:**
- `lib/excel/importToSupabase.js` — menerima parameter `user`; row-level enforcement: role kader-dusun (`own_dusun`) hanya bisa import baris dusunnya sendiri (baris dusun lain di-skip → `rowLevelSkipped`). Kader-dusun tanpa assignment → seluruh sheet ditolak.
- `app/api/import/confirm/route.js` — meneruskan `user` ke `importToSupabase`; audit log `import` (sukses) & `permission_denied` (ditolak).
- `__tests__/server/import-row-level.test.js` (**baru**) — 5 test row-level import.

### P1-2 — AI chat aware kolom `bulan`
**Masalah:** Function-call AI `update_dusun_data` update tanpa filter bulan → bisa menimpa semua bulan sekaligus untuk tabel per-bulan.

**File yang diubah:**
- `app/api/chat/route.js` — parameter `bulan` di function declaration; untuk `data_umum`/`data_rekap_dawis`/`data_bumil`, update difilter `.eq('bulan', bulan)` (default bulan berjalan). Audit & pesan sukses menyertakan bulan.

### P1-1 — Audit log export
**File yang diubah:**
- `app/api/export/excel/route.js` & `app/api/export/word/route.js` — `writeLog({ action: 'export', ... })` dengan tabel + tahun + bulan.

### P0-2 — Paksa ganti password admin
**Status:** DITUNDA atas permintaan user. Password `admin/admin123` **tidak diubah**.

---

## Batch 3 — UX data entry & aksesibilitas (P2)

### P2-2 — Guard `beforeunload` (cegah kehilangan input)
**File yang diubah:**
- `components/NestedDataPage.js` & `components/BumilDataPage.js` — `window.beforeunload` warning saat masih ada perubahan belum disimpan (`dirtyCount > 0`). Banner "belum disimpan" sudah ada sebelumnya.

### P2-4 — Penanda bulan yang sudah berisi data
**File yang diubah:**
- `components/NestedDataPage.js` & `components/BumilDataPage.js` — dropdown bulan menampilkan tanda `●` untuk bulan yang sudah punya data (fetch ringan semua baris tahun ini tanpa filter bulan). Set di-refresh otomatis setelah save sukses. Tooltip menjelaskan arti `●`.

### P2-5 — Aksesibilitas dasar
- Dropdown bulan punya `aria-label` + `title`. (Audit aria-label menyeluruh & `prefers-reduced-motion` belum dikerjakan — lihat sisa di plan.)

---

## Verifikasi (semua batch)

- `npm.cmd test -- --runInBand` → **14 suites / 151 test passing**.
- `npm.cmd run build` → clean (Next.js 16.2.5 / Turbopack). Sempat kena EPERM (OneDrive lock) → diatasi dengan stop node + hapus `.next` + rebuild.

## Sisa pekerjaan (belum dikerjakan)

- P2-3 footer total real-time opsional.
- P2-5 audit `aria-label` menyeluruh untuk semua tombol icon + dukungan `prefers-reduced-motion`.
- P2-1 pisahkan Supabase service-role vs anon.
- P2-6 audit log explorer dengan filter.
- P3: `next/font`, batasi konteks AI per-bulan, cache `/api/years`, report builder, notifikasi, dry-run AI.

## Catatan

- Tidak ada SQL baru yang perlu dijalankan untuk Batch 2 & 3 (semua di level kode).
- Semua perubahan mempertahankan backward-compat alias (`desa_id`, `data_kegiatan_warga`).

---

## Batch 4 — Audit log explorer & aksesibilitas (P2-6 & P2-5)

### P2-6 — Audit log explorer dengan filter
**Temuan:** Explorer ternyata sudah lengkap (filter user/tabel/aksi/dusun/tanggal, pagination, CSV export, detail view di `app/dashboard/admin/page.js`).

**File yang diubah:**
- `app/dashboard/admin/page.js` — tambah opsi aksi `export`, `ai_update`, `permission_denied` ke dropdown filter, supaya log baru (dari audit export & import row-level) bisa difilter.

### P2-5 — Aksesibilitas
**File yang diubah:**
- `components/ThemeProvider.jsx` — bungkus aplikasi dengan `<MotionConfig reducedMotion="user">` dari framer-motion. Animasi JS (dashboard, onboarding, chart, toast) otomatis nonaktif untuk user yang mengaktifkan "reduce motion" di OS. CSS `prefers-reduced-motion` global sudah ada sebelumnya.

**Catatan aksesibilitas:**
- Audit aria-label: mayoritas tombol icon-only sudah punya `aria-label` (Topbar, AiChatBubble, Sidebar, dropdown). Coverage sudah baik.
- Kontras teks kecil belum diaudit formal; validasi WCAG penuh perlu pengujian manual dengan screen reader.

### Verifikasi
- `npm.cmd test -- --runInBand` → **14 suites / 151 test passing**.
- `npm.cmd run build` → clean.

### Catatan
- Tidak ada SQL baru untuk batch ini.

---

## Batch 5 — Performa (P3-2 & P3-4)

### P3-3 — Batasi konteks AI per-bulan
**Status:** DIBATALKAN atas permintaan user. Konteks AI dibiarkan apa adanya.

### P3-2 — `next/font` untuk Google Fonts
**File yang diubah:**
- `app/layout.js` — Fira Sans & Fira Code dimuat via `next/font/google` (self-host, `display: swap`), di-expose sebagai CSS variable `--font-fira-sans` & `--font-fira-code` di `<html>`.
- `app/globals.css` — hapus `@import url(fonts.googleapis.com...)` yang render-blocking.
- `tailwind.config.js` — `fontFamily.sans`/`mono` pakai CSS variable (fallback ke nama font lama).

**Manfaat:** Tidak ada lagi render-blocking font import; mengurangi layout shift (FOUT); font di-host sendiri oleh Next.js.

### P3-4 — Cache `/api/years`
**File yang diubah:**
- `lib/useYears.js` — cache module-level (TTL 60 detik) shared lintas komponen, jadi navigasi antar halaman tidak refetch `/api/years` berulang. `notifyYearsUpdated()` (dipanggil admin saat ubah tahun) meng-invalidate cache + force refresh. `/api/dusun` belum di-cache (ditunda, lebih banyak call site).

### Verifikasi
- `npm.cmd test -- --runInBand` → **14 suites / 151 test passing**.
- `npm.cmd run build` → clean.

### Catatan
- Tidak ada SQL baru untuk batch ini.
- `next/font` mengunduh font saat build (butuh koneksi internet saat `npm run build`).

---

## Batch 6 — Keamanan & UX (P2-1 & P2-3)

### P2-1 — Pisahkan Supabase service-role vs anon client
**File yang diubah:**
- `lib/supabase.js` — tambah export `supabaseAnon` (pakai `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Fallback otomatis ke service-role client + warning di console kalau anon key belum di-set, jadi tidak ada breaking change.
- `app/api/public/summary/route.js` & `app/api/public/dusun/[id]/route.js` — pakai `supabaseAnon`.

**Manfaat (defense-in-depth):** Kalau suatu saat RLS Supabase diaktifkan, endpoint publik tidak otomatis bypass RLS (service-role bypass semua policy). Endpoint internal/admin tetap pakai service-role seperti biasa.

**Opsional (untuk Anda):** Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` (ambil dari Supabase Dashboard → Settings → API → anon/public key) untuk mengaktifkan isolasi ini. Tanpa itu, aplikasi tetap jalan normal (fallback service-role).

### P2-3 — Footer total: tombol "Hitung ulang"
**File yang diubah:**
- `components/NestedDataPage.js` — karena input uncontrolled (tidak re-render saat ngetik), total footer bisa terlihat stale. Ditambah tombol "Hitung ulang total" (desktop) yang memaksa recompute dari nilai yang sedang diketik (termasuk belum disimpan) + label penjelas "Total dihitung dari data yang sudah disimpan."

### Verifikasi
- `npm.cmd test -- --runInBand` → **14 suites / 151 test passing**.
- `npm.cmd run build` → clean.

### Catatan
- Tidak ada SQL baru untuk batch ini.

---

## Batch 7 — Dry-run/preview mutasi AI (P3-7)

**Tujuan:** Sebelum AI mengubah data di database, user harus konfirmasi dulu (lihat preview before/after). Mencegah AI menulis data tanpa sepengetahuan user.

**Alur baru (2 langkah):**
1. `/api/chat` — saat AI memutuskan untuk update data, sekarang **tidak langsung eksekusi**. Ia memvalidasi proposal lalu mengembalikan `mutation_preview` (tabel before/after) ke chat.
2. User klik **"Terapkan"** → `/api/chat/confirm-mutation` **re-validasi penuh server-side** (whitelist tabel/kolom, row-level kader-dusun, period lock, sanitasi) lalu eksekusi. Klik "Batal" → tidak ada perubahan.

**File yang diubah/ditambah:**
- `lib/aiMutation.js` (**baru**) — `validateAiMutation()` + whitelist `VALID_TABLES`/`VALID_COLUMNS` di-extract dari chat route supaya bisa dipakai bersama preview & confirm. Murni (tidak sentuh DB), mudah di-test.
- `app/api/chat/route.js` — function-call AI sekarang menghasilkan preview (bukan eksekusi); import & validasi dari `lib/aiMutation.js`. Hapus import yang tidak terpakai lagi.
- `app/api/chat/confirm-mutation/route.js` (**baru**) — endpoint eksekusi setelah konfirmasi; re-validasi penuh + period lock + audit log `ai_update`.
- `components/AiChatBubble.js` — handle response `mutation_preview`: render kartu before/after dengan tombol "Terapkan"/"Batal"; `applyMutation()` memanggil confirm endpoint.
- `__tests__/server/ai-mutation.test.js` (**baru**) — 11 test untuk validateAiMutation (whitelist, row-level, sanitasi, bulan, alias).

**Keamanan:** Payload preview dari client TIDAK dipercaya — divalidasi ulang penuh di server saat konfirmasi. Role tetap dari JWT.

### Verifikasi
- `npm.cmd test -- --runInBand` → **15 suites / 161 test passing**.
- `npm.cmd run build` → clean; route `/api/chat/confirm-mutation` terdaftar.

### Catatan
- Tidak ada SQL baru untuk batch ini.

---

## Batch 8 — FASE 1 backlog (UI_UX_AND_FEATURE_GAPS.md)

Mengacu ke `UI_UX_AND_FEATURE_GAPS.md`. Audit menunjukkan 2 dari 3 item FASE 1 **sudah selesai** di batch sebelumnya:
- **Workflow Lock Periode** — sudah ada: `components/PeriodWorkflowBadge.jsx` + `/api/periods` + enforcement di `lib/api-handler.js` & `app/api/chat/confirm-mutation/route.js` (admin bypass). Tidak ada perubahan.
- **AI Dry-Run Mutasi** — sudah selesai di Batch 7 (preview + confirm-mutation). Tidak ada perubahan.

### FASE 1 item 3 — Caching `/api/dusun`
**File baru/diubah:**
- `lib/fetchDusun.js` (**baru**) — `getDusunCached()` (cache module-level TTL 60 detik + in-flight dedupe) & `invalidateDusunCache()`.
- `components/NestedDataPage.js`, `components/BumilDataPage.js`, `components/PokjaDataPage.js`, `components/DataStatsPage.js`, `app/dashboard/reports/page.js` — semua `fetch('/api/dusun')` diganti `getDusunCached()`.
- `app/dashboard/admin/page.js` — panggil `invalidateDusunCache()` setelah admin ubah nama / aktif-nonaktif dusun supaya cache tidak basi.

**Manfaat:** Saat banyak kader memakai aplikasi serentak & berpindah halaman, daftar dusun (9 item statis) tidak di-refetch berulang → beban DB berkurang.

### Verifikasi
- `npm.cmd test -- --runInBand` → **15 suites / 161 test passing**.
- `npm.cmd run build` → clean.

### Catatan
- Tidak ada SQL baru.
- FASE 1 dari backlog dianggap selesai (item 1 & 2 sudah ada sebelumnya, item 3 baru dikerjakan).
- Item keamanan password `admin123` tetap ditunda sesuai permintaan user.

---

## Batch 9 — FASE 2 & audit FASE 3 (UI_UX_AND_FEATURE_GAPS.md)

### Audit: item yang ternyata SUDAH ADA
- **FASE 3 #1 Notifikasi** — tombol bel di `Topbar.js` sudah fungsional (fetch `/api/notifications`, mark-read, badge unread, polling 60 dtk). `lib/notifications.js` + `/api/periods` sudah generate notifikasi saat transisi periode. Tidak ada perubahan.
- **FASE 3 #2 Import Preview V2** — `ImportTab` + `ImportPreviewModal` di admin page sudah menampilkan diff (insert/update/skip) sebelum konfirmasi. Tidak ada perubahan.

### FASE 2 #1 — Density Toggle (Nyaman/Ringkas)
- `lib/useDensity.js` (**baru**) — hook density (localStorage + sinkron antar komponen), `components/DensityToggle.jsx` (**baru**).
- `app/globals.css` — rule `.data-table.density-compact` (padding & font lebih kecil).
- Dipasang di `PokjaDataPage` & `BumilDataPage` (tabel `.data-table`). NestedDataPage padding sudah sangat rapat sehingga tidak diberi toggle (menghindari kontrol yang tidak terasa efeknya).

### FASE 2 #1 — Group Headers
- Tabel Pokja sudah punya 2-tier header ("Kolom Standar" + "Kolom Dinamis" via colspan). Data Umum & Rekap Dawis pakai `NestedDataPage` yang sudah multi-level header. Tidak ada perubahan tambahan.

### FASE 2 #2 — Navigasi cepat antar-dusun (mobile)
- `PokjaDataPage`, `NestedDataPage`, `BumilDataPage` — dropdown sticky "Lompat ke:" di mobile yang meng-expand + scroll ke kartu dusun (`id="dusun-card-<id>"` + `scrollIntoView`).
- Collapsible group: kartu mobile Pokja & NestedDataPage sudah accordion (expand/collapse per dusun). Bumil card tetap (form lebih pendek).

### FASE 2 #3 — Loading Skeleton
- `components/TableSkeleton.jsx` (**baru**) — skeleton toolbar + tabel desktop + kartu mobile.
- Ditampilkan saat `initialLoading` di `PokjaDataPage`, `NestedDataPage`, `BumilDataPage` → tidak ada blank screen.

### FASE 2 #4 — Hierarki visual
- Komponen tabel & badge sudah pakai warna fungsional konsisten: merah (error/gagal), amber (warning/belum disimpan), hijau (sukses/tersimpan), biru (info/review). `prefers-reduced-motion` + `MotionConfig` sudah dari batch sebelumnya. Tidak dilakukan overhaul warna besar (risiko regresi tinggi, manfaat kecil).

### Verifikasi
- `npm.cmd test -- --runInBand` → **15 suites / 161 test passing**.
- `npm.cmd run build` → clean.

### Catatan
- Tidak ada SQL baru.
- FASE 1, 2, 3 dari backlog `UI_UX_AND_FEATURE_GAPS.md` selesai (banyak item FASE 1 & 3 sudah ada sebelumnya; FASE 2 dikerjakan di batch ini).
- Password `admin123` tetap (sesuai permintaan user).

