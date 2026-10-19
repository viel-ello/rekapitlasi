# Handoff Report — Security & API Authorization Audit (Aspek 1)

**Agent**: `explorer_security_1` (Security & API Authorization Auditor)  
**Parent Conversation ID**: `5958bfee-566f-423e-91c9-c9c4034e8cf9`  
**Working Directory**: `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_security_1`  
**Target Output**: `security_audit.md` (Laporan Lengkap & Matriks Otorisasi 45 Rute)  
**Date**: 2026-10-12  

---

## 1. Observation

1. **Seluruh Rute API (45 Berkas):**
   - Direktori `app/api/**/route.js` memuat tepat 45 berkas rute.
   - Semua rute menerapkan otorisasi internal di handler masing-masing:
     - 9 endpoint admin memakai `requireAdmin(request)` (`admin/backup`, `admin/column-overrides`, `admin/desa`, `admin/dusun`, `admin/logs`, `admin/logs/export`, `admin/users`, `admin/years`) atau custom role check (`admin/columns`).
     - 8 endpoint data utama (`data-umum`, `pokja1`, `pokja2`, `pokja3`, `pokja4`, `kegiatan-warga`, `rekap-dawis`, `bumil`) dibuat menggunakan `createPokjaHandler` di `lib/api-handler.js`.
     - 3 endpoint publik (`public/desa/[id]`, `public/dusun/[id]`, `public/summary`) tidak membutuhkan autentikasi dan menggunakan `supabaseAnon`.
     - Sisa rute memakai `requireAuth(request)` atau `getAuthUser(request)`.
2. **Ketiadaan Database Row Level Security (RLS) di Supabase:**
   - Berkas skema SQL (`supabase_schema.sql` hingga `supabase_schema_updates_v13.sql`) tidak memuat satupun statement `ENABLE ROW LEVEL SECURITY` atau `CREATE POLICY`.
   - `lib/supabase.js:19-20` memuat komentar verbatim:
     `// Service role > anon fallback (RLS tidak aktif pada tabel, sehingga tanpa service role beberapa query admin akan gagal silent...`
   - `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` diekspos ke klien melalui prefix `NEXT_PUBLIC_` (`lib/supabase.js:3-5`).
3. **Bypass Period Lock pada Impor Excel:**
   - Di `app/api/import/confirm/route.js:77`, `importToSupabase` dipanggil tanpa pengecekan status periode.
   - Berkas `lib/excel/importToSupabase.js` melakukan batch upsert langsung ke tabel target (baris 131) tanpa memanggil `checkPeriodLock`.
   - Sebaliknya, `lib/api-handler.js:152` dan `app/api/chat/confirm-mutation/route.js:54` secara ketat memanggil `await checkPeriodLock(canonicalTable, ...)` dan menolak akses jika berstatus `locked`.
4. **PostgREST Filter Injection pada Log Audit:**
   - `app/api/admin/logs/route.js:42` dan `app/api/admin/logs/export/route.js:46` mengeksekusi:
     `query = query.or(\`dusun_nama.eq.\${unitNama},desa_nama.eq.\${unitNama}\`);`
     dengan `unitNama` diambil langsung dari `searchParams.get('dusun') || searchParams.get('desa')` tanpa sanitasi atau escaping.
5. **Formula Injection (CWE-1236) pada Ekspor CSV dan Excel:**
   - `app/api/admin/logs/export/route.js:16-21` mengimplementasikan `csvEscape` tanpa sanitasi karakter inisial formula (`=`, `+`, `-`, `@`, `\t`, `\r`) dan menyisipkan BOM UTF-8 `\uFEFF` untuk Microsoft Excel.
   - `app/api/export/excel/route.js:188, 278, 415, 505, 616, 914` menuliskan nilai field teks `keterangan` (hingga 1000 karakter) langsung ke sel worksheet ExcelJS.
6. **Kelemahan Rate Limiter & IP Extraction:**
   - `lib/rate-limit.js:19` mengekstrak IP via `request.headers.get('x-forwarded-for')?.split(',')[0].trim()`. Nilai ini dapat dipalsukan client tanpa verifikasi *trusted reverse proxy*.
   - Rute `/api/chat` (AI Gemini), `/api/auth/password`, `/api/export/*`, dan `/api/public/*` tidak memiliki rate limiter sama sekali.
7. **Regex Parsing Cookie `auth-token` Kurang Presisi:**
   - `lib/auth.js:173` menggunakan regex `const match = cookieHeader.match(/auth-token=([^;]+)/);` tanpa anchor awal `(?:^|;\s*)`.
8. **Ketiadaan Audit Logging pada Mutasi Pengguna:**
   - `app/api/admin/users/route.js:90-261` (tambah, edit role/password, hapus user) dan `app/api/auth/password/route.js:11-63` tidak memanggil `writeLog`.
   - `app/api/admin/users/route.js:182` mengosongkan `user_id` di `audit_logs` saat user dihapus (`update({ user_id: null })`).

---

## 2. Logic Chain

1. **Dari Observasi 2:** Supabase mengekspos REST API publik untuk setiap project (`https://<id>.supabase.co/rest/v1/...`). Jika RLS di database PostgreSQL tidak aktif dan `anonKey` dibagikan ke client bundle, database Supabase menerima query PostgREST dari pemegang `anonKey` tanpa evaluasi kebijakan baris. Maka, penyerang dapat membaca tabel `users` (password hash) atau memanipulasi data PKK langsung di Supabase tanpa melalui kontrol Next.js.
2. **Dari Observasi 3:** Fitur period lock dirancang untuk membekukan data pelaporan tahun/bulan tertentu. Jika rute form input dan mutasi AI memblokir perubahan pada periode `locked`, namun rute impor Excel (`/api/import/confirm`) tidak memeriksa `checkPeriodLock`, maka setiap operator atau kader dusun yang memiliki file Excel format template dapat mengunggah dan menimpa data pada periode terkunci tersebut.
3. **Dari Observasi 4:** Pustaka `@supabase/supabase-js` meneruskan string di dalam `.or(...)` ke query PostgREST. Dalam PostgREST, karakter koma (`,`) memisahkan kondisi OR dan titik (`.`) memisahkan kolom/operator. Karena `unitNama` disisipkan mentah tanpa escaping, input yang memuat koma atau operator PostgREST akan dievaluasi sebagai klausa filter tambahan oleh PostgREST parser.
4. **Dari Observasi 5:** Microsoft Excel menginterpretasikan sel teks yang diawali dengan tanda `=`, `+`, `-`, atau `@` sebagai formula. Ketika pengguna mengekspor CSV atau file Excel dari aplikasi yang memuat data `keterangan` atau `detail` dari penyerang, membuka file tersebut di Excel dapat memicu eksekusi Dynamic Data Exchange (DDE) atau formula eksfiltrasi data.
5. **Dari Observasi 6:** Serverless route handler di Next.js membaca header HTTP request. Jika header `X-Forwarded-For` dapat diisi bebas oleh client tanpa penimpaan oleh reverse proxy edge yang aman, counter rate limit pada `lib/rate-limit.js` dapat dihindari dengan merotasi nilai header tersebut.

---

## 3. Caveats

1. **Konfigurasi Produksi Supabase Dashboard:** Kami melakukan analisis statis terhadap seluruh 17 skrip migrasi SQL di repositori. Jika di dashboard Supabase produksi administrator secara manual mengaktifkan RLS melalui antarmuka web Supabase UI tanpa mencatatnya di file SQL migrasi, sebagian dari risiko SEC-001 mungkin telah termitigasi di tingkat server Supabase. Namun ketiadaan deklarasi RLS dalam skrip migrasi resmi tetap merupakan cacat konfigurasi arsitektural kritis (*infrastructure-as-code gap*).
2. **Reverse Proxy Hosting:** Evaluasi spoofing `x-forwarded-for` (SEC-005) didasarkan pada implementasi kode aplikasi Next.js. Jika aplikasi di-deploy di Vercel dengan konfigurasi edge yang secara otomatis menimpa header `x-forwarded-for`, tingkat keparahan spoofing dapat berkurang, namun kode aplikasi tetap disarankan menggunakan header platform resmi.

---

## 4. Conclusion

1. **Otorisasi Aplikasi Lapisan Next.js:** Dirancang dan diimplementasikan dengan sangat baik. 45 endpoint API memiliki auth helper yang sesuai, abstraksi `createPokjaHandler` secara konsisten memvalidasi role tabel dan isolasi 9 kader dusun (`canWriteRow`), dan mutasi AI menerapkan pola *dry-run* yang aman dari *prompt injection*.
2. **Celah Keamanan Prioritas Tinggi:**
   - **SEC-001 (Kritis):** Database RLS belum aktif di seluruh skema Supabase.
   - **SEC-002 (Tinggi):** Impor Excel mem-bypass status penguncian periode (*period lock*).
   - **SEC-003 (Tinggi):** PostgREST filter injection pada pencarian log audit.
   - **SEC-004 (Tinggi):** CSV / Formula Injection pada ekspor data.
   - **SEC-005 - SEC-009 (Sedang & Rendah):** Kelemahan IP extraction rate limit, ketiadaan rate limiter pada AI/ekspor, cookie parsing regex, dan ketiadaan audit log manajemen user.
3. Seluruh temuan telah didokumentasikan secara lengkap dalam format terstandar dengan bukti file dan nomor baris valid di:
   `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_security_1\security_audit.md`.

---

## 5. Verification Method

1. **Verifikasi Matriks API:**
   - Periksa 45 file rute dengan `find_by_name` pada `app/api/**/route.js`.
   - Bandingkan setiap rute terhadap tabel matriks di Bab 2 `security_audit.md`.
2. **Verifikasi Ketiadaan RLS Supabase (SEC-001):**
   - Cari string `ROW LEVEL SECURITY` pada seluruh file `.sql`:
     `rg -i "ROW LEVEL SECURITY" .` -> harus menghasilkan 0 match.
   - Periksa `lib/supabase.js:19-20` dan `lib/supabase.js:3-5`.
3. **Verifikasi Period Lock Bypass pada Impor (SEC-002):**
   - Buka `app/api/import/confirm/route.js` dan `lib/excel/importToSupabase.js`.
   - Cari `checkPeriodLock` di kedua berkas -> tidak ada pemanggilan fungsi tersebut.
4. **Verifikasi PostgREST Injection (SEC-003):**
   - Buka `app/api/admin/logs/route.js:42` dan `app/api/admin/logs/export/route.js:46`.
   - Periksa string concatenation pada `query.or(...)`.
5. **Verifikasi Formula Injection (SEC-004):**
   - Buka `app/api/admin/logs/export/route.js:16-21`. Periksa fungsi `csvEscape` yang tidak memfilter awalan `=,+,-,@`.
   - Buka `app/api/export/excel/route.js:188, 278, 415, 505, 616, 914`. Periksa penulisan sel teks `keterangan` langsung tanpa sanitasi.
6. **Verifikasi Regex Cookie (SEC-006):**
   - Buka `lib/auth.js:173`. Periksa regex `/auth-token=([^;]+)/`.
