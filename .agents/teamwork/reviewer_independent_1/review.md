# Laporan Review Independen & Verifikasi Kode (Independent Review & Code Verification)

**Reviewer & Adversarial Critic:** `reviewer_independent_1` (teamwork_preview_reviewer)  
**Tanggal Evaluasi:** 12 Oktober 2026  
**Target Dokumen:** `reports/AUDIT_2026-10-12.md`  
**Basis Kode:** TP PKK Desa Belikurip (Next.js 16.2.5, Supabase, Jose JWT, React 19)  
**Status Keselamatan:** READ-ONLY terverifikasi, Zero Database Mutations, Zero Secret Leakage.

---

## 1. Review Summary

**Verdict: APPROVE (DISETUJUI)**

Laporan audit `reports/AUDIT_2026-10-12.md` telah melalui verifikasi independen mendalam, uji silang terhadap berkas kode sumber dan nomor baris aktual, serta pemindaian kebocoran kredensial rahasia. Seluruh 7 temuan Kritis, 12 temuan Tinggi, dan sampel 12 temuan Sedang/Rendah terbukti faktual 100%, memiliki rantai bukti teknis yang solid, dan tidak memuat manipulasi atau pemalsuan data uji (integrity violation).

---

## 2. Verified Claims & Ground Truth Cross-Verification

### 2.1 Verifikasi 7 Temuan Kritis (Critical Findings)

1. **[SEC-001] Database Row Level Security (RLS) Dinonaktifkan di Seluruh Tabel Supabase**
   - **Lokasi Terverifikasi:** `lib/supabase.js:19-25`, `supabase_schema.sql:1-120`, file migrasi `v1` s/d `v13`.
   - **Hasil Pengecekan:** Dikonfirmasi bahwa tidak ada satu pun perintah `ENABLE ROW LEVEL SECURITY` di 13 skrip SQL migrasi. `lib/supabase.js:19-20` secara eksplisit menuliskan komentar `// RLS tidak aktif pada tabel...`. Di saat yang sama, `NEXT_PUBLIC_SUPABASE_ANON_KEY` disematkan ke browser client, membuka pintu manipulasi tabel `users` dan data operasional via PostgREST tanpa melewati auth Next.js.
   - **Status:** **VALID (100%)**

2. **[DB-001] Skrip Reset Operasional Memuat Perintah `TRUNCATE CASCADE` Aktif**
   - **Lokasi Terverifikasi:** `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql:65-76`.
   - **Hasil Pengecekan:** Perintah `TRUNCATE TABLE data_umum, data_pokja1, data_pokja2, data_pokja3, data_pokja4, data_rekap_dawis, data_bumil, audit_logs, notifications, rate_limits RESTART IDENTITY CASCADE;` berada pada baris 65–76 tanpa tanda komentar (`--`). Eksekusi tidak sengaja di Supabase Dashboard akan memusnahkan seluruh data operasional 9 dusun.
   - **Status:** **VALID (100%)**

3. **[DB-002] Konflik Index Unik `data_umum_dusun_tahun_uidx` pada Penyimpanan Bulan ke-2**
   - **Lokasi Terverifikasi:** `supabase_schema_updates_v11.sql:81`, `supabase_schema_updates_v12.sql:58-75`.
   - **Hasil Pengecekan:** Pada `v11.sql:81`, index unik standalone dibuat dengan `ensure_unique_index('data_umum', ARRAY['dusun_id', 'tahun'], 'data_umum_dusun_tahun_uidx')`. Pada `v12.sql:58-75` saat `data_umum` diubah menjadi bulanan, skrip hanya men-drop constraint table `data_umum_dusun_tahun_uniq` dan `data_umum_dusun_id_tahun_key`. Index `data_umum_dusun_tahun_uidx` tidak pernah di-drop, sehingga PostgreSQL tetap memvalidasi uniqueness `(dusun_id, tahun)` dan melempar error duplicate key pada bulan ke-2 (`bulan = 2`).
   - **Status:** **VALID (100%)**

4. **[DB-003] Migrasi v4 Berisiko NO-OP Akibat `CREATE TABLE IF NOT EXISTS` Menimpa Skema v2**
   - **Lokasi Terverifikasi:** `supabase_schema_updates_v2.sql:43-52`, `supabase_schema_updates_v4.sql:7-21`.
   - **Hasil Pengecekan:** Skrip `v2.sql:43-52` telah membuat tabel `report_periods` dengan skema awal. Skrip `v4.sql:7-21` mendefinisikan ulang `report_periods` dengan kolom `status`, `submitted_by`, dll. menggunakan `CREATE TABLE IF NOT EXISTS`. Karena tabel sudah ada, statement tersebut diabaikan total (NO-OP). Kolom workflow tidak pernah terbuat pada DB yang menjalankan v2 lalu v4.
   - **Status:** **VALID (100%)**

5. **[DB-004] Agregasi Tahunan Excel Export Rusak Akibat Pengecekan `typeof number` pada Kolom TEXT v6**
   - **Lokasi Terverifikasi:** `app/api/export/excel/route.js:72`, `supabase_schema_updates_v6.sql:11-20, 55-60`.
   - **Hasil Pengecekan:** Pada `route.js:72`, agregasi memeriksa `if (typeof v === 'number')`. Pada `v6.sql`, seluruh kolom numerik dikonversi menjadi tipe data `TEXT`. Karena nilai kembalian PostgreSQL bertipe string, `typeof v === 'number'` selalu bernilai `false`, melompat ke `else if (existing[k] == null)` yang hanya mempertahankan nilai bulan pertama dan mengabaikan bulan ke-2 s/d 12.
   - **Status:** **VALID (100%)**

6. **[FEAT-001] Inkonsistensi Kolom Pokja II pada Ekspor Excel Memicu Pergeseran & Korupsi Data**
   - **Lokasi Terverifikasi:** `app/api/export/excel/route.js:331, 393`, `lib/dataPages.js:98-100`, `lib/excel/sheetMap.js:63`.
   - **Hasil Pengecekan:** Header kolom ke-14 di `route.js:331` adalah `JML KLP PEMBACA` (`klp_pembaca`) dan kolom resmi `bkb_jml_ibu_peserta` hilang. Namun skema data di `lib/dataPages.js:98-100` dan importer di `lib/excel/sheetMap.js:63` mengharapkan `bkb_jml_ibu_peserta`. Akibatnya terjadi off-by-one column shifting yang merusak data kelompok BKB saat file hasil export diimpor kembali.
   - **Status:** **VALID (100%)**

7. **[TEST-001] E2E Playwright Suite Mengarah ke URL Live Produksi & Melakukan Mutasi Destruktif**
   - **Lokasi Terverifikasi:** `playwright.config.mjs:7`, `e2e/tests/crud.spec.mjs:1-60`, `package.json:34`.
   - **Hasil Pengecekan:** `playwright.config.mjs:7` menetapkan default `BASE_URL = process.env.E2E_BASE_URL || 'https://lumbungdatapkk.vercel.app'`. File `e2e/tests/crud.spec.mjs` secara eksplisit menulis data tahun 2099 ke basis data produksi. Keputusan tim audit untuk membatalkan eksekusi Playwright E2E sepenuhnya mematuhi batasan keselamatan Mandatory Constraint #2. Terverifikasi pula paket `next@16.2.5` di `package.json:34` terpapar kerentanan kritis RCE Windows GHSA-p293-qw3h-jr36.
   - **Status:** **VALID (100%)**

---

### 2.2 Verifikasi Seluruh 12 Temuan Tinggi (High Findings)

1. **[SEC-002] Impor Excel Mem-bypass Period Lock (`checkPeriodLock` Absen)**
   - `app/api/import/confirm/route.js:77`, `lib/excel/importToSupabase.js:126-132`. Terverifikasi tidak ada pemanggilan `checkPeriodLock` sebelum batch upsert. **(VALID)**
2. **[SEC-003] Kerentanan PostgREST Filter Injection pada Endpoint Audit Logs**
   - `app/api/admin/logs/route.js:42`, `app/api/admin/logs/export/route.js:46`. Terverifikasi concatenasi langsung string mentah `${unitNama}` ke dalam query `.or(...)`. **(VALID)**
3. **[SEC-004] Formula Injection / CSV Injection pada Ekspor Audit Log dan Ekspor Excel**
   - `app/api/admin/logs/export/route.js:16-21`, `app/api/export/excel/route.js:188, 278, 415, 505, 616, 914`. Terverifikasi tidak ada sanitasi karakter prefix formula (`=`, `+`, `-`, `@`). **(VALID)**
4. **[ARCH-003] Ekspor Word Menggunakan Kolom Legacy Pokja II & Mengabaikan Tabel Bulanan**
   - `app/api/export/word/route.js:144-180, 363-374`. Terverifikasi memuat 6 kolom Pokja II yang telah di-drop di v5 (`rumah_dilan`, dll.) dan loop `POKJA_DEFS` hanya memproses Pokja 1–4. **(VALID)**
5. **[PERF-001] Redundansi Query Ekstrem (23 Query Supabase) pada Endpoint Dashboard /api/rekap**
   - `app/api/rekap/route.js:59-295`. Terverifikasi loop completeness check meng-query ulang seluruh 7 tabel data yang sudah di-fetch di awal (14 query redundan). **(VALID)**
6. **[PERF-003] Ketiadaan Index pada Kolom Filter Kritis (`tahun`) di Seluruh Tabel Operasional**
   - `supabase_schema.sql:45-273` & migrasi `v1` s/d `v13`. Terverifikasi seluruh composite unique index menaruh `dusun_id` di kolom pertama, tidak ada index pada `tahun` atau `(tahun, bulan)`. **(VALID)**
7. **[UIUX-001] Tombol "Batalkan" Membuang Seluruh Perubahan Dirty Tanpa Konfirmasi**
   - `components/PokjaDataPage.js:557`, `BumilDataPage.js:540`, `NestedDataPage.js:568`. Terverifikasi memanggil `cancelPending` yang langsung membuang dirty state tanpa modal konfirmasi. **(VALID)**
8. **[UIUX-002] Proteksi `beforeunload` Tidak Menghentikan Navigasi SPA Client-Side**
   - `components/PokjaDataPage.js:550`, `NestedDataPage.js:352`, `BumilDataPage.js:344`. Terverifikasi listener native `beforeunload` tidak menangani navigasi Next.js router `<Link>`. **(VALID)**
9. **[TEST-002] Ketiadaan Test Coverage untuk Formulir Frontend Monolitik Utama**
   - `components/NestedDataPage.js`, `BumilDataPage.js`, `app/dashboard/page.js`. Terverifikasi direktori `__tests__/client/` hanya memiliki 3 test suite kecil untuk toolbar, topbar, dan dialog modal. **(VALID)**
10. **[FEAT-002] Ekspor Dokumen Word Menggunakan Skema Usang & Tidak Mencakup Seluruh Tabel**
    - `app/api/export/word/route.js:128-185, 253-264`. Terverifikasi kolom `kk_tabungan` terlewat di Pokja IV dan tidak ada generator Word untuk Data Umum, Dawis, serta Bumil. **(VALID)**
11. **[DB-005] Fresh Install Script `supabase_schema.sql` Tidak Lengkap & Konflik dengan v1**
    - `supabase_schema.sql:277`, `supabase_schema_updates.sql:25`. Terverifikasi baris 277 membuat view `data_kegiatan_warga` yang menyebabkan `ALTER TABLE` di pembaruan berikutnya crash. **(VALID)**
12. **[DEVOPS-001] Ketiadaan CI/CD Pipeline Otomatis**
    - Root directory. Terverifikasi tidak ada direktori `.github/workflows/` atau file CI. **(VALID)**

---

### 2.3 Verifikasi Sampel 12 Temuan Sedang & Rendah

- **SEC-005 (Sedang):** `lib/rate-limit.js:17-23` → Ekstraksi elemen pertama `x-forwarded-for` tanpa verifikasi reverse proxy terpercaya. **(VALID)**
- **SEC-006 (Sedang):** `lib/auth.js:173` → Regex `cookieHeader.match(/auth-token=([^;]+)/)` tanpa boundary check. **(VALID)**
- **SEC-007 (Sedang):** `app/api/auth/password/route.js:11`, `app/api/chat/route.js:345` → Rute berat dan sensitif tanpa rate limiting. **(VALID)**
- **ARCH-001 (Sedang):** `components/PokjaDataPage.js:26-80`, `NestedDataPage.js:120-190` → Duplikasi kode state dan layout mobile card. **(VALID)**
- **ARCH-002 (Sedang):** `components/DataEditPage.js:26-71` → `PokjaDataPage.js` (760 baris) adalah dead-code fallback. **(VALID)**
- **PERF-002 (Sedang):** `app/api/export/word/route.js:268-274` → N+1 query dusun di dalam `buildPokjaSection`. **(VALID)**
- **UIUX-004 (Sedang):** `components/NestedDataPage.js:760, 792-794` → Inline style background terang membocorkan warna di dark mode. **(VALID)**
- **UIUX-005 (Rendah):** `components/PokjaDataPage.js:750` → Typo class invalid Tailwind `background-[#f0fdf4]`. **(VALID)**
- **UIUX-006 (Rendah):** `components/OnboardingTour.jsx:34` vs `DashboardToolbar.jsx:142` → Mismatch selector tour vs aria-label select. **(VALID)**
- **UIUX-007 (Rendah):** `tailwind.config.js:3`, `app/globals.css:133, 648` → Typo `darkMode: ['class', 'class']` dan duplikasi CSS sidebar. **(VALID)**
- **UIUX-014 (Sedang):** `components/Topbar.js:71`, `app/dashboard/layout.js:108` → Prop `onOpenPasswordModal` tidak diteruskan ke Topbar. **(VALID)**
- **DB-006 (Sedang):** `supabase_schema_updates_v4.sql:14, 16`, `app/api/admin/users/route.js:182` → Foreign key `report_periods` tanpa `ON DELETE SET NULL`. **(VALID)**

---

## 3. Secret Leakage Verification Report

- Pemindaian menyeluruh dilakukan terhadap berkas `reports/AUDIT_2026-10-12.md` menggunakan pola:
  - `eyJ[A-Za-z0-9_-]+` (Token JWT) → **Nol kecocokan**
  - `AIza[0-9A-Za-z-_]{35}` (Google API Key) → **Nol kecocokan**
  - Supabase Service Role / Anon Keys → **Nol kecocokan**
  - Password produksi / `.env.local` entries → **Nol kecocokan** (hanya memuat teks publik `admin123` yang merujuk akun default ter-seed di skema).
- **Kesimpulan Kebocoran Rahasia:** **100% AMAN & BERSIH (PASSED)**.

---

## 4. Adversarial Stress-Testing & Challenge Evaluation

### Challenge 1: Apakah pembatalan Playwright E2E mengindikasikan kelalaian pengujian?
- **Asumsi Diuji:** Apakah tim auditor seharusnya memaksakan eksekusi Playwright E2E?
- **Analisis Kritis:** File `playwright.config.mjs:7` default mengarah ke domain produksi live Vercel (`https://lumbungdatapkk.vercel.app`). File `crud.spec.mjs` secara eksplisit menulis data uji tahun 2099 ke basis data. Jika auditor memaksakan eksekusi tanpa kredensial lokal terisolasi, hal ini akan **secara langsung melanggar batasan keselamatan #2** (Dilarang menulis ke DB produksi) dan memicu pemblokiran IP penguji oleh `lib/rate-limit.js`.
- **Kesimpulan Challenge:** Pembatalan Playwright E2E oleh tim audit adalah **keputusan teknis yang 100% tepat, berprinsip, dan aman**.

### Challenge 2: Apakah temuan DB-004 (typeof number) benar-benar memicu bug di produksi?
- **Asumsi Diuji:** Mungkinkah PostgreSQL driver (supabase-js / postgrest-js) meng-cast kolom TEXT kembali menjadi number secara otomatis?
- **Analisis Kritis:** Di PostgREST / supabase-js, tipe data kolom dikembalikan persis sesuai tipe SQL aslinya dalam format JSON. Karena kolom diubah menjadi `TEXT` di migrasi `v6.sql`, nilai kembalian PostgreSQL adalah tipe JSON string (misal `"10"`). Di JavaScript, `typeof "10" === 'string'`. Blok `if (typeof v === 'number')` di `app/api/export/excel/route.js:72` dipastikan selalu bernilai `false`.
- **Kesimpulan Challenge:** Bug tersebut **faktual, deterministik, dan berdampak kritis** pada seluruh ekspor data tahunan.

### Challenge 3: Apakah ada risiko bahwa rekomendasi SEC-001 (Enable RLS) mematahkan aplikasi?
- **Asumsi Diuji:** Jika RLS diaktifkan di Supabase, apakah route handler Next.js akan gagal query?
- **Analisis Kritis:** Route handler Next.js di `lib/supabase.js:21` menggunakan `serviceRoleKey`. Di PostgreSQL Supabase, peran `service_role` secara inheren membypass seluruh kebijakan RLS. Sehingga pengaktifan RLS tidak akan mematahkan backend Next.js yang ada, namun secara instan memblokir akses liar via browser anon key.
- **Kesimpulan Challenge:** Rekomendasi audit aman dan tepat sasaran.

---

## 5. Coverage Gaps & Unverified Items

- **Coverage Gaps:** Tidak ada area kritis yang terlewat. Semua 8 aspek telah dianalisis, seluruh 45 file route API terpetakan dalam tabel otorisasi 69 endpoint, dan 63 temuan historis dari 6 dokumen review telah diverifikasi ulang statusnya.
- **Unverified Items:** None. Seluruh temuan kritis dan tinggi serta sampel temuan sedang/rendah telah diverifikasi baris-per-baris.

---

## 6. Rekomendasi Final Verifikator Independen

1. **Setujui Laporan:** Laporan `reports/AUDIT_2026-10-12.md` disetujui penuh untuk dipublikasikan sebagai artefak audit resmi.
2. **Prioritaskan Fase 1:** Tim pengembang disarankan langsung mengeksekusi 10 item darurat pada Fase 1 (khususnya memberi komentar pengaman pada skrip reset operasional `DB-001`, men-drop index duplikat `DB-002`, memperbaiki parser agregasi `DB-004`, dan menambal kolom Pokja II `FEAT-001`).
