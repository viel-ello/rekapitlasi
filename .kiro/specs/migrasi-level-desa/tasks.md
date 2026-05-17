# Implementation Plan

## Overview

Implementasi migrasi level kecamatan → desa Belikurip, dipecah per fase. Setiap task ditandai apakah blocking untuk task berikutnya. Acceptance criteria mengikuti `requirements.md`.

Sembilan fase dijalankan secara berurutan; di dalam fase, beberapa task bisa paralel selama tidak menyentuh file yang sama. Total 50 task (48 task aktif + 2 deferred di Fase 9).

## Tasks

### Fase 1 — Schema migration

- [x] 1. Tulis `supabase_schema_updates_v5.sql`
  - Buat tabel `dusun` dengan seed 9 dusun (Soko, Melikan, Jamprit Wetan, Jamprit Kulon, Belikurip, Pagersari, Klerong, Tanjung, Banyuripan).
  - Tambah kolom `dusun_id` (nullable) ke `data_umum`, `data_pokja1-4`, `data_kegiatan_warga`, `data_bumil`.
  - Rename tabel `data_kegiatan_warga` → `data_rekap_dawis` (idempotent dengan IF EXISTS check).
  - Tambah kolom `dusun_nama` ke `audit_logs`.
  - Tambah kolom `dusun_id` (nullable) di tabel `users` untuk link role kader-dusun.
  - Update CHECK constraint `users.role` untuk include 9 role baru: `dusun_soko`, `dusun_melikan`, `dusun_jamprit_wetan`, `dusun_jamprit_kulon`, `dusun_belikurip`, `dusun_pagersari`, `dusun_klerong`, `dusun_tanjung`, `dusun_banyuripan`.
  - Tambah kolom `keterangan TEXT` ke `data_pokja1`, `data_pokja2`, `data_pokja3`, `data_pokja4`, `data_bumil` (untuk kolom KET di laporan resmi).
  - Tambah kolom Pokja II baru sesuai **Annex C** di `design.md` (`jml_warga_3_buta`, `kf_klp`, `kf_wrg`, `paud_sejenis`, `bkb_klp`, `bkb_ape_set_a`, `bkb_ape_set_b`, `kader_tutor_kf`, `kader_tutor_paud`, `kader_bkb`, `yg_dilatih_lp3pkk`, `yg_dilatih_tp3pkk`, `yg_dilatih_damaspkk`).
  - **DROP PERMANEN** kolom legacy `data_pokja2`: `rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg` (sudah dikonfirmasi user). PASTIKAN backup Supabase sebelum jalankan v5.
  - **DROP PERMANEN** kolom legacy `data_rekap_dawis`: `jml_dusun` (redundan, tiap baris sudah 1 dusun), `tiga_buta_l`, `tiga_buta_p` (digantikan single col `tiga_buta`), `ikut_industri` (tidak ada di laporan resmi). Lihat Annex F.
  - **TAMBAH kolom** `data_rekap_dawis`: `tiga_buta INTEGER DEFAULT 0` (col 17 — gabung L+P), `berkebutuhan_khusus INTEGER DEFAULT 0` (col 18, NEW).
  - Tambah kolom `akte_l`, `akte_p` ke `data_bumil` (split akte per gender — lihat Annex A).
  - Sediakan opsi A (archive via `RENAME TO *_archive_kecamatan`) dan opsi B (drop dengan instruksi `pg_dump`) sebagai komentar SQL — bukan dijalankan otomatis.
  - Tambah verifikasi prerequisite di awal script (gagal kalau tabel `report_periods` belum ada).
  - Idempotent: rerun aman.
  - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 5.5, 7.1, 8.1, 8.2_

- [x] 2. Update `supabase_schema.sql` (file source-of-truth)
  - Ganti seed `desa` block dengan seed `dusun` block (untuk env baru yang fresh install).
  - Tambah komentar di header file: "Untuk migrate dari schema lama, jalankan v5".
  - Pastikan semua `desa_id` references di skema dasar diubah menjadi `dusun_id` di file ini (tetapi v1-v4 file tidak diubah).
  - _Requirements: 1.1, 1.2, 7.4_

### Fase 2 — Backend helpers

- [x] 3. Buat `lib/dusun.js`
  - Export `getDusunList({ activeOnly })` query Supabase.
  - Export konstanta `DUSUN_LIST` (array nama statis untuk fallback/test).
  - _Requirements: 1.3, 2.1_

- [x] 4. Buat `lib/branding.js`
  - Export `BRAND` object dengan `organization`, `region`, `regency`, `fullTitle`, `unit`, `unitPlural`, `unitCount`.
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 5. Update `lib/auth.js` — extend ROLE_PERMISSIONS + canWriteRow
  - Tambah 9 role kader-dusun ke `ROLE_PERMISSIONS`: `dusun_soko`, `dusun_melikan`, `dusun_jamprit_wetan`, `dusun_jamprit_kulon`, `dusun_belikurip`, `dusun_pagersari`, `dusun_klerong`, `dusun_tanjung`, `dusun_banyuripan`. Setiap role: `tables: ['data_rekap_dawis'], scope: 'own_dusun'`.
  - Update existing role: `sekretaris.tables` ganti `data_kegiatan_warga` → `data_rekap_dawis`.
  - Export helper baru `canWriteRow(user, tableName, row)` — kembalikan true kalau scope `all` ATAU scope `own_dusun` && `user.dusun_id === row.dusun_id`.
  - Export `ROLE_TO_DUSUN_NAME` mapping untuk auto-assign `user.dusun_id` saat admin pilih role kader-dusun.
  - JWT payload: include `dusun_id` user (kalau ada) supaya tidak perlu round-trip DB tiap request.
  - _Requirements: 5.5, 5.6, 5.7, 5.8_

- [x] 6. Refactor `lib/audit.js`
  - Tambah parameter `dusunNama` ke `writeLog`. Tetap accept `desaNama` (deprecated) untuk backward-compat, tapi log warning jika dipakai.
  - Insert ke kolom `dusun_nama` di tabel `audit_logs`.
  - _Requirements: 1.6_

- [x] 7. Refactor `lib/api-handler.js`
  - Ganti semua `desa_id` → `dusun_id`, `from('desa')` → `from('dusun')`.
  - Update audit log call: passing `dusunNama` (alias `desaNama` dipertahankan di signature untuk backward-compat selama 1 release).
  - Update `onConflict` clause: `'dusun_id,tahun'` (atau `'dusun_id,tahun,bulan'` untuk bumil).
  - Tambah panggilan `canWriteRow(user, tableName, payload)` di POST/PATCH path; reject 403 + audit log "permission_denied" kalau gagal.
  - Untuk role kader-dusun: paksa `payload.dusun_id = user.dusun_id`, abaikan body input.
  - _Requirements: 1.2, 1.5, 5.5, 5.6_

- [x] 8. Refactor `lib/excel/importToSupabase.js`
  - Resolve `dusunName → dusun_id` (bukan `desaName → desa_id`).
  - Update `onConflict` clauses.
  - Update error message: "dusun '<nama>' tidak ditemukan".
  - _Requirements: 3.4_

- [x] 9. Refactor `lib/excel/previewDiff.js` & `lib/excel/sheetMap.js`
  - `previewDiff.js`: ganti `record.desa_id` → `record.dusun_id`.
  - `sheetMap.js`: rename key `'KEGIATAN WARGA'` → `'REKAP DAWIS'`, table `data_kegiatan_warga` → `data_rekap_dawis`. Tambah komentar "unit: dusun" di header.
  - Update `'POKJA II'.keys`: HAPUS `rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`. Tambah kolom Pokja II baru sesuai Annex C.
  - Update `'POKJA III'.keys`: tambah `keterangan`.
  - Update `'POKJA IV'.keys`: tambah `keterangan`.
  - Update `'REKAP DAWIS'.keys` (rename dari `'KEGIATAN WARGA'`): HAPUS `jml_dusun`, `tiga_buta_l`, `tiga_buta_p`, `ikut_industri`. Tambah `tiga_buta`, `berkebutuhan_khusus`. Urutan key sesuai Annex F (kolom 3-34).
  - _Requirements: 3.4_

- [x] 10. Refactor `lib/chartStats.js`
  - Ganti `desa_id` → `dusun_id` di rowMap & filledDesaIds. Rename var ke `filledDusunIds`.
  - _Requirements: 2.1_

- [x] 11. Update `lib/dataPages.js` — rename kegiatanWarga + Pokja I/II/III keterangan + Pokja II kolom baru + Bumil akte
  - Rename key `kegiatanWarga` → `rekapDawis`. Update `slug: 'rekap-dawis'`, `title: 'Rekapitulasi Dawis'`, `apiEndpoint: '/api/rekap-dawis'`, `tableName: 'data_rekap_dawis'`, `editPath: '/dashboard/rekap-dawis/edit'`.
  - Tambah field `keterangan` ke `pokja1.columns`, `pokja3.columns` & `pokja4.columns`.
  - Update `rekapDawis.columns` (sebelumnya `kegiatanWarga`): HAPUS `jml_dusun`, `tiga_buta_l`, `tiga_buta_p`, `ikut_industri`. Tambah `tiga_buta` ("3 Buta"), `berkebutuhan_khusus` ("Berkebutuhan khusus"). Order kolom sesuai mapping di Annex F.
  - Update `pokja2.columns` sesuai mapping di Annex C: HAPUS kolom legacy (`rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`). Tambah: `jml_warga_3_buta`, `kf_klp`, `kf_wrg`, `paud_sejenis`, `bkb_klp`, `bkb_ape_set_a`, `bkb_ape_set_b`, `kader_tutor_kf`, `kader_tutor_paud`, `kader_bkb`, `yg_dilatih_lp3pkk`, `yg_dilatih_tp3pkk`, `yg_dilatih_damaspkk`, `keterangan`.
  - Tambah `akte_l`, `akte_p`, `keterangan` ke `bumil.columns`. Hapus `akte_ada`/`akte_tidak` dari display (data DB tetap untuk backward compat).
  - _Requirements: 1.7, 3.2, 3.9_

### Fase 3 — API routes

- [x] 12. Buat route `/api/dusun/route.js`
  - GET: list dusun aktif, sort by `nomor_urut`. Auth: any logged-in user.
  - POST/PATCH/DELETE: admin-only (deferred — basic CRUD cukup, advanced UI di iterasi berikutnya).
  - _Requirements: 1.3_

- [x] 13. Refactor route `/api/desa/route.js`
  - Sementara: handler return `redirect(307, '/api/dusun')` untuk GET.
  - Tambah deprecation header `Deprecation: true` dan `Sunset: <date>`.
  - _Requirements: 1.5_

- [x] 14. Move route `/api/kegiatan-warga` → `/api/rekap-dawis`
  - Pakai `smartRelocate` untuk update import.
  - Buat handler baru di `/api/kegiatan-warga/route.js` yang redirect 308 ke `/api/rekap-dawis` (deprecation period 1 release).
  - _Requirements: 1.7_

- [x] 15. Update API routes data
  - Files: `app/api/data-umum/route.js`, `app/api/pokja1-4/route.js`, `app/api/bumil/route.js`, `app/api/rekap-dawis/route.js`.
  - Ganti `desa_id` → `dusun_id` di handler logic, query param parsing, dan response shape.
  - Selama transisi 1 release, accept body `{ desa_id }` sebagai alias `{ dusun_id }` dengan warning di log server.
  - Untuk `/api/rekap-dawis` POST/PATCH: panggil `canWriteRow` dari task 5; reject 403 + audit log kalau role kader-dusun coba edit dusun lain.
  - _Requirements: 1.2, 1.5, 2.1, 5.5, 5.6_

- [x] 16. Update `/api/rekap/route.js` & `/api/rekap/trend/route.js`
  - Ganti query `desa_id` → `dusun_id`.
  - Update completeness logic: per dusun, bukan per desa.
  - Update referensi `data_kegiatan_warga` → `data_rekap_dawis`.
  - _Requirements: 1.2, 1.7_

- [x] 17. Update `/api/import/excel/route.js`
  - Ganti param resolusi nama → `dusun.id`.
  - Update error message ke bahasa "dusun".
  - _Requirements: 3.4_

- [x] 18. Update `/api/export/excel/route.js` — Bumil + 4 Pokja pixel-perfect
  - **Untuk Bumil**: implementasikan layout sesuai **Annex A** di `design.md` (header 3 baris, label BULAN/TAHUN, multi-row header 18 kolom, 9 baris dusun + 1 baris Jumlah).
  - **Untuk Pokja I**: implementasikan layout sesuai **Annex B** (header "DATA KEGIATAN PKK / DESA: BELIKURIP / POKJA I", label TAHUN, multi-row header 19 kolom dengan latar **hijau**, 9 baris dusun uppercase + 1 baris JUMLAH).
  - **Untuk Pokja II**: implementasikan layout sesuai **Annex C** (header "POKJA II", multi-row header 36 kolom dengan grup PENDIDIKAN DAN KETRAMPILAN + PENGEMBANGAN KEH BERKOPERASI, sub-grup 4-level untuk TUTOR di KADER KHUSUS, paper size A3 landscape, 9 baris dusun uppercase + 1 baris JUMLAH).
  - **Untuk Pokja III**: implementasikan layout sesuai **Annex D** (header "POKJA III", multi-row header 19 kolom dengan grup JUMLAH KADER + PANGAN + JUMLAH INDUSTRI RUMAH TANGGA + JUMLAH RUMAH, latar header **biru muda** `#CCE5FF`, paper A4 landscape, 9 baris dusun uppercase + 1 baris JUMLAH).
  - **Untuk Pokja IV**: implementasikan layout sesuai **Annex E** (header "POKJA IV", multi-row header 26 kolom 4-level dengan grup JUMLAH KADER + KESEHATAN (POSYANDU + LANSIA sub-sub-grup) + KELESTARIAN LING HIDUP + PERENCANAAN SEHAT, latar header **kuning muda** `#FFFF99`, paper A3 landscape, 9 baris dusun uppercase + 1 baris JUMLAH).
  - **Untuk Rekap Dawis**: implementasikan layout sesuai **Annex F** (header 3 baris "CATATAN DATA DAN KEGIATAN WARGA / TP PKK DESA BELIKURIP KECAMATAN BATURETNO / TAHUN <tahun>", multi-row header 4 baris + nomor urut, 34 kolom dengan grup Jml Angg keluarga (Total/Balita L/P, PUS, WUS, Ibu Hamil/Menyusui, Lansia, 3 Buta, Berkebutuhan khusus), Jumlah Rumah, Sumber Air Keluarga, Makanan, Wrg yg mengikuti, KET (JKN/BPJS). Vertical text untuk kolom 19-24, 32-33. Paper A3 landscape, 9 baris dusun + 1 baris JUMLAH).
  - **Untuk tabel lain** (Data Umum saja): header "TP PKK Desa Belikurip", kolom pertama "DUSUN", group by `dusun_id`, format konsisten single-row header.
  - Pakai `exceljs` mergeCells + getCell pattern dari pseudocode di Annex A, B, C, D, E, F.
  - Border tipis di semua sel; sel kosong → 0; baris Jumlah = SUM formula.
  - Bumil RT/RW/Dawis: derive dari `data_rekap_dawis` join (Annex A mapping kolom 3-5).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 3.9_

- [x] 19. Buat helper `lib/pdfTable.js` untuk multi-row header
  - Helper `renderMultiHeaderTable(doc, { headers, rows, totalsRow, columnWidths, headerFill })` untuk pdfkit.
  - Header tree structure menerima 1, 2, atau 3 level.
  - Border, alignment, font weight, fill color bisa di-override per cell.
  - _Requirements: 3.1, 3.2, 3.9_

- [x] 20. Update PDF export untuk laporan Bumil + 4 Pokja
  - File: `app/api/export/pdf/route.js` (atau `app/api/reports/pdf/route.js` kalau sudah ada).
  - Bumil: pakai `lib/pdfTable.js` dengan struktur Annex A. Layout A4 landscape, margin 30.
  - Pokja I: pakai `lib/pdfTable.js` dengan struktur Annex B + headerFill hijau muda.
  - Pokja II: pakai `lib/pdfTable.js` dengan struktur Annex C, paper A3 landscape (atau A4 landscape scale 70%) margin 20, font 8pt.
  - Pokja III: pakai `lib/pdfTable.js` dengan struktur Annex D + headerFill biru muda. Layout A4 landscape, margin 30.
  - Pokja IV: pakai `lib/pdfTable.js` dengan struktur Annex E + headerFill kuning muda. Paper A3 landscape (atau A4 landscape scale 75%) margin 20, font 8pt.
  - Rekap Dawis: pakai `lib/pdfTable.js` dengan struktur Annex F. Paper A3 landscape margin 20, font 7pt (34 kolom — paling lebar).
  - _Requirements: 3.1, 3.2, 3.9_

- [x] 21. Update `/api/export/template/route.js`
  - Generate template Excel dengan 9 baris dusun Belikurip.
  - Sheet "DATA BUMIL" pakai layout Annex A. Sheet "POKJA I" pakai layout Annex B.
  - Sheet lain pakai single-row header dengan branding "TP PKK Desa Belikurip".
  - Rename sheet "KEGIATAN WARGA" → "REKAP DAWIS".
  - _Requirements: 3.4, 1.7_

- [x] 22. Update `/api/public/*` allowlist
  - Files relevan di `app/api/public/*`.
  - Allowlist tetap (kolom data tidak berubah). Response shape: `desa_id`/`desa_nama` → `dusun_id`/`dusun_nama`.
  - Update referensi tabel `data_kegiatan_warga` → `data_rekap_dawis` di whitelist.
  - _Requirements: 4.3, 1.7_

### Fase 4 — UI components

- [x] 23. Refactor `components/PokjaDataPage.js`
  - Rename state `desa`/`desaList` → `dusun`/`dusunList`.
  - Ganti label kolom "Desa" → "Dusun".
  - Endpoint: `/api/dusun`.
  - Mobile card: label "Dusun".
  - Read-only mode untuk role kader-dusun.
  - _Requirements: 2.1, 2.6, 5.7_

- [x] 24. Refactor `components/BumilDataPage.js`
  - Sama seperti PokjaDataPage. Ganti `desa_id` → `dusun_id` di data map & payload.
  - Tambah field input `akte_l`, `akte_p`, `keterangan` (kolom baru dari task 11).
  - _Requirements: 2.1, 2.6_

- [x] 25. Rename `components/KegiatanWargaPage.js` → `components/RekapDawisPage.js`
  - Pakai `smartRelocate` agar import otomatis update.
  - Update title "Catatan Data & Kegiatan Warga" → "Rekapitulasi Dawis".
  - Untuk role kader-dusun: filter client-side render hanya baris dusun mereka (defense in depth, server tetap enforce).
  - Header tampilkan label "Dusun: {namaDusun}" untuk role kader-dusun.
  - _Requirements: 1.7, 2.1, 5.5, 5.7_

- [x] 26. Refactor `components/DataStatsPage.js`
  - Ganti `desa_id` di prevMap → `dusun_id`.
  - Update fetch ke `/api/dusun`.
  - Mobile card scope ke per dusun.
  - _Requirements: 2.1, 2.6_

- [x] 27. Refactor `app/dashboard/page.js`
  - Matrix kelengkapan: kolom header "Dusun", click navigate `/dashboard/dusun/[id]`.
  - Trend chart: query `?dusun_ids=`.
  - Update referensi tabel `kegiatanWarga` → `rekapDawis`.
  - _Requirements: 2.1, 4.5, 1.7_

- [x] 28. Refactor `app/dashboard/reports/page.js`
  - Filter "Desa" → "Dusun".
  - Endpoint fetch `/api/dusun`.
  - Report builder konfigurasi: unit dusun.
  - Tambah opsi tabel "Rekapitulasi Dawis" (rename dari "Kegiatan Warga").
  - _Requirements: 3.6, 1.7_

- [x] 29. Refactor `app/dashboard/profile/page.js`
  - Tampilan audit log: pakai `dusun_nama` (fallback ke `desa_nama` untuk history lama).
  - _Requirements: 1.6_

- [x] 30. Move `app/dashboard/kegiatan-warga` → `app/dashboard/rekap-dawis`
  - Pakai `smartRelocate`.
  - Update sidebar nav label "Catatan Data & Kegiatan Warga" → "Rekapitulasi Dawis".
  - Update `lib/dataPages.js` slug & editPath (di task 11).
  - _Requirements: 1.7_

### Fase 5 — Public portal & drill-down

- [x] 31. Move `app/publik/desa/[id]/page.js` → `app/publik/dusun/[id]/page.js`
  - Pakai `smartRelocate` agar import otomatis update.
  - Refactor body: ganti label "Desa" → "Dusun", ganti exclude list `['desa_id', 'tahun', 'bulan']` → `['dusun_id', 'tahun', 'bulan']`.
  - _Requirements: 4.2, 4.3_

- [x] 32. Buat `app/publik/desa/[id]/page.js` (redirect stub)
  - Server component: `redirect('/publik/dusun/' + params.id)` dengan status 301.
  - _Requirements: 4.4, 8.3_

- [x] 33. Move `app/dashboard/desa/[id]/page.js` → `app/dashboard/dusun/[id]/page.js`
  - Sama dengan task 31.
  - _Requirements: 2.1_

- [x] 34. Buat `app/dashboard/desa/[id]/page.js` (redirect stub)
  - Server-side redirect ke `/dashboard/dusun/[id]`.
  - _Requirements: 2.1_

- [x] 35. Update `app/publik/page.js`
  - Title: "Portal Publik PKK Desa Belikurip".
  - Tabel header: "Dusun".
  - Link href: `/publik/dusun/${d.id}`.
  - _Requirements: 4.1, 4.2, 6.1_

### Fase 6 — Branding & copy

- [x] 36. Sweep "Kecamatan Baturetno" → "Desa Belikurip" untuk konteks unit data
  - Files: `app/page.js` (welcome), `app/login/page.js`, `app/layout.js` metadata, semua subtitle di `lib/dataPages.js`.
  - Tetap: alamat ("Kecamatan Baturetno, Wonogiri" sebagai lokasi geografis boleh tetap di footer).
  - Pakai konstanta `BRAND` dari `lib/branding.js`.
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 37. Update `lib/dataPages.js` subtitle
  - "Lampiran 4-20b - Kecamatan Baturetno" → "Lampiran 4-20b - Desa Belikurip".
  - "Lampiran 4-17b - TP PKK Kecamatan Baturetno" → "Lampiran 4-17b - TP PKK Desa Belikurip".
  - _Requirements: 6.1, 6.2_

- [x] 38. Update OnboardingTour copy
  - File: `components/OnboardingTour.js` (kalau ada).
  - Ganti referensi "13 desa" → "9 dusun".
  - _Requirements: 6.2_

- [x] 39. Update README & PROJECT_REVIEW.md
  - Section "About" / "Cakupan": jelaskan scope baru + 9 role kader-dusun.
  - _Requirements: 6.2, 7.4_

### Fase 7 — AI assistant

- [x] 40. Update `app/api/chat/route.js`
  - System prompt: ganti "Kecamatan Baturetno, 13 desa" → "Desa Belikurip, Kecamatan Baturetno, 9 dusun" + list nama.
  - Function `update_desa_data` rename → `update_dusun_data`. Backward-compat: terima alias function name.
  - Parameter `desa_nama` → `dusun_nama` (alias dipertahankan).
  - Update `VALID_TABLES`: `data_kegiatan_warga` → `data_rekap_dawis`.
  - Update `VALID_COLUMNS`: tambah `keterangan` di pokja1, tambah `akte_l`/`akte_p`/`keterangan` di bumil.
  - Untuk role kader-dusun: AI hanya boleh propose update tabel `data_rekap_dawis` di dusun mereka sendiri.
  - _Requirements: 5.1, 5.5, 5.6, 6.3, 1.7_

- [x] 41. Update AI context preparation di `lib/aiContext.js` (kalau ada)
  - Ganti query data context ke `dusun_id`.
  - Filter tahun aktif ±1 tetap.
  - _Requirements: 6.3_

### Fase 8 — Tests & docs

- [ ] 42. Update `__tests__/api-handler.test.js`
  - Mock data fixtures pakai `dusun_id`, `dusun: [{ id, nama, nomor_urut }]`.
  - Test name update: "GET should return rows joined with dusun".
  - _Requirements: 8.5_

- [ ] 43. Update `__tests__/dataQuality.test.js` (jika ada fixture desa)
  - Ganti fixture nama dari desa Baturetno ke dusun Belikurip.
  - _Requirements: 8.5_

- [x] 44. Update `__tests__/excel-import.test.js`
  - Sample sheet row: "Soko" (bukan nama desa lama).
  - Resolve check: `dusun.id`.
  - Sheet name "REKAP DAWIS" (bukan "KEGIATAN WARGA").
  - _Requirements: 3.4, 8.5, 1.7_

- [x] 45. Tambah `__tests__/auth-row-permission.test.js`
  - Test bahwa user role `dusun_soko` bisa write ke baris `data_rekap_dawis` dengan `dusun_id` matching.
  - Test bahwa user role `dusun_soko` di-reject 403 saat write ke dusun lain.
  - Test bahwa user role `dusun_soko` di-reject 403 saat write ke tabel selain `data_rekap_dawis`.
  - Test bahwa role `pokja1` tetap bisa write ke semua dusun di `data_pokja1`.
  - _Requirements: 5.5, 5.6, 5.7, 5.8_

- [ ] 46. Tambah `__tests__/publik-allowlist.test.js`
  - Test bahwa response `/api/public/data` dan `/publik/dusun/[id]` tidak expose kolom user/email/password.
  - _Requirements: 4.3_

- [ ] 47. Tambah `__tests__/dusun-redirect.test.js`
  - Test bahwa GET `/publik/desa/9` redirect 301 ke `/publik/dusun/9`.
  - Test bahwa GET `/dashboard/desa/9` (logined) redirect ke `/dashboard/dusun/9`.
  - Test bahwa GET `/api/kegiatan-warga` redirect 308 ke `/api/rekap-dawis`.
  - _Requirements: 4.4, 8.3, 1.7_

- [ ] 48. Tambah test export pixel-perfect untuk Bumil + 4 Pokja + Rekap Dawis
  - `__tests__/bumil-export.test.js`: test struktur header 3 baris (title, "JUMLAH"/"JUMLAH IBU"/"JUMLAH BAYI"/"Jml Balita Meninggal"), subheader "Lahir L/P", "Akte Kelahiran L/P", "Meninggal L/P". 9 + 1 baris Jumlah dengan formula SUM.
  - `__tests__/pokja1-export.test.js`: test struktur header 3 baris (title, "JUMLAH KADER"/"PENGHAYATAN..."/"GOTONG ROYONG"/"KET"), latar **hijau** di header, 9 baris dusun uppercase + 1 baris JUMLAH.
  - `__tests__/pokja2-export.test.js`: test struktur header 4 baris ("PENDIDIKAN DAN KETRAMPILAN"/"PENGEMBANGAN KEH BERKOPERASI"/"KET", sub-grup PAKET A/B/C/KF/BKB/KADER KHUSUS/YG SDH DI LATIH/PRA KOPERASI/KOPERASI HUKUM, level 3 PEMULA/MADYA/UTAMA/MANDIRI + leaf JML KLP/PSRTA, level 4 TUTOR → KF/PAUD Sejenis). 36 kolom. 9 + 1 baris JUMLAH SUM kolom 3-35.
  - `__tests__/pokja3-export.test.js`: test struktur header 3 baris (title, "JUMLAH KADER"/"PANGAN"/"JUMLAH INDUSTRI RUMAH TANGGA"/"JUMLAH RUMAH"/"KETERANGAN", sub-grup MAKANAN POKOK/PEMANFAATAN PEKARANGAN HATINYA PKK), latar **biru muda**. 19 kolom. 9 + 1 baris JUMLAH SUM kolom 3-18.
  - `__tests__/pokja4-export.test.js`: test struktur header 4 baris (title, "JUMLAH KADER"/"KESEHATAN"/"KELESTARIAN LING HIDUP"/"PERENCANAAN SEHAT"/"KET", sub-grup POSYANDU dengan LANSIA sub-sub-grup, JML RUMAH YG MEMILIKI, JML KRT YG MENGGUNAKAN AIR, JML ASEPTOR KB), latar **kuning muda** `#FFFF99`. 26 kolom. 9 + 1 baris JUMLAH SUM kolom 3-25.
  - `__tests__/rekap-dawis-export.test.js`: test struktur header 3 baris title (CATATAN.../TP PKK DESA BELIKURIP KECAMATAN BATURETNO/TAHUN), 4-baris table header + 1 baris nomor urut, 34 kolom (No, Nama dusun, Jml RW/RT/dawis/KRT/KK, Jml Angg keluarga grup, Jumlah Rumah grup, Sumber Air Keluarga grup, Makanan grup, Wrg yg mengikuti grup, KET JKN/BPJS), 9 + 1 baris JUMLAH SUM kolom 3-33.
  - _Requirements: 3.1, 3.2, 3.7, 3.9, 8.5_

- [x] 49. Update `AGENTS.md`
  - Tambah section "Migrasi Level Dusun (v5)" dengan ringkasan: tabel `dusun` baru, rename `data_kegiatan_warga` → `data_rekap_dawis`, 9 role kader-dusun + row-level permission, opsi archive, urutan migration.
  - _Requirements: 7.4, 1.7, 5.5_

- [x] 50. Verifikasi build & test
  - Stop dev server (kalau jalan).
  - `npm test` → semua suite hijau.
  - `npm run build` → clean.
  - Smoke test manual:
    - `/`, `/login`, `/dashboard`, `/publik`, `/publik/dusun/1` render benar.
    - Login sebagai `dusun_soko` → hanya bisa edit baris Soko di `/dashboard/rekap-dawis/edit`. Tabel lain read-only.
    - Download Excel Bumil → visual diff dengan gambar Annex A. Download Excel Pokja I → visual diff dengan gambar Annex B.
  - _Requirements: 8.5_

### Fase 9 — Deployment & post-migrate cleanup (deferred)

- [ ] 51. Deferred: Migration v6 — drop kolom `desa_id`
  - Setelah confirm 1 release stable di production, tulis `supabase_schema_updates_v6.sql`:
    - Drop UNIQUE constraint lama `(desa_id, tahun)`.
    - `ALTER TABLE ... DROP COLUMN desa_id`.
    - `DROP TABLE desa CASCADE` (kalau opsi A archive sudah dilakukan, drop tabel `desa` lama yang sudah jadi `desa_archive_kecamatan`).
  - Deploy tanpa breaking karena code sudah tidak reference `desa_id`.
  - _Requirements: 1.4, 8.3_

- [ ] 52. Deferred: Hapus alias backward-compat
  - Hapus accept `desa_id` di body API, hapus accept `desa_nama` di audit, hapus alias function name `update_desa_data`.
  - Hapus redirect handler `/api/desa/route.js` dan `/api/kegiatan-warga/route.js`.
  - _Requirements: 1.5, 1.7_

## Notes

- Semua task di Fase 2-8 bisa di-PR per-file kalau mau review granular, tapi disarankan satu PR per fase untuk konsistensi.
- Default opsi data lama: **archive** (opsi A). Admin pilih opsi B kalau yakin tidak butuh.
- Test fixture nama dusun harus exact: pakai `DUSUN_LIST` dari `lib/dusun.js`.
- Selama migrasi, `desa_id` & `dusun_id` koeksistensi di DB → safe rollback aplikasi (deploy bertahap aman).
- File spec ini menjadi single source of truth untuk migrasi. Update spec dulu sebelum mengubah scope implementasi.
- 9 role kader-dusun pakai row-level permission yang di-enforce di application layer (Supabase service role bypass RLS).

## Task Dependency Graph

Wave-based parallelization plan: tasks dalam wave yang sama bisa dieksekusi paralel; wave berikutnya menunggu wave sebelumnya selesai.

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2], "label": "Schema migration v5 + base schema update" },
    { "wave": 2, "tasks": [3, 4, 5, 6, 8, 9, 10, 11], "label": "Independent backend helpers (auth, audit, lib utils, dataPages)" },
    { "wave": 3, "tasks": [7], "label": "api-handler.js (depends on auth.canWriteRow + audit + dusun helpers)" },
    { "wave": 4, "tasks": [12, 13, 14], "label": "/api/dusun + redirects (legacy desa & kegiatan-warga)" },
    { "wave": 5, "tasks": [15, 16, 17, 18, 19, 20, 21, 22], "label": "Data CRUD + rekap + import/export pixel-perfect (Annex A & B) + public API" },
    { "wave": 6, "tasks": [23, 24, 25, 26, 27, 28, 29, 30], "label": "UI components refactor + rename KegiatanWarga → RekapDawis" },
    { "wave": 7, "tasks": [31, 32, 33, 34, 35], "label": "Public portal + drill-down moves & redirects" },
    { "wave": 8, "tasks": [36, 37, 38, 39], "label": "Branding & copy sweep" },
    { "wave": 9, "tasks": [40, 41], "label": "AI assistant context update (incl. role kader-dusun scope)" },
    { "wave": 10, "tasks": [42, 43, 44, 45, 46, 47, 48, 49], "label": "Tests & docs (incl. row-permission & pixel-perfect export tests)" },
    { "wave": 11, "tasks": [50], "label": "Final build & test verification" },
    { "wave": 12, "tasks": [51, 52], "label": "Deferred post-deploy cleanup" }
  ],
  "criticalPath": [1, 2, 5, 7, 15, 18, 23, 25, 31, 36, 40, 50]
}
```

Critical path: Task 1 → 2 → 5 → 7 → 15 → 18 → 23 → 25 → 31 → 36 → 40 → 50.
Tasks 3, 4, 5, 6, 8-11 di Fase 2 paralel-friendly (file berbeda).
Tasks 15-22 di Fase 3 paralel asalkan tidak edit file yang sama.
Tasks 23-30 di Fase 4 paralel-friendly (komponen berbeda).
