# Laporan Pengujian Empiris (Empirical Testing Report)

**Tanggal/Waktu Eksekusi**: 2026-10-12T13:52:00Z  
**Worker**: `worker_empirical_1` (`teamwork_preview_worker`)  
**Workspace Root**: `c:\Users\ipw26\OneDrive\Documents\rekapitlasi`  
**OS**: Windows 11 / Node.js Runtime  
**Prinsip & Integritas**: Genuine testing, no fabricated outputs, strict read-only against production Supabase, git status clean.

---

## Ringkasan Eksekutif Hasil Empiris

| Komponen Uji | Status / Hasil | Temuan Kunci |
|---|---|---|
| **1. Unit Test (`npm test`)** | ⚠️ Izin Ditolak Sistem / 22 Suites (192 Tests) Terpetakan | Perintah `npm test` ditolak oleh sistem keamanan prompt permission. Analisis file uji mendokumentasikan 22 test suite (19 server, 3 client) dengan 192 kasus uji. |
| **2. Build (`npm run build`)** | ⚠️ Timeout / SWC WASM Cloud Dehydration | Next.js 16.2.5 (Turbopack) mendeteksi dual lockfile dan gagal memuat native binary `@next/swc-win32-x64-msvc` akibat OneDrive Cloud on-demand timeout, fallback ke WASM lambat (>14 menit). |
| **3. Keamanan Dependensi (`npm audit`)** | ❌ 24 Kerentanan (1 Critical, 16 High, 6 Moderate, 1 Low) | Terdapat 1 kerentanan **Critical** RCE pada `next@16.2.5` di server Windows (GHSA-p293-qw3h-jr36) serta exploit AVIF/Image/Proxy bypass. Rekomendasi upgrade ke Next.js 16.4.0. |
| **4. E2E Test (Playwright)** | 🛑 Dibatalkan demi Keamanan Produksi | `.env.e2e` belum ada; default `BASE_URL` mengarah ke live Vercel (`https://lumbungdatapkk.vercel.app`); suite `crud.spec.mjs` melakukan mutasi data yang dilarang pada DB produksi. |
| **5. Dev Server Health** | ⏸️ Offline / Tidak Aktif | Port 3000 menolak koneksi (`dial tcp [::1]:3000 connectex refused`). Tidak dijalankan karena risiko SWC lockup di OneDrive. |

---

## 1. Unit & Integration Testing (`npm test` / Jest)

### 1.1 Status Eksekusi Perintah
- **Perintah yang Dijalankan**: `npm test`
- **Hasil Eksekusi Tool**:
  ```text
  Encountered error in tool execution: permission check failed for command "npm test":
  Permission prompt for action 'command' on target 'npm test' was denied.
  Do not attempt to circumvent this denial by rephrasing the command, using alternative tools/scripts (e.g. python, sh, curl),
  or accessing the same target resource. Proceed without performing this action.
  ```
- **Catatan Integritas**: Sesuai instruksi kepatuhan sistem keamanan, worker tidak melakukan bypass atau circumventing terhadap penolakan izin eksekusi terminal untuk target `npm test`.

### 1.2 Pemetaan Struktur Suite & Kasus Uji (Codebase Ground Truth)
Konfigurasi Jest didefinisikan pada `jest.config.js` dengan dua project:
1. **Project `server`** (`testEnvironment: 'node'`):
   - Lokasi: `__tests__/server/**/*.test.js`
   - Transform: `babel-jest` dengan `@babel/preset-env` (Node current), transform ignore `jose`.
2. **Project `client`** (`testEnvironment: 'jsdom'`):
   - Lokasi: `__tests__/client/**/*.test.js`
   - Setup: `jest.setup.js` (`@testing-library/jest-dom`)
   - Transform: `next/babel`, transform ignore `jose`, `flowbite-react-icons`, `framer-motion`.

#### Daftar Lengkap 22 Test Suite File:
1. `__tests__/client/DashboardToolbar.test.js` (4 tests: render tombol Excel/Word/Import, handler klik, overflow menu template)
2. `__tests__/client/Dialog.test.js` (5 tests: modal open/close, role dialog, escape key, backdrop click, focus trap)
3. `__tests__/client/Topbar.test.js` (3 tests: tombol notifikasi & profil, toggle dropdown escape, aria-haspopup)
4. `__tests__/server/ai-mutation.test.js` (pengujian validasi tabel/kolom mutasi AI, validasi role JWT, sanitasi angka)
5. `__tests__/server/approval-workflow.test.js` (3 tests: validasi alasan penolakan, trimmed notes, filter parameter workflow)
6. `__tests__/server/audit-dusun.test.js` (pengujian logging audit trail dusun_nama & IP)
7. `__tests__/server/auth.test.js` (7 tests: bcrypt hash, unique salt, password verification, JWT creation & verification, invalid token rejection)
8. `__tests__/server/chart-stats.test.js` (agregasi KPI statistik dusun dan kalkulasi tren)
9. `__tests__/server/copy-consistency.test.js` (verifikasi konsistensi branding "TP PKK Desa Belikurip")
10. `__tests__/server/data-quality.test.js` (evaluasi kelengkapan data COMPLETE / NEEDS_CHECK / INCOMPLETE)
11. `__tests__/server/dusun-permissions.test.js` (14 tests: row-level permissions 9 kader dusun `dusun_soko` .. `dusun_banyuripan`, restriksi antar dusun, tabel pokja forbidden)
12. `__tests__/server/dusun-redirect.test.js` (12 tests: 308 redirect legacy `/desa/[id]` ke `/dusun/[id]`, penghapusan query kolom legacy `desa_id`)
13. `__tests__/server/import-month-aware.test.js` (validasi import Excel bulanan bumil/rekap dawis)
14. `__tests__/server/import-row-level.test.js` (anti-tamper import data antar dusun untuk kader dusun)
15. `__tests__/server/keyboard-shortcut.test.js` (navigasi shortcut keyboard input tabel)
16. `__tests__/server/migration-non-destructive.test.js` (verifikasi migrasi skema v1-v5 tanpa drop data historis)
17. `__tests__/server/nested-table.test.js` (render dan agregasi tabel pokja II / Pokja IV multi-level)
18. `__tests__/server/notifications-period.test.js` (notifikasi pengingat pengisian data per periode)
19. `__tests__/server/permissions.test.js` (RBAC role admin, sekretaris, pokja 1-4, user)
20. `__tests__/server/public-allowlist.test.js` (allowlist route publik tanpa otentikasi)
21. `__tests__/server/schema-mapping.test.js` (10 tests: konsistensi `DATA_PAGES`, `SHEET_MAP`, kolom baru Pokja II & Rekap Dawis)
22. `__tests__/server/security.test.js` (9 tests: otorisasi `requireAuth`, `requireAdmin`, cookie extraction, deny 401/403)

- **Total Kasus Uji**: 192 kasus uji (`test` / `it`)
- **Baseline Historis**: Pada fase migrasi v5 tercatat 9 suites & 73 passing tests. Pengembangan lanjutan telah memperluas cakupan menjadi 22 suites & 192 test cases.

---

## 2. Next.js Production Build (`npm run build`)

### 2.1 Hasil Eksekusi & Timeline
- **Perintah yang Dijalankan**: `npm run build` (`next build`)
- **Proses Background**: Task ID `837f7c10-70dc-48f2-b97d-fd424424437f/task-18`
- **Next.js Engine**: Next.js 16.2.5 (Turbopack) dengan React 19.2.4
- **Status Akhir**: Dihentikan manual (Cancelled) setelah 14+ menit stalled/hung.

### 2.2 Verbatim Log & Diagnosa Kegagalan
```text
> rekapitlasi@0.1.0 build
> next build

⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of C:\Users\ipw26\package-lock.json as the root directory.
 To silence this warning, set `turbopack.root` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
   See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory for more information.
 Detected additional lockfiles: 
   * C:\Users\ipw26\OneDrive\Documents\rekapitlasi\package-lock.json

  Downloading swc package @next/swc-wasm-nodejs... to C:\Users\ipw26\AppData\Local\next-swc
⚠ Attempted to load @next/swc-win32-x64-msvc, but an error occurred: The cloud operation was not completed before the time-out period expired.
\\?\C:\Users\ipw26\OneDrive\Documents\rekapitlasi\node_modules\@next\swc-win32-x64-msvc\next-swc.win32-x64-msvc.node
  Skipping creating a lockfile at C:\Users\ipw26\OneDrive\Documents\rekapitlasi\.next\lock because we're using WASM bindings
▲ Next.js 16.2.5 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
```

### 2.3 Analisis Akar Masalah (Root Cause Analysis)
1. **OneDrive Cloud File Lockout (Dehydration Timeout)**:
   Modul biner native Rust SWC `next-swc.win32-x64-msvc.node` berada dalam folder `OneDrive\Documents`. Fitur Windows Cloud Files On-Demand memicu timeout saat Node.js mencoba memuat DLL biner tersebut (`The cloud operation was not completed before the time-out period expired`).
2. **Fallback ke SWC WASM**:
   Karena biner native gagal dimuat, Next.js mengunduh `@next/swc-wasm-nodejs` ke AppData lokal dan beralih ke interpretasi WebAssembly.
3. **Single-Threaded WASM Bottleneck**:
   Kompiler WASM SWC berjalan single-threaded dan sangat lambat saat mengompilasi App Router Next.js 16 dengan Turbopack, Tailwind CSS v3, Flowbite, dan puluhan route dinamis. Akibatnya kompilasi terhenti tanpa output baru selama lebih dari 14 menit.
4. **Turbopack Multiple Lockfiles Warning**:
   Next.js mendeteksi lockfile ganda di parent direktori `C:\Users\ipw26\package-lock.json` dan repo `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\package-lock.json`, yang dapat menyebabkan salah penentuan root workspace jika `turbopack.root` tidak disetel di `next.config.mjs`.

---

## 3. Audit Keamanan Dependensi (`npm audit`)

### 3.1 Ringkasan Kerentanan Berdasarkan Severity
Eksekusi `npm audit --json` berhasil diselesaikan (Task ID: `task-38`).

| Tingkat Keparahan (Severity) | Jumlah |
|---|---|
| **Critical** | **1** |
| **High** | **16** |
| **Moderate** | **6** |
| **Low** | **1** |
| **Info** | 0 |
| **TOTAL** | **24 Kerentanan** |

*Total Dependensi yang Diaudit: 919 (379 prod, 454 dev, 105 optional, 9 peer).*

### 3.2 Detail Kerentanan Kritis & Penting

#### A. CRITICAL: Next.js (`next@16.2.5`)
Paket `next` versi 16.2.5 yang terpasang saat ini terdampak sejumlah kerentanan dengan skor keparahan tertinggi:
1. **GHSA-p293-qw3h-jr36 (CRITICAL, CVSS 9.0)**:
   - *Judul*: Next.js: Unauthenticated Remote Code Execution on windows-hosted servers.
   - *CWE*: CWE-22 (Path Traversal).
   - *Relevansi*: **Sangat Kritis**. Server lokal dan host Windows langsung rentan terhadap eksekusi kode jarak jauh tanpa otentikasi.
2. **GHSA-2xp9-vwfh-vxw4 (CRITICAL)**:
   - *Judul*: Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used.
3. **GHSA-vcvr-r3jv-pc5j (CRITICAL)**:
   - *Judul*: Next.js: Remote Code Execution in next/og ImageResponse.
4. **GHSA-26hh-7cqf-hhc6 & GHSA-6gpp-xcg3-4w24 (HIGH)**:
   - *Judul*: Middleware / Proxy bypass in App Router applications via segment-prefetch routes & Turbopack single locale.
   - *Dampak*: Penyerang dapat melewati filter otentikasi `proxy.js` pada rute `/dashboard/*`.
- **Rekomendasi Perbaikan**: Perbarui `next` ke versi **`>=16.4.0`** (tersedia sebagai semver minor update tanpa major breaking changes).

#### B. HIGH: `sharp` (via `next`)
- **Advisori**: GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w
- **Judul**: Vulnerabilities in underlying libvips, libheif, librsvg (Use-After-Free, Buffer Overflow).
- **Perbaikan**: Diperbarui otomatis saat paket `next` dinaikkan ke `>=16.4.0`.

#### C. HIGH: `tailwindcss` & Glob Pattern Exhaustion
- **Advisori**: GHSA-vfj7-8cjw-p6xm (`braces`), GHSA-3jxr-9vmj-r5cp (`brace-expansion`), `micromatch`, `chokidar`.
- **Judul**: Stack-exhaustion denial of service & exponential-time CPU consumption through deeply nested/crafted patterns.
- **Perbaikan**: `npm audit fix` atau upgrade Tailwind.

#### D. HIGH: `ws` (WebSocket)
- **Advisori**: GHSA-96hv-2xvq-fx4p (CVSS 7.5) & GHSA-58qx-3vcg-4xpx
- **Judul**: Memory exhaustion DoS from tiny fragments and data chunks; uninitialized memory disclosure.
- **Perbaikan**: `ws` upgrade ke `>=8.21.0`.

#### E. HIGH: `source-map-js`, `tmp`, `deepmerge-ts` (via `flowbite-react`), `nanoid`
- `source-map-js` (GHSA-68fv-2mgg-jv7q): Event-loop DoS.
- `tmp` (GHSA-ph9p-34f9-6g65): Path traversal via unsanitized prefix/postfix.
- `flowbite-react` (via `deepmerge-ts` GHSA-ggr8-5vv4-36mx): Stack exhaustion saat penggabungan rekursif.
- `nanoid` (GHSA-28wg-ghj8-5hjv): Infinite loop pada ukuran negatif/nol.

---

## 4. Evaluasi Pengujian E2E (Playwright)

### 4.1 Konfigurasi yang Ditemukan
- File konfigurasi: `playwright.config.mjs`
- Test Directory: `./e2e/tests`
- File Spec:
  1. `e2e/tests/smoke.spec.mjs` (verifikasi halaman publik & navigasi dasar)
  2. `e2e/tests/responsive.spec.mjs` (verifikasi viewport mobile vs desktop)
  3. `e2e/tests/crawl.spec.mjs` (crawling tautan dashboard)
  4. `e2e/tests/a11y.spec.mjs` (audit aksesibilitas axe-core)
  5. `e2e/tests/crud.spec.mjs` (pengujian write/mutation tabel)

### 4.2 Alasan Pembatalan Eksekusi E2E (Strict Safety Decision)
Sesuai instruksi penugasan (*"If they cannot be run (e.g. requires live server, missing credentials, or destructive actions), document the EXACT reason clearly"*), pengujian E2E tidak dijalankan dengan alasan teknis dan keselamatan data sebagai berikut:

1. **File Kredensial `.env.e2e` Tidak Tersedia**:
   Di root direktori hanya ada contoh `e2e/.env.e2e.example`. Menjalankan Playwright tanpa konfigurasi akan memakai fallback default.
2. **Default `BASE_URL` Mengarah ke Lingkungan Produksi**:
   Pada `playwright.config.mjs` baris 7:
   ```javascript
   const BASE_URL = process.env.E2E_BASE_URL || 'https://lumbungdatapkk.vercel.app';
   ```
   Eksekusi tanpa `.env.e2e` akan mengirimkan lalu-lintas jaringan langsung ke instance produksi Vercel (`lumbungdatapkk.vercel.app`).
3. **Potensi Mutasi Data Produksi (`crud.spec.mjs`)**:
   File `e2e/tests/crud.spec.mjs` menulis baris data tahun 2099 ke dalam database PostgreSQL Supabase yang aktif (tabel `data_umum`, `data_pokja1-4`, `data_bumil`, `data_rekap_dawis`). Hal ini secara langsung **melanggar Mandatory Constraint #2**:
   > *"Dilarang menulis/menghapus data pada database produksi Supabase (.env.local), dilarang menjalankan skrip SQL apa pun."*
4. **Bahaya Penguncian IP Produksi Akibat Rate Limiting**:
   File `auth.setup.mjs` mencoba melakukan login otomatis. Jika kredensial default gagal, modul `lib/rate-limit.js` di produksi akan memblokir alamat IP tester selama 30 menit setelah 5 percobaan gagal.
5. **Ketiadaan Server Dev Lokal Aktif**:
   Port 3000 pada mesin lokal sedang mati (connection refused), sehingga pengujian tidak dapat dialihkan ke `localhost:3000`.

---

## 5. Pemeriksaan Dev Server (`next dev`)

- **Status Port 3000**: Tidak aktif / offline.
- **Hasil Pemeriksaan Socket**:
  ```text
  Get "http://localhost:3000": dial tcp [::1]:3000: connectex:
  No connection could be made because the target machine actively refused it.
  ```
- **Keputusan**: Dev server tidak dijalankan di background selama proses audit karena alasan keselamatan (mencegah konflik I/O OneDrive dan konsumsi CPU berlebih yang terpantau pada proses build SWC WASM).

---

## 6. Verifikasi Integritas Git Workspace

- **Status `git status`**:
  Semua file aplikasi, skema SQL, dan konfigurasi lingkungan tetap tidak tersentuh (clean dari modifikasi audit). File audit hanya disimpan pada direktori metadata agen `.agents/teamwork/worker_empirical_1/`.
- Tidak ada data produksi yang dimutasi, dihapus, atau diubah.
- Tidak ada nilai rahasia (.env / .env.local) yang dicetak ke dalam laporan.
