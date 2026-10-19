# LAPORAN AUDIT: KUALITAS KODE, ARSITEKTUR, PERFORMA, DATABASE, DAN DEVOPS
**Aplikasi:** Lumbung Data PKK — TP PKK Desa Belikurip  
**Auditor:** Architecture, DB & DevOps Auditor (`explorer_arch_db_1`)  
**Tanggal:** 12 Oktober 2026  
**Status Audit:** Selesai (Read-Only)  
**Lingkup:** Aspek 2 (Kualitas Kode & Arsitektur), Aspek 3 (Performa), Aspek 7 (Skema/DB & Migrasi v1–v13), Aspek 8 (DevOps & Dokumentasi)

---

## 1. Ringkasan Eksekutif

Audit mendalam terhadap arsitektur kode, performa, basis data, dan kesiapan operasional aplikasi web Lumbung Data PKK Desa Belikurip (Next.js 16.2.5, PostgreSQL/Supabase, JWT Auth) telah dilakukan.

### Hasil Utama & Temuan Kunci:
1. **Integritas Basis Data & Migrasi (Aspek 7):**
   - **Kritis (DB-001):** File `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql` memuat statement `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` yang **aktif (tanpa komentar)**, berisiko menghapus seluruh data operasional jika dijalankan tanpa sengaja di Supabase SQL Editor.
   - **Kritis (DB-002):** Terjadi inkonsistensi conflict target PostgREST: Index unik `data_umum_dusun_tahun_uidx` pada `(dusun_id, tahun)` yang dibuat di `v11` **tidak di-drop** di migrasi `v12` saat `data_umum` diubah menjadi bulanan. Ini akan memicu error `duplicate key value violates unique constraint` jika user menginput data bulan ke-2 untuk dusun dan tahun yang sama.
   - **Kritis (DB-003):** Migrasi `v4` menggunakan `CREATE TABLE IF NOT EXISTS report_periods`. Jika database sebelumnya sudah menjalankan `v2` (yang membuat `report_periods` tanpa kolom `status`), eksekusi `v4` akan NO-OP sehingga kolom `status`, `submitted_by`, dll. tidak pernah dibuat.
   - **Kritis (DB-004):** Silent bug pada ekspor Excel tahunan (`app/api/export/excel/route.js:72`) di mana agregasi multi-bulan memeriksa `if (typeof v === 'number')`. Sejak migrasi `v6`, semua kolom numerik ber-tipe `TEXT`, sehingga kondisi ini selalu bernilai `false` dan nilai antar bulan tidak pernah dijumlahkan!

2. **Performa & Pola Query (Aspek 3):**
   - **Tinggi (PERF-001):** Endpoint dashboard `/api/rekap` menjalankan hingga **23 query HTTP sekuensial/paralel** ke Supabase dalam satu request, di mana 7 query tahun berjalan diulang kembali secara redundan di bagian kelengkapan data.
   - **Tinggi (PERF-003):** Seluruh tabel data operasional (`data_umum`, `data_pokja1-4`, `data_bumil`, `data_rekap_dawis`) **tidak memiliki database index pada kolom `tahun`**, memicu sequential scan penuh pada setiap request dashboard, agregasi trend, dan ekspor.

3. **Kualitas Kode & Arsitektur (Aspek 2):**
   - **Tinggi (ARCH-003):** Ekspor dokumen Word (`app/api/export/word/route.js`) masih memakai kolom-kolom usang Pokja II yang telah di-drop di migrasi `v5` (`rumah_dilan`, `kampung_mandiri`, dll.) dan tidak memuat 13 kolom Pokja II yang baru, serta sama sekali tidak mengekspor Data Umum, Dawis, dan Bumil.
   - **Sedang (ARCH-001 & ARCH-002):** Duplikasi kode masif pada komponen tabel input (`PokjaDataPage.js` 760 baris, `BumilDataPage.js` 699 baris, `NestedDataPage.js` 809 baris), sementara `PokjaDataPage.js` sendiri sebenarnya sudah menjadi dead code/fallback yang jarang dieksekusi.

4. **DevOps & Dokumentasi (Aspek 8):**
   - **Tinggi (DEVOPS-001):** Ketiadaan CI/CD pipeline otomatis (GitHub Actions) sehingga pengujian unit, integritas build, dan security audit hanya berjalan manual di mesin lokal developer.
   - **Sedang (DEVOPS-003):** Ketiadaan otomasi backup terjadwal untuk Supabase Free Plan, menimbulkan ketergantungan 100% pada backup manual manusia sebelum migrasi/perubahan data.

---

## 2. Daftar Temuan Baru Berdasarkan 4 Aspek

### ASPEK 2: KUALITAS KODE & ARSITEKTUR (ARCH)

#### [ARCH-001] Duplikasi Kode Ekstensif di Komponen Tabel Data (PokjaDataPage, BumilDataPage, NestedDataPage)
- **ID:** `ARCH-001`
- **Aspek:** Kualitas Kode & Arsitektur
- **Severity:** Sedang
- **Lokasi:**
  - `components/PokjaDataPage.js:26-80`
  - `components/BumilDataPage.js:80-140`
  - `components/NestedDataPage.js:120-190`
- **Deskripsi Masalah:**
  Ketiga komponen mendefinisikan ulang state management dan side-effects yang hampir identik:
  - Deklarasi state identik: `dusun`, `data`, `prevYearData`, `tahun`, `bulan`, `saving`, `saveStatus`, `toast`, `canEdit`, `userRole`, `userDusunId`, `dynamicColumns`, `overrides`, `searchQuery`, `onlyIssues`, `confirmSaveAll`, `initialLoading`, `expandedIds`.
  - Logika fetching data berulang: `fetchDusun`, `checkPermission`, `fetchDynamicColumns`, `fetchOverrides`, `fetchData`.
  - Logika mobile entry card: perulangan ratusan baris kode untuk card layout, expandable accordion per dusun, auto-scroll recovery (`captureScrollState` / `restoreScrollState`), dan handler shortcut keyboard `Ctrl+S`.
- **Dampak:**
  Beban pemeliharaan tinggi; perbaikan bug tampilan atau fungsionalitas di satu halaman harus disalin manual ke dua halaman lainnya. Ukuran bundle client membesar karena duplikasi logic yang tidak diekstrak.
- **Rekomendasi Konkret:**
  Ekstrak custom hook reusable `useTableDataEntry({ tableName, apiEndpoint, hasMonth })` yang mengelola data fetching, dirty tracking, permission check, dan save handler. Ekstrak sub-komponen `<MobileDataEntryCards />` bersama.

---

#### [ARCH-002] Redundansi Komponen PokjaDataPage.js sebagai Dead Code Fallback
- **ID:** `ARCH-002`
- **Aspek:** Kualitas Kode & Arsitektur
- **Severity:** Sedang
- **Lokasi:**
  - `components/DataEditPage.js:26-71`
  - `components/PokjaDataPage.js:1-760`
- **Deskripsi Masalah:**
  Di `components/DataEditPage.js`, routing halaman edit per tabel mendistribusikan semua tabel resmi ke komponen dedicated:
  - `data_bumil` → `BumilDataPage`
  - `data_rekap_dawis` → `RekapDawisDataPage` (via `NestedDataPage`)
  - `data_pokja1` s/d `data_pokja4` → `Pokja1DataPage` s/d `Pokja4DataPage` (via `NestedDataPage`)
  - `data_umum` → `DataUmumDataPage` (via `NestedDataPage`)
  `PokjaDataPage.js` (760 baris, ~35KB) hanya menjadi fallback paling akhir untuk tabel hipotetis tanpa custom layout. Faktanya tidak ada tabel flat lain di aplikasi PKK Desa Belikurip.
- **Dampak:**
  Mempertahankan 760 baris kode yang hampir tidak pernah dieksekusi pengguna akhir, menciptakan kebingungan arsitektural dan beban kognitif pada audit & maintenance.
- **Rekomendasi Konkret:**
  Refactor `PokjaDataPage.js` menjadi wrapper tipis di atas `NestedDataPage` dengan single-level header, atau hapus fallback flat table dan arahkan seluruh rendering data ke `NestedDataPage`.

---

#### [ARCH-003] Word Export Masih Menggunakan Kolom Legacy Pokja II yang Dihapus & Mengabaikan Tabel Bulanan
- **ID:** `ARCH-003`
- **Aspek:** Kualitas Kode & Arsitektur
- **Severity:** Tinggi
- **Lokasi:**
  - `app/api/export/word/route.js:144-180`
  - `app/api/export/word/route.js:363-374`
- **Deskripsi Masalah:**
  1. Pada `app/api/export/word/route.js:168-180`, definisi `flatKeys` dan header Pokja II masih memuat 6 kolom legacy yang sudah di-drop di migrasi `v5` (`rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`). Sebaliknya, 13 kolom resmi Pokja II yang baru (`jml_warga_3_buta`, `kf_klp`, `kf_wrg`, `paud_sejenis`, `bkb_klp`, `bkb_ape_set_a/b`, `kader_tutor_kf/paud`, `kader_bkb`, `yg_dilatih_lp3pkk/tp3pkk/damaspkk`) sama sekali tidak ada di ekspor Word.
  2. Word export HANYA mengekspor array `POKJA_DEFS` (Pokja I–IV). Tabel Data Umum, Data Rekap Dawis, dan Data Bumil sama sekali tidak ada dalam dokumen Word yang dihasilkan.
- **Dampak:**
  Dokumen Word yang diunduh user untuk Pokja II menampilkan kolom yang tidak valid dengan nilai 0/kosong, sementara data Pokja II yang sebenarnya diinput user tidak tercetak. Dokumen Word tidak dapat dijadikan laporan fisik resmi PKK Desa.
- **Rekomendasi Konkret:**
  1. Sinkronkan definisi header dan `flatKeys` Pokja II di `app/api/export/word/route.js` dengan `DATA_PAGES.pokja2` dan skema `v5`.
  2. Tambahkan seksi pembuatan tabel Word untuk Data Umum, Rekap Dawis, dan Data Bumil agar dokumen Word setara kelengkapannya dengan ekspor Excel.

---

#### [ARCH-004] Residu Naming Konvensi Lama & Hardcoded Wilayah pada Export Filename
- **ID:** `ARCH-004`
- **Aspek:** Kualitas Kode & Arsitektur
- **Severity:** Rendah
- **Lokasi:**
  - `app/dashboard/page.js:205`
  - `app/dashboard/admin/_components/DesaTab.jsx:1`
- **Deskripsi Masalah:**
  1. Di `app/dashboard/page.js:205`, nama file download Excel default masih hardcoded:
     `Rekapitulasi_PKK_Baturetno_${tahun}.xlsx` (merujuk ke lingkup lama Kecamatan Baturetno, bukan Desa Belikurip).
  2. Komponen tab admin di `app/dashboard/admin/_components/DesaTab.jsx` masih bernama `DesaTab` meskipun unit operasionalnya sudah bermigrasi penuh ke Dusun.
- **Dampak:**
  Inkonsistensi identitas aplikasi pada file yang diunduh kader/pengurus desa.
- **Rekomendasi Konkret:**
  Ubah nama file export menjadi `Rekapitulasi_PKK_Belikurip_${tahun}.xlsx` (atau gunakan `BRAND.fullTitle`) dan rename `DesaTab.jsx` menjadi `DusunTab.jsx`.

---

#### [ARCH-005] Silent Error Catching pada API Handler Admin
- **ID:** `ARCH-005`
- **Aspek:** Kualitas Kode & Arsitektur
- **Severity:** Sedang
- **Lokasi:**
  - `app/api/admin/dusun/route.js:23, 57`
  - `app/api/admin/desa/route.js:26, 59`
  - `app/api/admin/users/route.js:85, 140, 192, 257`
- **Deskripsi Masalah:**
  Sejumlah route handler admin menangkap error menggunakan blok `catch {}` kosong atau `catch (error) {}` tanpa mencatat log error ke konsol (`console.error`).
- **Dampak:**
  Jika terjadi kegagalan koneksi database, skema rusak, atau constraint error saat admin membuat/mengedit pengguna atau dusun, server merespons 500 tanpa ada jejak log di terminal/Vercel Logs, menyulitkan troubleshooting operasional.
- **Rekomendasi Konkret:**
  Tambahkan `console.error('[Admin API Error] <endpoint>:', error);` di seluruh blok catch handler admin.

---

### ASPEK 3: PERFORMA (PERF)

#### [PERF-001] Redundansi Query Ekstrem (23 Query Supabase) pada Endpoint Dashboard /api/rekap
- **ID:** `PERF-001`
- **Aspek:** Performa
- **Severity:** Tinggi
- **Lokasi:**
  - `app/api/rekap/route.js:59-295`
- **Deskripsi Masalah:**
  Satu panggilan ke `GET /api/rekap` menjalankan hingga 23 query REST API terpisah ke Supabase:
  - Baris 60-178: Fetch `dusun`, `data_umum`, `data_pokja1`, `data_pokja2`, `data_pokja3`, `data_pokja4`, `data_bumil`, `data_rekap_dawis`, dan `table_column_overrides` (9 query).
  - Baris 264-295 (`tableChecks` untuk completeness): Menjalankan loop pada 7 tabel operasional yang masing-masing menjalankan `Promise.all([fetchRows(tahun), fetchRows(tahun - 1)])` (14 query tambahan).
  Data tahun berjalan untuk ke-7 tabel tersebut sebenarnya **sudah di-fetch dan berada di memori** pada baris 60-178, namun di-query ulang dari database.
- **Dampak:**
  Latensi endpoint dashboard menjadi tinggi (terakumulasi dari 23 network round-trips ke Supabase), menghabiskan waktu eksekusi serverless function Vercel, dan memboroskan kuota API Supabase.
- **Rekomendasi Konkret:**
  1. Re-use data array yang sudah di-fetch di baris 60-178 (`umumList`, `p1List`, `p2List`, dsb.) untuk evaluasi `currentRows` pada completeness check.
  2. Batch query data tahun sebelumnya (`tahun - 1`) atau jalankan secara selektif hanya jika tabel aktif dipilih. Ini memotong jumlah query dari 23 menjadi 10 query.

---

#### [PERF-002] N+1 Query Pola Berulang pada Word Export
- **ID:** `PERF-002`
- **Aspek:** Performa
- **Severity:** Sedang
- **Lokasi:**
  - `app/api/export/word/route.js:268-274`
  - `app/api/export/word/route.js:363-374`
- **Deskripsi Masalah:**
  Fungsi `buildPokjaSection(pokja, tahun)` dipanggil di dalam loop `for (const pokja of POKJA_DEFS)` (4 iterasi). Di dalam fungsi tersebut (baris 269-273), dilakukan query `supabase.from('dusun').select(...)` di setiap iterasi pokja.
- **Dampak:**
  Tabel master `dusun` di-query 4 kali secara redundan pada setiap proses generate dokumen Word.
- **Rekomendasi Konkret:**
  Pindahkan pemanggilan `supabase.from('dusun')` ke luar loop (level `GET` handler) dan oper data `dusunList` sebagai parameter ke `buildPokjaSection`.

---

#### [PERF-003] Ketiadaan Index pada Kolom Filter Kritis (tahun) di Seluruh Tabel Data Operasional
- **ID:** `PERF-003`
- **Aspek:** Performa
- **Severity:** Tinggi
- **Lokasi:**
  - `supabase_schema.sql:45-273`
  - Seluruh file migrasi `supabase_schema_updates_v*.sql`
- **Deskripsi Masalah:**
  Tabel `data_umum`, `data_pokja1`, `data_pokja2`, `data_pokja3`, `data_pokja4`, `data_rekap_dawis`, dan `data_bumil` selalu difilter menggunakan klausul `WHERE tahun = $1` atau `WHERE tahun IN ($1, $2, ...)` (pada dashboard, export, trend, dan report builder). Namun tidak ada satu pun index yang dibuat pada kolom `tahun`.
  Index unik yang ada adalah composite dengan `dusun_id` di posisi pertama: `UNIQUE(dusun_id, tahun)` atau `UNIQUE(dusun_id, tahun, bulan)`. Di PostgreSQL, index B-tree komposit dengan kolom awal `dusun_id` tidak dapat digunakan secara efisien oleh query optimizer ketika filter hanya menyebutkan `tahun`.
- **Dampak:**
  PostgreSQL dipaksa melakukan Sequential Scan (pembacaan seluruh baris tabel) pada setiap agregasi tahunan dashboard, ekspor, dan perhitungan statistik kelengkapan data.
- **Rekomendasi Konkret:**
  Tambahkan index B-tree pada kolom tahun dan tahun+bulan:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_data_umum_tahun_bulan ON data_umum(tahun, bulan);
  CREATE INDEX IF NOT EXISTS idx_data_pokja1_tahun ON data_pokja1(tahun);
  CREATE INDEX IF NOT EXISTS idx_data_pokja2_tahun ON data_pokja2(tahun);
  CREATE INDEX IF NOT EXISTS idx_data_pokja3_tahun ON data_pokja3(tahun);
  CREATE INDEX IF NOT EXISTS idx_data_pokja4_tahun ON data_pokja4(tahun);
  CREATE INDEX IF NOT EXISTS idx_data_rekap_dawis_tahun_bulan ON data_rekap_dawis(tahun, bulan);
  CREATE INDEX IF NOT EXISTS idx_data_bumil_tahun_bulan ON data_bumil(tahun, bulan);
  ```

---

#### [PERF-004] Static Import Komponen Berat di Root Dashboard Layout
- **ID:** `PERF-004`
- **Aspek:** Performa
- **Severity:** Sedang
- **Lokasi:**
  - `app/dashboard/layout.js:7, 9, 114-116`
- **Deskripsi Masalah:**
  Komponen `AiChatBubble` (yang memuat `react-markdown`, sub-komponen chat, upload Excel parser, dan mutation preview modal) serta `OnboardingTour` di-import secara statis di `app/dashboard/layout.js`.
- **Dampak:**
  Library `react-markdown` dan seluruh kode modal preview chat masuk ke dalam chunk JS awal setiap halaman dashboard, meningkatkan First Load JS dan Total Blocking Time (TBT) untuk semua user, meskipun user tidak membuka panel AI chat.
- **Rekomendasi Konkret:**
  Gunakan dynamic import dari Next.js:
  ```jsx
  import dynamic from 'next/dynamic';
  const AiChatBubble = dynamic(() => import('@/components/AiChatBubble'), { ssr: false });
  const OnboardingTour = dynamic(() => import('@/components/OnboardingTour'), { ssr: false });
  ```

---

### ASPEK 7: SKEMA/DB & MIGRASI V1–V13 (DB)

#### [DB-001] Script Reset Operasional Memuat Statement TRUNCATE CASCADE Aktif Tanpa Komentar
- **ID:** `DB-001`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Kritis
- **Lokasi:**
  - `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql:65-76`
- **Deskripsi Masalah:**
  Pada file `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql`, baris 65–76 memuat statement:
  ```sql
  TRUNCATE TABLE
    data_umum, data_pokja1, data_pokja2, data_pokja3, data_pokja4,
    data_rekap_dawis, data_bumil, audit_logs, notifications, rate_limits
  RESTART IDENTITY CASCADE;
  ```
  Statement ini ditulis secara **AKTIF (uncommented)**. Pada file destruktif lain (`v5_destructive.sql` dan `v6_reset.sql`), perintah destruktif sengaja di-comment demi keamanan.
- **Dampak:**
  Jika admin atau DBA membuka file ini di Supabase SQL Editor dan tidak sengaja menekan tombol "Run" atau shortcut `Ctrl+Enter`, seluruh data kegiatan warga, rekap pokja, ibu hamil, audit log historis, dan notifikasi akan terhapus seketika tanpa konfirmasi.
- **Rekomendasi Konkret:**
  Beri komentar (`--`) pada blok `TRUNCATE TABLE` seperti pada `v6_reset.sql`, atau tambahkan statement pengaman `DO $$ BEGIN RAISE EXCEPTION 'Hapus baris pengaman ini sebelum eksekusi manual'; END $$;` di awal query.

---

#### [DB-002] Index Unik data_umum_dusun_tahun_uidx dari v11 Tidak Di-Drop saat v12 Mengubah data_umum Menjadi Bulanan
- **ID:** `DB-002`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Kritis
- **Lokasi:**
  - `supabase_schema_updates_v11.sql:81`
  - `supabase_schema_updates_v12.sql:58-75`
- **Deskripsi Masalah:**
  1. Pada `supabase_schema_updates_v11.sql:81`, dieksekusi helper yang membuat index unik:
     `CREATE UNIQUE INDEX data_umum_dusun_tahun_uidx ON public.data_umum (dusun_id, tahun);`
  2. Pada `supabase_schema_updates_v12.sql`, `data_umum` diubah menjadi tabel per-bulan (12 baris per dusun per tahun). Pada baris 58–75, skrip mencoba men-drop constraint lama:
     ```sql
     IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'data_umum_dusun_tahun_uniq') THEN
       ALTER TABLE data_umum DROP CONSTRAINT data_umum_dusun_tahun_uniq;
     END IF;
     ```
     Skrip hanya memeriksa tabel `pg_constraint` dengan nama `data_umum_dusun_tahun_uniq` dan `data_umum_dusun_id_tahun_key`. Index `data_umum_dusun_tahun_uidx` yang dibuat di v11 via `CREATE UNIQUE INDEX` **TIDAK di-drop**.
- **Dampak:**
  Index unik pada `(dusun_id, tahun)` tetap aktif di database. Ketika user atau sistem mencoba menginput data bulan ke-2 (atau bulan apa pun selain bulan pertama) untuk dusun yang sama pada tahun berjalan, PostgreSQL akan melempar error:
  `ERROR: duplicate key value violates unique constraint "data_umum_dusun_tahun_uidx"`
  Akibatnya penyimpanan data umum bulanan akan gagal (HTTP 500).
- **Rekomendasi Konkret:**
  Buat skrip migrasi perbaikan yang menjalankan:
  ```sql
  DROP INDEX IF EXISTS public.data_umum_dusun_tahun_uidx;
  ```

---

#### [DB-003] Migrasi v4 Berisiko NO-OP Akibat CREATE TABLE IF NOT EXISTS Menimpa Skema v2
- **ID:** `DB-003`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Kritis
- **Lokasi:**
  - `supabase_schema_updates_v2.sql:43-52`
  - `supabase_schema_updates_v4.sql:7-21`
- **Deskripsi Masalah:**
  Di `supabase_schema_updates_v2.sql:43-52`, tabel `report_periods` dibuat dengan kolom:
  `id, table_name, tahun, bulan, is_locked, locked_at, locked_by_user_id`.
  Di `supabase_schema_updates_v4.sql:7-21`, tabel `report_periods` didefinisikan dengan skema baru:
  `id, table_name, tahun, bulan, status, submitted_by, submitted_at, approved_by, approved_at, notes, created_at, updated_at` menggunakan klausul `CREATE TABLE IF NOT EXISTS report_periods`.
  Karena tabel sudah ada dari eksekusi v2, perintah `CREATE TABLE IF NOT EXISTS` di v4 tidak melakukan apa pun (`NO-OP`). Kolom `status`, `submitted_by`, dll. tidak pernah ditambahkan.
- **Dampak:**
  Database yang dimigrasi berurutan dari v2 ke v4 akan kehilangan kolom workflow `status`. Saat `app/api/periods/route.js` memanggil update atau insert status, PostgreSQL akan melempar error: `column "status" of relation "report_periods" does not exist`.
- **Rekomendasi Konkret:**
  Pastikan ada skrip migrasi dengan `ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'`, `submitted_by INTEGER REFERENCES users(id)`, dsb., bukan hanya mengandalkan `CREATE TABLE IF NOT EXISTS`.

---

#### [DB-004] Agregasi Tahunan Excel Export Rusak Akibat Pengecekan typeof number pada Kolom TEXT v6
- **ID:** `DB-004`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Kritis
- **Lokasi:**
  - `app/api/export/excel/route.js:72`
- **Deskripsi Masalah:**
  Pada ekspor Excel untuk periode tahunan (`bulan == null`), fungsi `fetchDusunData` melakukan agregasi 12 bulan menjadi 1 baris per dusun. Pada baris 72:
  ```js
  if (typeof v === 'number') {
    existing[k] = (existing[k] || 0) + v;
  } else if (existing[k] == null) {
    existing[k] = v;
  }
  ```
  Sejak migrasi `v6`, seluruh kolom angka di tabel `data_*` diubah tipenya menjadi `TEXT` dengan default `''`. Ketika PostgREST mengembalikan data ke Node.js, nilai kolom bertipe `string` (misal `"15"`). Kondisi `typeof v === 'number'` selalu bernilai `false`.
  Kode selalu melompat ke `else if (existing[k] == null) existing[k] = v;` yang hanya menyimpan nilai baris bulan pertama dan mengabaikan seluruh bulan berikutnya!
- **Dampak:**
  Data tahunan pada ekspor Excel untuk tabel bulanan (`data_bumil`, `data_rekap_dawis`, `data_umum`) tidak terakumulasi. Angka yang muncul di Excel tahunan adalah angka parsial bulan pertama saja, bukan total 1 tahun.
- **Rekomendasi Konkret:**
  Ganti baris 72 dengan helper numerik yang mengenali string:
  ```js
  const num = Number(v);
  if (!isNaN(num) && v !== '' && v !== null) {
    existing[k] = (Number(existing[k]) || 0) + num;
  } else if (existing[k] == null) {
    existing[k] = v;
  }
  ```

---

#### [DB-005] Fresh Install Script supabase_schema.sql Tidak Lengkap & Konflik dengan v1
- **ID:** `DB-005`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Tinggi
- **Lokasi:**
  - `supabase_schema.sql:1-320`
  - `supabase_schema_updates.sql:25`
- **Deskripsi Masalah:**
  1. `supabase_schema.sql` (fresh install) tidak memuat tabel penting yang dibutuhkan aplikasi: `report_periods`, `report_years`, `table_schemas`, `table_column_overrides`, `notifications`, `rate_limits`, dan kolom `custom_columns`.
  2. Komentar header baris 4 menyatakan: "jalankan file ini, lalu v2, v3, v4 (skip v5)". Jika user menjalankan `supabase_schema_updates.sql` (v1), baris 25:
     `ALTER TABLE data_kegiatan_warga ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '{}'::jsonb;`
     akan gagal dengan `ERROR: "data_kegiatan_warga" is not a table or foreign table` karena di `supabase_schema.sql` baris 277 `data_kegiatan_warga` adalah sebuah VIEW.
- **Dampak:**
  Setup database fresh install dari nol akan gagal atau menghasilkan skema yang tidak lengkap tanpa ada petunjuk jelas bagi developer/sysadmin baru.
- **Rekomendasi Konkret:**
  Satukan seluruh evolusi skema (v1 s/d v13) ke dalam `supabase_schema.sql` sebagai single comprehensive bootstrap script, sehingga fresh install cukup menjalankan satu file saja.

---

#### [DB-006] Ketiadaan ON DELETE SET NULL pada report_periods Menghambat Penghapusan User
- **ID:** `DB-006`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Sedang
- **Lokasi:**
  - `supabase_schema_updates_v4.sql:14, 16`
  - `app/api/admin/users/route.js:182`
- **Deskripsi Masalah:**
  Kolom `submitted_by` dan `approved_by` di `report_periods` adalah foreign key ke `users(id)` tanpa klausul `ON DELETE SET NULL` atau `CASCADE`. Di `app/api/admin/users/route.js:182`, handler DELETE user hanya mengosongkan `audit_logs.user_id = null`, tetapi tidak membersihkan referensi di `report_periods`.
- **Dampak:**
  Admin tidak dapat menghapus akun operator atau admin yang pernah melakukan submit/approve periode laporan (PostgreSQL melempar foreign key constraint violation, API merespons HTTP 500).
- **Rekomendasi Konkret:**
  Ubah constraint FK pada `report_periods`:
  `ALTER TABLE report_periods DROP CONSTRAINT ... ADD FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;`

---

#### [DB-007] Privilege Escalation Otomatis pada Migrasi v9 untuk Role Sekretaris
- **ID:** `DB-007`
- **Aspek:** Skema/DB & Migrasi
- **Severity:** Sedang
- **Lokasi:**
  - `supabase_schema_updates_v9.sql:32`
- **Deskripsi Masalah:**
  Saat role `sekretaris` dihapus di v9, baris 32 menjalankan `UPDATE users SET role = 'admin' WHERE role = 'sekretaris';`.
- **Dampak:**
  Akun staf sekretariat secara otomatis dinaikkan privilege-nya menjadi administrator penuh tanpa audit manual, berpotensi melanggar prinsip least privilege.
- **Rekomendasi Konkret:**
  Sebaiknya akun sekretaris lama di-downgrade ke role read-only (`user`) atau role pokja terkait, dan peran admin hanya diberikan secara eksplisit oleh superadmin.

---

### ASPEK 8: DEVOPS/DEPLOYMENT & DOKUMENTASI (DEVOPS)

#### [DEVOPS-001] Ketiadaan CI/CD Pipeline Otomatis
- **ID:** `DEVOPS-001`
- **Aspek:** DevOps & Dokumentasi
- **Severity:** Tinggi
- **Lokasi:**
  - Root directory (absen `.github/workflows/`)
- **Deskripsi Masalah:**
  Tidak terdapat konfigurasi pipeline otomatis (GitHub Actions / GitLab CI). Suite pengujian Jest (22 files), linting, build verification, dan security check hanya bisa dijalankan secara manual oleh programmer.
- **Dampak:**
  Regresi kode, kegagalan build, atau celah keamanan baru dapat lolos ke branch utama dan langsung ter-deploy ke Vercel tanpa adanya quality gate otomatis.
- **Rekomendasi Konkret:**
  Buat workflow `.github/workflows/ci.yml` yang menjalankan:
  1. `npm ci`
  2. `npm test -- --runInBand`
  3. `npm run build`
  pada setiap Pull Request dan push ke `main`.

---

#### [DEVOPS-002] Ketiadaan Containerization (Dockerfile / docker-compose.yml) untuk Self-Hosted / On-Premise
- **ID:** `DEVOPS-002`
- **Aspek:** DevOps & Dokumentasi
- **Severity:** Sedang
- **Lokasi:**
  - Root directory (absen `Dockerfile`, `docker-compose.yml`)
- **Deskripsi Masalah:**
  Aplikasi hanya dikonfigurasi untuk deployment serverless Vercel. Tidak ada artefak containerization untuk menjalankan aplikasi di server lokal/on-premise (misalnya server Dinas Kominfo Wonogiri atau server Desa Belikurip).
- **Dampak:**
  Ketergantungan vendor pada Vercel. Sulit melakukan replikasi deployment mandiri yang deterministik di lingkungan cloud lain atau server fisik.
- **Rekomendasi Konkret:**
  Tambahkan `Dockerfile` multi-stage build dengan Next.js standalone output (`output: 'standalone'` di `next.config.mjs`) serta `docker-compose.yml` yang mempermudah deployment mandiri.

---

#### [DEVOPS-003] Ketiadaan Otomasi Backup Terjadwal untuk Supabase Free Plan
- **ID:** `DEVOPS-003`
- **Aspek:** DevOps & Dokumentasi
- **Severity:** Sedang
- **Lokasi:**
  - `docs/DEPLOYMENT.md:90-93`
  - `docs/OPERATIONS.md:30-46`
- **Deskripsi Masalah:**
  Dokumentasi proyek berulang kali mengingatkan bahwa Supabase Free Plan tidak memiliki automated backup snapshot. Namun tidak ada tooling atau scheduled script yang membantu melakukan backup otomatis.
- **Dampak:**
  Data rentan hilang jika terjadi human error atau eksekusi script reset tanpa backup manual yang dilakukan admin.
- **Rekomendasi Konkret:**
  Buat GitHub Actions scheduled workflow (cron mingguan) atau script shell/Node.js yang menjalankan `pg_dump` via connection pooling dan menyimpan dump terenkripsi ke object storage (misal Cloudflare R2 atau Google Drive).

---

#### [DEVOPS-004] Ketiadaan Version-Controlled vercel.json
- **ID:** `DEVOPS-004`
- **Aspek:** DevOps & Dokumentasi
- **Severity:** Rendah
- **Lokasi:**
  - Root directory (absen `vercel.json`)
- **Deskripsi Masalah:**
  Konfigurasi deployment Vercel (function memory, maxDuration, regions, security headers tambahan) tidak tercatat dalam repositori git.
- **Dampak:**
  Jika proyek di-link ke akun atau team Vercel baru, setting runtime dan environment routing tidak otomatis terbawa.
- **Rekomendasi Konkret:**
  Tambahkan file `vercel.json` sederhana yang mendefinisikan framework Next.js dan setting function execution time bila diperlukan.

---

## 3. Tabel Verifikasi Status Temuan Lama

Berdasarkan pengecekan terhadap dokumen review sebelumnya (`PROJECT_REVIEW.md`, `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md`, `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md`, `REVIEW_UIUX_FITUR_2026-07-02.md`, `AI_SKILLS_PROJECT_REVIEW.md`), berikut status aktual temuan:

| No | Temuan Lama | Dokumen Asal | Status Saat Ini | Bukti Kode Terkini |
|---|---|---|---|---|
| 1 | Supabase public client fallback ke service role | `REVIEW_TEMUAN...2026-06-17` | **Sudah Diperbaiki** | `lib/supabase.js:45-58` (Proxy lazy throw di production jika anon key tidak ada) |
| 2 | Duplikasi `report_periods` pada periode tahunan (`bulan IS NULL`) | `REVIEW_TEMUAN...2026-06-17` | **Sudah Diperbaiki** | `supabase_schema_updates_v13.sql:80-87` (partial unique index dibuat) |
| 3 | Query notifikasi periode bulanan salah (`is('bulan', undefined)`) | `REVIEW_TEMUAN...2026-06-17` | **Sudah Diperbaiki** | `lib/notifications.js:89-91` (cek `bulan === null ? is(null) : eq(bulan)`) |
| 4 | Import Excel belum month-aware secara penuh | `REVIEW_TEMUAN...2026-06-17` | **Sudah Diperbaiki** | `lib/excel/importToSupabase.js:68`, `previewDiff.js:40`, `__tests__/server/import-month-aware.test.js` |
| 5 | README masih bawaan create-next-app | `SENIOR_WEB_DEV...2026-06-17` | **Sudah Diperbaiki** | `README.md:1-213` (berisi panduan lengkap, stack, role, setup lokal) |
| 6 | God Component: `AiChatBubble.js` (~39KB) | `AI_SKILLS_PROJECT_REVIEW.md` | **Sudah Diperbaiki** | `components/AiChatBubble.js:1-54` (dipecah ke `hooks/useAiChat.js` dan `components/ai-chat/*`) |
| 7 | God Component: `app/dashboard/admin/page.js` (~1421 baris) | `SENIOR_WEB_DEV...2026-06-17` | **Sudah Diperbaiki** | `app/dashboard/admin/page.js:1-71` (dipecah ke `_components/UsersTab`, `DesaTab`, `YearsTab`, dll.) |
| 8 | Self-host font daripada `@import` Google Fonts | `PROJECT_REVIEW.md` | **Sudah Diperbaiki** | `app/layout.js:7-26` (menggunakan `next/font/google` Plus Jakarta Sans, Lora, Fira Code) |
| 9 | God Components: `PokjaDataPage.js`, `BumilDataPage.js`, `NestedDataPage.js` | `AI_SKILLS_PROJECT_REVIEW.md` | **Belum Diperbaiki** | Masih masing-masing 760, 699, dan 809 baris dengan duplikasi state management masif |
| 10 | Residu desa ↔ dusun pada UI dan download artifact | `REVIEW_UIUX_FITUR_2026-07-02` | **Sebagian Diperbaiki** | Mayoritas UI sudah dusun, namun download filename di `dashboard/page.js:205` masih "Baturetno" dan `DesaTab.jsx` belum direname |

---

## 4. Roadmap Perbaikan Bertahap

### Tahap 1: Quick Wins (0–2 Hari) — Keselamatan Data & Bug Kritis
1. **[DB-001] Amankan `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql`:**
   Beri tanda komentar (`--`) pada blok `TRUNCATE TABLE ... CASCADE` agar tidak dapat terpicu secara tidak sengaja.
2. **[DB-004] Perbaiki Bug Agregasi Tahunan Excel Export:**
   Di `app/api/export/excel/route.js:72`, ganti `typeof v === 'number'` dengan pengecekan `!isNaN(Number(v)) && v !== ''` agar angka antar-bulan dijumlahkan dengan benar.
3. **[DB-002] Drop Index Duplikat data_umum_dusun_tahun_uidx:**
   Jalankan `DROP INDEX IF EXISTS public.data_umum_dusun_tahun_uidx;` di Supabase untuk mengizinkan input data umum bulanan tanpa error duplicate key.
4. **[ARCH-004] Koreksi Nama File Export:**
   Ganti default filename di `app/dashboard/page.js:205` dari `Rekapitulasi_PKK_Baturetno_...` menjadi `Rekapitulasi_PKK_Belikurip_...`.

### Tahap 2: Jangka Menengah (1–2 Minggu) — Performa, Skema, & DevOps
1. **[PERF-003] Tambahkan Database Indexes:**
   Buat index pada kolom `tahun` dan `(tahun, bulan)` di seluruh tabel data operasional di Supabase untuk mengoptimasi filter tahunan.
2. **[PERF-001] Optimasi Query /api/rekap:**
   Re-use data tahun berjalan di memori untuk completeness check, memangkas 13 query redundan ke Supabase.
3. **[ARCH-003] Perbaiki Word Export (Annex C Pokja II & Tabel Bulanan):**
   Update daftar kolom Pokja II di `app/api/export/word/route.js` sesuai migrasi v5 dan tambahkan seksi untuk Data Umum, Rekap Dawis, dan Bumil.
4. **[DEVOPS-001] Setup GitHub Actions CI:**
   Buat workflow `.github/workflows/ci.yml` untuk memvalidasi `npm test` dan `npm run build` pada setiap pull request.
5. **[PERF-004] Dynamic Import untuk Komponen Berat Dashboard:**
   Ubah import `AiChatBubble` dan `OnboardingTour` di `app/dashboard/layout.js` menjadi `next/dynamic`.

### Tahap 3: Jangka Panjang (2–4 Minggu) — Refactoring Arsitektur & Resilience
1. **[ARCH-001 & ARCH-002] Refactoring God Components (Pokja, Bumil, Nested):**
   Ekstrak custom hook `useTableDataEntry` dan sub-komponen mobile entry bersama. Hilangkan redundansi `PokjaDataPage.js`.
2. **[DB-005] Konsolidasi Skrip Skema Fresh Install:**
   Satukan skema awal dan migrasi v1–v13 menjadi satu file skema bootstrap yang bersih dan konsisten.
3. **[DEVOPS-002 & DEVOPS-003] Containerization & Otomasi Backup:**
   Sediakan `Dockerfile` standar untuk self-hosted option dan buat automated backup scheduler ke object storage.
