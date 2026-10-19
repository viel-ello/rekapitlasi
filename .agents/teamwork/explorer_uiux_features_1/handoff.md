# Handoff Report: UI/UX, Features & Past Reviews Verification

**Agent:** `teamwork_preview_explorer` (`explorer_uiux_features_1`)  
**Parent Agent:** `orchestrator_1` (`5958bfee-566f-423e-91c9-c9c4034e8cf9`)  
**Artifact:** `.agents/teamwork/explorer_uiux_features_1/uiux_features_audit.md`  
**Timestamp:** 2026-10-12T13:48:30Z  

---

## 1. Observation

1. **Inkonsistensi Kolom Pokja II pada Export Excel:**
   - Di `app/api/export/excel/route.js:331`:
     `ws.mergeCells('N8:N10'); ws.getCell('N8').value = 'JML KLP PEMBACA';`
   - Di `app/api/export/excel/route.js:393`:
     `ws.getCell(r, 14).value = data.klp_pembaca ?? 0;`
   - Di `app/api/export/excel/route.js:394-396`:
     Kolom 15 adalah `data.bkb_klp ?? 0`, kolom 16 `data.bkb_ape_set_a`, kolom 17 `data.bkb_ape_set_b`. Nilai `bkb_jml_ibu_peserta` tidak pernah diekspor.
   - Bandingkan dengan:
     * `lib/dataPages.js:98-101`: `{ key: 'bkb_klp' }, { key: 'bkb_jml_ibu_peserta' }, { key: 'bkb_ape_set_a' }, { key: 'bkb_ape_set_b' }`. Tidak ada kolom `klp_pembaca`.
     * `lib/excel/sheetMap.js:62-63`: `'paud_sejenis', 'taman_bacaan', 'bkb_klp', 'bkb_jml_ibu_peserta', 'bkb_ape_set_a', 'bkb_ape_set_b'`. Tidak ada kolom `klp_pembaca`.
     * `components/Pokja2DataPage.js:50`: `{ kind: 'leaf', key: 'bkb_jml_ibu_peserta', label: 'Jml Ibu peserta', vertical: true }`.
     * `supabase_schema_updates_v5.sql:170`: `ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_jml_ibu_peserta INTEGER DEFAULT 0;`.
2. **Definisi Kolom Obsolete pada Export Word:**
   - Di `app/api/export/word/route.js:173-180`:
     `flatKeys` Pokja II masih memuat `'rumah_dilan', 'kampung_mandiri', 'usaha_mikro', 'toko_pkk', 'koperasi_belum_bh_kop', 'koperasi_belum_bh_angg'` yang sudah di-drop di skema v5, serta tidak memiliki 13 kolom baru Pokja II.
   - Di `app/api/export/word/route.js:253-264`:
     Pokja IV melewatkan kolom `kk_tabungan`.
   - Di `app/api/export/word/route.js:67-265`:
     Hanya mendefinisikan Pokja I–IV. Data Umum, Rekap Dawis, dan Bumil tidak didukung.
3. **Aksi "Batalkan" Tanpa Konfirmasi:**
   - Di `components/PokjaDataPage.js:557`:
     `<button onClick={() => { fetchData(tahun); }} ...>Batalkan</button>`
   - Di `components/BumilDataPage.js:540`:
     `<button onClick={fetchData} ...>Batalkan</button>`
   - Di `components/NestedDataPage.js:568`:
     `<button onClick={cancelPending} ...>Batalkan</button>`
4. **Navigasi Client-Side Melewati Guard Unsaved Changes:**
   - Di `components/BumilDataPage.js:344` & `NestedDataPage.js:352`: listener `beforeunload` terpasang, tetapi tidak ada di `PokjaDataPage.js`.
   - Navigasi Next.js via `<Link>` di `Sidebar.js` tidak di-intercept, sehingga perpindahan halaman membuang dirty state tanpa dialog.
5. **Fragmentasi Toast dan Hilangnya `aria-live`:**
   - `components/Toast.jsx` memiliki `aria-live="polite"` dan dipasang di layout via `<ToastViewport />`.
   - Namun, toast lokal dibuat ulang secara mandiri di `components/PokjaDataPage.js:449-458`, `BumilDataPage.js:441-450`, `NestedDataPage.js:488-497`, `app/dashboard/admin/page.js:29-33`, dan `app/dashboard/approval/page.js:50` tanpa atribut `aria-live`.
6. **Kebocoran Inline Style pada Sel Sticky di Dark Mode:**
   - Di `components/PokjaDataPage.js:608,609,612,633,738,739`:
     Header & kolom sticky menggunakan `style={{ background: '#f9fafb' }}`, `style={{ background: '#fff' }}`, dan `style={{ background: '#f0fdf4' }}`.
7. **Typo Class Tailwind:**
   - Di `components/PokjaDataPage.js:750`:
     `<td className="sticky right-0 background-[#f0fdf4] z-30"></td>`
8. **Onboarding Tour Mismatch Selector:**
   - Di `components/OnboardingTour.jsx:34`:
     `target: '[aria-label="Pilih tahun dashboard"]'`
   - Di `components/DashboardToolbar.jsx:142`:
     `aria-label={label}` dengan label bernilai `"Tahun"`.
9. **Duplikasi Aturan CSS Dark Mode Sidebar:**
   - Di `app/globals.css:133-167` dan `646-675`: aturan `.dark .sidebar` didefinisikan 2 kali dengan nilai warna berbeda (`#111a16` vs `#111c18`).
   - Di `tailwind.config.js:3`: `darkMode: ['class', 'class']`.
10. **Aksesibilitas Chart SVG & Input Desktop:**
    - `components/charts/DusunBarChart.jsx`, `KaderDonut.jsx`, `StackedBumilBar.jsx`: tidak memiliki `role="img"`, `aria-label`, atau tabel fallback `sr-only`.
    - `components/PokjaDataPage.js:656-670`: input sel tabel desktop tidak memiliki `aria-label` atau `id`.
    - `components/PokjaDataPage.js:652,662`: pesan validasi error hanya disematkan di atribut `title` (hover tooltip).
11. **Portal Publik Client-Side Rendering:**
    - `app/publik/page.js:1`: dimulai dengan `'use client'`, fetching di browser, tanpa metadata Open Graph di `app/layout.js:28-38`.
12. **Verifikasi Temuan Lama (6 Dokumen):**
    - Dari total 63 butir temuan dan saran lintas 6 dokumen review, sebanyak 37 butir **Sudah diperbaiki**, 11 butir **Sebagian**, 14 butir **Belum**, dan 1 butir **Tidak relevan lagi**. Detail file:baris tercatat lengkap di `uiux_features_audit.md` Bagian 4.

---

## 2. Logic Chain

1. **Bukti Obs. 1 → Kesimpulan Korupsi Data Export-Import Pokja II:**
   - `app/api/export/excel/route.js:331,393` mengekspor kolom `klp_pembaca` pada kolom ke-14 dan menghilangkan kolom `bkb_jml_ibu_peserta`.
   - Sebaliknya, `lib/excel/sheetMap.js:62-63` mendefinisikan kunci urutan pembacaan sheet import: kolom setelah `taman_bacaan` adalah `bkb_klp`, lalu `bkb_jml_ibu_peserta`.
   - Ketika file Excel hasil export diunggah ke fitur import, parser membaca kolom ke-14 (`klp_pembaca` = 0) dan memasukkannya ke kunci `bkb_klp`, serta membaca kolom ke-15 (`bkb_klp`) dan memasukkannya ke kunci `bkb_jml_ibu_peserta`.
   - **Kesimpulan:** Nilai input kader untuk `bkb_jml_ibu_peserta` hilang permanen dari export Excel, dan re-import file export memicu pergeseran data yang merusak integritas angka BKB di database (`FEAT-001`).
2. **Bukti Obs. 2 → Kesimpulan Kegagalan Export Word Pokja II:**
   - Kolom `'rumah_dilan', 'kampung_mandiri', 'usaha_mikro', 'toko_pkk', 'koperasi_belum_bh_kop', 'koperasi_belum_bh_angg'` telah di-drop dari tabel `data_pokja2` di PostgreSQL sejak migrasi v5.
   - Karena kolom tidak ada lagi di tabel Supabase, `dataMap` untuk kolom-kolom ini selalu bernilai `undefined`/kosong, sehingga tabel Word menghasilkan sel-sel kosong tak berguna, sementara 13 metrik laporan resmi baru tidak tercetak (`FEAT-002`).
3. **Bukti Obs. 3 & 4 → Kesimpulan Kerentanan Kehilangan Data Input Kader:**
   - Kader di pedesaan menginput puluhan sel data di smartphone.
   - Tombol "Batalkan" tidak memiliki konfirmasi (`Obs. 3`) dan tautan navigasi menu tidak memiliki interceptor (`Obs. 4`).
   - Salah satu sentuhan jari yang tidak disengaja langsung menghilangkan seluruh dirty state tanpa konfirmasi (`UIUX-001`, `UIUX-002`).
4. **Bukti Obs. 5 → Kesimpulan Gangguan Aksesibilitas Screen Reader:**
   - Toast yang dibuat mandiri di halaman data (`Obs. 5`) tidak memiliki container ber-`aria-live="polite"` atau `role="status"`.
   - Pembaca layar tidak dapat mengumumkan status simpan berhasil/gagal kepada pengguna disabilitas netra (`UIUX-003`).
5. **Bukti Obs. 6 → Kesimpulan Cacat Visual Dark Mode:**
   - Spesifisitas inline style `style={{ background: '#fff' }}` lebih tinggi dari class CSS `.dark .bg-surface`.
   - Sel sticky No, Nama Dusun, dan baris JUMLAH tetap mempertahankan latar putih/terang di mode gelap, merusak kontras visual (`UIUX-004`).

---

## 3. Caveats

1. **Pengujian Dinamis Browser:** Karena tugas ini berada dalam mode strictly read-only tanpa modifikasi kode atau menjalankan automated browser click interaktif secara langsung, pengamatan visual kontras dan navigasi didasarkan pada audit statis kode sumber (CSS, JSX, dan data flow) dengan presisi nomor baris.
2. **Backward Compatibility:** Perbaikan kolom Pokja II di `app/api/export/excel/route.js` perlu divalidasi apakah ada template fisik cetak lama yang dipegang pengurus PKK tingkat kecamatan yang secara sengaja meminta label "KLP PEMBACA", namun secara skema aplikasi dan lampiran desa Belikurip, kolom yang sah adalah `bkb_jml_ibu_peserta`.
3. Tidak ada caveats lain.

---

## 4. Conclusion

1. Aplikasi web TP PKK Desa Belikurip memiliki fondasi fitur yang sangat matang untuk domain desa (RBAC row-level per dusun, period locking, approval queue, import diff preview, AI dry-run preview, onboarding tour, dark mode).
2. Terdapat **1 bug kritis kelengkapan fitur (`FEAT-001`)** pada ekspor Excel Pokja II yang berisiko merusak integritas data saat diekspor dan diimpor ulang.
3. Terdapat **1 defisiensi fitur tinggi (`FEAT-002`)** pada ekspor Word yang masih menggunakan kolom-kolom usang dan belum mendukung 3 tabel utama (Data Umum, Dawis, Bumil).
4. Terdapat **2 isu usability tingkat tinggi (`UIUX-001`, `UIUX-002`)** terkait tombol "Batalkan" tanpa konfirmasi dan ketiadaan guard navigasi SPA yang rentan menghilangkan input kader.
5. Terdapat **12 isu finishing visual & aksesibilitas (`UIUX-003` s/d `UIUX-014`)** yang meliputi dark mode inline style leak, fragmentasi toast tanpa `aria-live`, typo Tailwind, miskinnya label aksesibilitas tabel desktop, serta dead code primitive UI.
6. Dari 63 temuan review historis, mayoritas celah keamanan kritis dan fungsionalitas utama telah diperbaiki (**37 sudah diperbaiki**, **11 sebagian**), menyisakan pekerjaan konsolidasi UI/UX dan rotasi kredensial default admin (**14 belum**).

---

## 5. Verification Method

Untuk memverifikasi secara independen setiap temuan dalam laporan ini:

1. **Verifikasi `FEAT-001` (Inkonsistensi Kolom Pokja II):**
   - Buka `app/api/export/excel/route.js` baris 331 dan 393: perhatikan penggunaan `klp_pembaca` dan ketiadaan `bkb_jml_ibu_peserta`.
   - Buka `lib/dataPages.js` baris 98–101 dan `lib/excel/sheetMap.js` baris 63: perhatikan bahwa kunci resmi adalah `bkb_jml_ibu_peserta`.
2. **Verifikasi `FEAT-002` (Skema Obsolete Word Export):**
   - Buka `app/api/export/word/route.js` baris 173–180: perhatikan keberadaan `rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`.
   - Bandingkan dengan skema `supabase_schema_updates_v5.sql` di mana kolom-kolom ini telah di-drop.
3. **Verifikasi `UIUX-001` (Tombol Batalkan Tanpa Konfirmasi):**
   - Buka `components/PokjaDataPage.js` baris 557: periksa bahwa `onClick={() => { fetchData(tahun); }}` dipanggil langsung tanpa state modal.
4. **Verifikasi `UIUX-004` (Sel Sticky Bocor di Dark Mode):**
   - Buka `components/PokjaDataPage.js` baris 608–609, 633, dan 738: periksa atribut `style={{ background: '#f9fafb' }}` dan `style={{ background: '#fff' }}`.
5. **Verifikasi `UIUX-005` (Typo Tailwind):**
   - Buka `components/PokjaDataPage.js` baris 750: periksa teks `background-[#f0fdf4]`.
6. **Verifikasi `UIUX-006` (Tour Selector Mismatch):**
   - Buka `components/OnboardingTour.jsx` baris 34 (`[aria-label="Pilih tahun dashboard"]`) dan bandingkan dengan `components/DashboardToolbar.jsx` baris 142 (`aria-label={label}`).
7. **Verifikasi Test Suite:**
   - Jalankan `npm test -- --runInBand` (semua 19 server test suite dan 3 client test suite passing).
   - Invalidation conditions: Jika `bkb_jml_ibu_peserta` sudah dikembalikan di `export/excel/route.js`, maka `FEAT-001` dianggap fixed.
