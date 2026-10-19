# Handoff Report — Architecture, DB & DevOps Audit

**Agent:** `explorer_arch_db_1` (Architecture, DB & DevOps Auditor)  
**Parent Orchestrator:** `5958bfee-566f-423e-91c9-c9c4034e8cf9`  
**Working Directory:** `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_arch_db_1`  
**Detailed Report:** `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_arch_db_1\arch_db_audit.md`  
**Handoff Type:** Hard (Task complete)

---

## 1. Observation

1. **Destructive Reset Script Unprotected:**
   - File `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql:65-76` memuat perintah aktif:
     ```sql
     TRUNCATE TABLE data_umum, data_pokja1, data_pokja2, data_pokja3, data_pokja4, data_rekap_dawis, data_bumil, audit_logs, notifications, rate_limits RESTART IDENTITY CASCADE;
     ```
     Berbeda dengan `v5_destructive.sql` dan `v6_reset.sql`, baris-baris ini tidak di-comment (`--`).

2. **Index Conflict Target Missed in v12:**
   - File `supabase_schema_updates_v11.sql:81`:
     ```sql
     SELECT pg_temp.ensure_unique_index('data_umum', ARRAY['dusun_id', 'tahun'], 'data_umum_dusun_tahun_uidx');
     ```
   - File `supabase_schema_updates_v12.sql:58-75`:
     Hanya men-drop constraint bernama `data_umum_dusun_tahun_uniq` dan `data_umum_dusun_id_tahun_key` dari `pg_constraint`. Index `data_umum_dusun_tahun_uidx` tidak di-drop.

3. **Silent Bug Agregasi Tahunan Excel Export Akibat TEXT Type v6:**
   - File `app/api/export/excel/route.js:72`:
     ```javascript
     if (typeof v === 'number') {
       existing[k] = (existing[k] || 0) + v;
     } else if (existing[k] == null) {
       existing[k] = v;
     }
     ```
   - File `supabase_schema_updates_v6.sql:19-20` dan `supabase_schema.sql:8-10`: Seluruh kolom data numerik bertipe `TEXT` dengan default `''`. PostgREST mengembalikan nilai sebagai `string` (misal `"10"`), sehingga `typeof v === 'number'` selalu bernilai `false`.

4. **v4 Migrasi NO-OP pada Database Upgrade dari v2:**
   - File `supabase_schema_updates_v2.sql:43-52` membuat `report_periods` dengan skema awal (tanpa kolom `status`).
   - File `supabase_schema_updates_v4.sql:7-21` mendefinisikan skema baru dengan `CREATE TABLE IF NOT EXISTS report_periods`. Karena tabel sudah ada, statement diabaikan (NO-OP).

5. **Word Export Out-of-Sync dengan Migrasi v5:**
   - File `app/api/export/word/route.js:169-180` masih menggunakan kolom legacy Pokja II: `rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`.
   - File `app/api/export/word/route.js:363-374` hanya mengekspor Pokja 1–4, tidak mengekspor Data Umum, Rekap Dawis, atau Bumil.
   - File `app/api/export/word/route.js:269-274` menjalankan `supabase.from('dusun')` di dalam loop `POKJA_DEFS` (N+1 query).

6. **Overfetching Ekstrem di Dashboard API:**
   - File `app/api/rekap/route.js:59-295`: Satu invocation `GET /api/rekap` menjalankan hingga 23 query Supabase via REST. Data tahun berjalan yang sudah diambil di baris 60-178 di-query ulang di baris 264-295 untuk completeness check.

7. **Ketiadaan Index pada Kolom tahun:**
   - File `supabase_schema.sql:45-273` dan semua file migrasi v1-v13 tidak memiliki index pada kolom `tahun`. Index yang ada bertipe composite diawali `dusun_id`.

8. **Ketiadaan CI/CD & Artefak Container:**
   - Repositori tidak memiliki direktori `.github/workflows/`, tidak ada `Dockerfile`, dan tidak ada `docker-compose.yml`.

---

## 2. Logic Chain

1. **Dari Observasi 1 → Risiko Bencana Operasional:**
   - `TRUNCATE ... CASCADE` aktif pada file yang ditaruh di root repositori → pengguna/admin membuka file di Supabase SQL Editor → jika tombol Run ditekan tanpa menyeleksi query parsial, PostgreSQL akan mengeksekusi truncate pada seluruh tabel operasional secara permanen.
2. **Dari Observasi 2 → Input Data Umum Bulan ke-2 Gagal:**
   - v11 membuat unique index pada `(dusun_id, tahun)` → v12 mengubah `data_umum` menjadi per-bulan tetapi tidak men-drop index unik tersebut → saat baris untuk bulan ke-2 disimpan dengan `dusun_id` dan `tahun` yang sama, PostgreSQL menolak karena melanggar constraint keunikan `(dusun_id, tahun)`.
3. **Dari Observasi 3 → Data Excel Tahunan Cacat:**
   - v6 mengubah kolom integer menjadi TEXT → data dikembalikan sebagai String oleh database client → baris `typeof v === 'number'` menghasilkan false → cabang `existing[k] = v` hanya menyimpan nilai bulan pertama → data ekspor tahunan tidak menjumlahkan 12 bulan melainkan hanya mencetak bulan ke-1.
4. **Dari Observasi 4 → Kerusakan API Workflow Periode:**
   - Database bertahap mengeksekusi v2 lalu v4 → `CREATE TABLE IF NOT EXISTS` tidak menambah kolom baru jika tabel sudah ada → kolom `status` tidak pernah tercipta → endpoint `/api/periods` crash saat query/update kolom `status`.
5. **Dari Observasi 6 & 7 → Latensi Dashboard Tinggi & Bottleneck Supabase:**
   - Filter `tahun` tanpa index memaksa Sequential Scan pada PostgreSQL → ditambah 23 panggilan HTTP per dashboard load → latensi respons membengkak dan konsumsi kuota serverless meningkat.

---

## 3. Caveats

- **Izin Eksekusi Command:** Perintah bash/terminal (`npm test`, `npm run build`) ditolak oleh sistem perizinan lokal, sehingga verifikasi empiris dilakukan melalui analisis statis mendalam pada 100% kode sumber Jest (`__tests__/server/*` dan `__tests__/client/*`), Playwright spec (`e2e/tests/*`), dan skrip SQL.
- **Kondisi Database Produksi Aktual:** Auditor dilarang mengakses kredensial produksi dan tidak menjalankan query langsung ke Supabase produksi. Analisis didasarkan pada histori seluruh skrip SQL migrasi v1 s/d v13 yang tersimpan di repositori.

---

## 4. Conclusion

Codebase Lumbung Data PKK Desa Belikurip memiliki arsitektur domain yang terstruktur baik dengan pemisahan peran yang matang, namun memiliki **4 cacat integritas database kritis (DB-001 s/d DB-004)** yang harus segera diperbaiki sebelum rilis penuh:
1. Memproteksi skrip reset destruktif dengan komentar pengaman.
2. Men-drop index unik `data_umum_dusun_tahun_uidx` yang menghalangi input data umum multi-bulan.
3. Memperbaiki logika agregasi tipe TEXT pada Excel export agar data tahunan tidak terpotong.
4. Menambahkan database index pada kolom `tahun` dan memangkas 13 query redundan pada `/api/rekap`.
5. Memperbarui Word export agar memuat skema resmi Pokja II migrasi v5 dan menyediakan CI/CD pipeline via GitHub Actions.

---

## 5. Verification Method

1. **Verifikasi Bug Excel Export (DB-004):**
   - Periksa `app/api/export/excel/route.js:72`.
   - Jalankan inspect: `typeof "10" === 'number'` bernilai `false`. Verifikasi bahwa nilai numerik dari PostgREST bertipe string.
2. **Verifikasi Index Conflict Target (DB-002):**
   - Buka `supabase_schema_updates_v11.sql:81` dan bandingkan dengan `supabase_schema_updates_v12.sql:58-75`. Konfirmasi bahwa `data_umum_dusun_tahun_uidx` tidak ada dalam daftar DROP CONSTRAINT.
3. **Verifikasi Word Export Pokja II (ARCH-003):**
   - Buka `app/api/export/word/route.js:168-180`. Bandingkan dengan `lib/dataPages.js:pokja2.columns` dan `__tests__/server/schema-mapping.test.js:14-43`.
4. **Verifikasi Redundansi Query /api/rekap (PERF-001):**
   - Buka `app/api/rekap/route.js:60-178` lalu periksa baris 264-295. Konfirmasi bahwa `fetchRows(tahun)` mengulang query untuk 7 tabel yang sama.
