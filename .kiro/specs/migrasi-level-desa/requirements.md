# Requirements Document

## Introduction

Aplikasi PKK Rekapitulasi saat ini dibangun untuk skala **TP PKK Kecamatan Baturetno** dengan 13 desa sebagai unit data terkecil. Pengguna ingin mengubah scope menjadi **TP PKK Desa Belikurip** dengan 9 dusun sebagai unit data terkecil. Format laporan resmi (contoh: Rekapitulasi Data Bumil) memang menampilkan rincian per dusun, jadi data harus disimpan per dusun, bukan agregat per desa.

Perubahan ini berlaku untuk **semua tabel data**, bukan hanya Bumil:

- Data Umum
- Pokja I (Pancasila & Gotong Royong)
- Pokja II (Pendidikan & Koperasi)
- Pokja III (Pangan & Sandang)
- Pokja IV (Kesehatan & Lingkungan)
- Kegiatan Warga
- Data Bumil (per bulan)

Tujuan migrasi:

- Data tersimpan per dusun, bukan per desa.
- Laporan Excel/Word/PDF ter-generate dengan layout resmi per dusun.
- Public portal menampilkan agregat tingkat desa dengan rincian per dusun.
- AI assistant, audit log, dan notifikasi mengacu ke "TP PKK Desa Belikurip".
- Migrasi data lama (13 desa) bisa di-archive atau di-drop dengan instruksi yang jelas.

## Glossary

- **Dusun**: unit administrasi terkecil di Desa Belikurip yang menjadi unit data utama setelah migrasi. Ada 9 dusun final.
- **Desa Belikurip**: scope baru aplikasi (sebelumnya "Kecamatan Baturetno").
- **Pokja I-IV**: kelompok kerja PKK (1: Pancasila & Gotong Royong, 2: Pendidikan & Koperasi, 3: Pangan & Sandang, 4: Kesehatan & Lingkungan).
- **Bumil**: ibu hamil; tabel `data_bumil` menyimpan rekap per dusun per bulan.
- **Rekapitulasi Dawis**: tabel `data_rekap_dawis` (rename dari `data_kegiatan_warga`) yang menyimpan data agregat per dawis (dasawisma) di setiap dusun. Tabel ini di-edit oleh role kader-dusun.
- **Kader-dusun**: 9 role baru (`dusun_soko`, `dusun_melikan`, ..., `dusun_banyuripan`) yang scope write-nya hanya 1 dusun di tabel `data_rekap_dawis`. Read-everyone, write-own.
- **Period lock**: workflow draft → submitted → approved → locked per tabel × tahun (× bulan untuk bumil).
- **Column override**: fitur admin untuk rename atau hide kolom standar di UI/export tanpa drop kolom DB.
- **Archive table**: salinan tabel data lama (13 desa) yang di-rename ke `*_archive_kecamatan` agar data tidak hilang permanen.

### Daftar Dusun (Final, urutan harus dipertahankan)

1. Soko
2. Melikan
3. Jamprit Wetan
4. Jamprit Kulon
5. Belikurip
6. Pagersari
7. Klerong
8. Tanjung
9. Banyuripan

## Ruang Lingkup

### Termasuk

- Schema database: ganti unit data dari `desa` ke `dusun`.
- Rename tabel `data_kegiatan_warga` → `data_rekap_dawis` (terminologi baru "Rekapitulasi Dawis").
- Migrasi data lama (13 desa) — opsi archive atau drop sesuai keputusan user.
- UI input: semua halaman edit data ganti dropdown/baris dari "desa" ke "dusun".
- Export Excel/Word/PDF: header laporan jadi "TP PKK Desa Belikurip", baris per dusun, layout pixel-perfect untuk Bumil (Annex A) & Pokja I (Annex B).
- Public portal: agregat per dusun, bukan per desa.
- AI assistant: konteks data + tool function call disesuaikan.
- Auth/role: tambah 9 role kader-dusun (`dusun_soko`..`dusun_banyuripan`) dengan write-scope row-level di tabel `data_rekap_dawis` saja. Tambah kolom `users.dusun_id`.
- Audit log: kolom `desa_nama` diganti `dusun_nama`.
- Period lock workflow: tetap per tabel × tahun (× bulan untuk bumil).
- Branding & copy: "Kecamatan Baturetno" → "Desa Belikurip", "Wonogiri" tetap.

### Tidak termasuk (deferred)

- Modul data per keluarga / per warga (struktur baru, butuh design tersendiri).
- Multi-desa (kalau nanti mau jadi platform untuk banyak desa).

## Asumsi & Batasan

- Aplikasi dipakai oleh perangkat desa & kader PKK, bukan kecamatan.
- Workflow approval (draft → submitted → approved → locked) tetap relevan tapi sekarang di skala desa: pokja kader input → ketua/sekretaris PKK desa approve → admin desa lock.
- Default admin & seed user yang ada (admin/admin123) tetap dipakai sebagai bootstrap.
- Public portal `/publik` tetap ada, tapi sekarang menampilkan agregat per dusun dalam Desa Belikurip, bukan per desa di kecamatan.
- Data lama 13 desa (jika ada di production Supabase) harus diputuskan: di-archive ke tabel `*_archive_kecamatan_2026`, atau di-drop dengan dump backup terlebih dahulu.

## Requirements

### Requirement 1: Schema database menyimpan data per dusun

**User Story:** Sebagai admin desa, saya ingin sistem menyimpan data PKK per dusun supaya laporan resmi yang menampilkan rincian per dusun bisa dihasilkan tanpa input manual ulang.

#### Acceptance Criteria

1. WHEN admin men-setup database baru THEN sistem SHALL membuat tabel `dusun(id, nama, nomor_urut, is_active)` yang berisi 9 dusun Belikurip.
2. WHEN sistem mengelola data PKK THEN semua tabel data (`data_umum`, `data_pokja1-4`, `data_rekap_dawis`, `data_bumil`) SHALL memakai foreign key `dusun_id` (bukan `desa_id`).
3. WHEN admin menambahkan dusun baru atau menonaktifkan dusun lama THEN sistem SHALL menyediakan API admin untuk CRUD dusun, dengan validasi unique constraint pada nama.
4. WHERE data lama 13 desa ada di database, sistem SHALL menyediakan opsi migrasi: (a) archive ke tabel `*_archive_kecamatan` atau (b) drop dengan instruksi backup di SQL script.
5. IF user mencoba akses endpoint dengan `desa_id` (legacy) THEN sistem SHALL return 400/404 dengan pesan jelas bahwa parameter sekarang `dusun_id`.
6. WHEN audit log dicatat THEN field `desa_nama` SHALL diganti menjadi `dusun_nama` dengan migration yang mempertahankan history kalau diperlukan.
7. WHEN migration v5 dijalankan THEN tabel `data_kegiatan_warga` SHALL di-rename menjadi `data_rekap_dawis` (terminologi baru sesuai laporan resmi). Endpoint `/api/kegiatan-warga` SHALL juga di-rename ke `/api/rekap-dawis`, dengan redirect 308 dari endpoint lama untuk backward-compat 1 release.
8. WHEN tabel `users` di-update THEN sistem SHALL menambahkan kolom opsional `dusun_id INTEGER REFERENCES dusun(id)` untuk men-link user kader-dusun ke dusun spesifik mereka.

### Requirement 2: UI input data per dusun untuk semua tabel

**User Story:** Sebagai kader pokja desa, saya ingin mengisi data Pokja I-IV / Bumil / Data Umum / Kegiatan Warga per dusun di tabel yang sudah dikenal, supaya saya tidak perlu belajar UI baru.

#### Acceptance Criteria

1. WHEN user membuka halaman edit (mis. `/dashboard/pokja1/edit`) THEN sistem SHALL menampilkan 9 baris dusun (sesuai daftar Belikurip) sebagai pengganti 13 desa.
2. WHEN user mengisi nilai di sel kolom dan menekan tab/blur THEN sistem SHALL autosave dengan dirty state, sticky banner, dan keyboard `Ctrl+S` seperti behavior existing.
3. WHEN user mengubah filter tahun/bulan THEN sistem SHALL fetch ulang data per dusun untuk periode itu, dengan validasi spike detection (nilai >3x tahun lalu) tetap berfungsi.
4. WHEN user role tidak punya permission `canWrite('data_pokjaX')` THEN sistem SHALL menampilkan mode read-only dengan tag "Hanya Lihat" di header (tidak berubah dari behavior existing).
5. WHERE column overrides (rename/hide) ada, behavior existing SHALL tetap berfungsi tanpa modifikasi tambahan.
6. WHEN tabel terlalu lebar di mobile THEN sistem SHALL menampilkan card-per-dusun (mengikuti pola mobile card existing).

### Requirement 3: Export laporan format resmi per dusun

**User Story:** Sebagai sekretaris desa, saya ingin men-download laporan PKK dalam format Excel/Word/PDF dengan layout persis seperti laporan resmi yang dibawa ke kecamatan, tanpa edit manual di Word/Excel.

#### Acceptance Criteria

1. WHEN user men-download Excel/Word/PDF rekapitulasi data bumil bulan tertentu THEN sistem SHALL menghasilkan file dengan layout pixel-perfect sesuai **Annex A — Bumil Report Template** di `design.md` (header tiga baris, label BULAN/TAHUN di kiri atas, tabel 18 kolom dengan 3 baris header bertingkat, 9 baris dusun + 1 baris Jumlah).
2. WHEN file di-render THEN urutan kolom 1-18 SHALL persis: NO, Nama Dusun, RT, RW, Dawis, Hamil, Melahirkan, Nifas, Meninggal, Lahir L, Lahir P, Akte L, Akte P, Meninggal Bayi L, Meninggal Bayi P, Balita Meninggal L, Balita Meninggal P, Keterangan.
3. WHEN tabel di-render THEN baris SHALL berurutan persis: 1. Soko, 2. Melikan, 3. Jamprit Wetan, 4. Jamprit Kulon, 5. Belikurip, 6. Pagersari, 7. Klerong, 8. Tanjung, 9. Banyuripan, lalu baris "Jumlah" sebagai total.
4. WHEN user men-download laporan untuk tabel selain Bumil THEN sistem SHALL menghasilkan file dengan format/header sesuai standar PKK Desa untuk masing-masing tabel (Pokja I-IV, Data Umum, Kegiatan Warga). Format harus konsisten: header "TP PKK Desa Belikurip", baris per dusun.
5. WHERE data dusun untuk periode tertentu belum diisi, sel SHALL diisi 0 (bukan kosong) dan baris dusun tetap muncul.
6. WHEN report builder dipakai THEN konfigurasi tabel × periode × dusun × kolom SHALL bekerja sama seperti existing tapi dengan dusun sebagai unit (bukan desa).
7. WHEN baris "Jumlah" di-render THEN sel SHALL berisi sum vertikal dari 9 baris dusun untuk setiap kolom numerik (kolom 3-17). Kolom NO, Nama Dusun, dan Keterangan SHALL kosong di baris Jumlah.
8. WHEN kolom RT/RW/Dawis (kolom 3-5) di-render untuk laporan Bumil THEN nilai SHALL diambil dari `data_rekap_dawis` untuk dusun & tahun yang sama (snapshot tahunan), dengan fallback ke `data_bumil.jml_rt`/`jml_rw`/`jml_dasa_wisma` jika `data_rekap_dawis` kosong.
9. WHEN user men-download laporan Pokja I THEN sistem SHALL menghasilkan file dengan layout pixel-perfect sesuai **Annex B — Pokja I Report Template** di `design.md` (header 3 baris "DATA KEGIATAN PKK / DESA : BELIKURIP / POKJA I", label TAHUN di kiri, tabel 19 kolom multi-row header dengan grup PENGHAYATAN DAN PENGAMALAN PANCASILA + GOTONG ROYONG, 9 baris dusun + 1 baris JUMLAH).

### Requirement 4: Public portal level desa

**User Story:** Sebagai warga desa Belikurip, saya ingin melihat data PKK desa saya di portal publik tanpa login, supaya saya tahu progress dan kondisi PKK di desa saya.

#### Acceptance Criteria

1. WHEN warga mengunjungi `/publik` THEN sistem SHALL menampilkan ringkasan agregat tingkat desa (total KK, jiwa, posyandu, dll) plus tabel per dusun dengan status kelengkapan.
2. WHEN warga klik baris dusun THEN sistem SHALL navigate ke `/publik/dusun/[id]` dengan detail agregat per tabel dusun tersebut.
3. WHEN portal publik di-render THEN sistem SHALL menggunakan allowlist tabel & kolom yang sama seperti existing (tidak expose users, audit_logs, dll).
4. WHERE existing route `/publik/desa/[id]` masih dipakai, sistem SHALL redirect ke `/publik/dusun/[id]` (server redirect 301) ATAU URL diubah dengan jelas.
5. WHEN warga melihat data trend THEN sistem SHALL menampilkan trend 5 tahun untuk dusun terpilih atau agregat desa.

### Requirement 5: Auth, role, dan workflow per dusun

**User Story:** Sebagai admin desa, saya ingin role yang sudah ada tetap berfungsi tapi disesuaikan dengan struktur desa, plus saya ingin menambah 9 role kader-dusun yang masing-masing hanya boleh edit data Rekapitulasi Dawis di dusun mereka sendiri.

#### Acceptance Criteria

1. WHEN user pokja1-4 login THEN sistem SHALL membatasi write access ke tabel `data_pokja{n}` sesuai role mereka. Role pokja menulis ke semua dusun di tabel mereka (scope tabel, bukan per dusun).
2. WHEN user submit periode pokja THEN sistem SHALL menggunakan workflow yang sama (draft → submitted → approved → locked) tapi sekarang per tabel di tahun tertentu (per bulan untuk bumil), bukan per desa.
3. WHERE notifikasi muncul, sistem SHALL menggunakan label "TP PKK Desa Belikurip" alih-alih "TP PKK Kecamatan Baturetno".
4. IF role `sekretaris` punya akses ke `data_umum`, `data_rekap_dawis`, `data_bumil` THEN behavior tetap, hanya scope-nya jadi level desa.
5. WHEN admin membuat user dengan salah satu dari 9 role baru `dusun_soko`, `dusun_melikan`, `dusun_jamprit_wetan`, `dusun_jamprit_kulon`, `dusun_belikurip`, `dusun_pagersari`, `dusun_klerong`, `dusun_tanjung`, `dusun_banyuripan` THEN sistem SHALL otomatis link user ke `dusun_id` yang sesuai dan membatasi write access HANYA ke tabel `data_rekap_dawis` (alias baru untuk `data_kegiatan_warga`) DAN HANYA ke baris dengan `dusun_id` matching role mereka.
6. IF user dengan role kader-dusun mencoba write ke tabel selain `data_rekap_dawis` ATAU ke baris dusun lain THEN sistem SHALL reject dengan 403 Forbidden + audit log entry "permission_denied".
7. WHEN role kader-dusun read data THEN sistem SHALL boleh read semua dusun (untuk konteks dashboard) tapi hanya bisa edit dusun mereka sendiri (read-everyone, write-own).
8. WHEN admin assign role pokja1-4 ke user THEN behavior existing (scope tabel, semua dusun) tetap dipertahankan.

### Requirement 6: Branding dan copy

**User Story:** Sebagai user di desa Belikurip, saya ingin aplikasi terasa milik desa saya sendiri, bukan kecamatan.

#### Acceptance Criteria

1. WHEN aplikasi di-render THEN judul/header/title metadata SHALL menggunakan "TP PKK Desa Belikurip" alih-alih "TP PKK Kecamatan Baturetno".
2. WHERE copy menyebutkan "13 desa" atau "Kecamatan Baturetno" sebagai unit data utama, copy SHALL diganti ke "9 dusun" dan "Desa Belikurip".
3. WHEN AI assistant menjawab pertanyaan THEN konteks system prompt SHALL menyebutkan "Desa Belikurip, Kecamatan Baturetno, Kabupaten Wonogiri" dan list 9 dusun yang valid.
4. WHEN footer / about / login page di-render THEN identitas SHALL "TP PKK Desa Belikurip · Kecamatan Baturetno · Kabupaten Wonogiri".
5. WHERE asset visual seperti `bg-baturetno.png` masih relevan (peta wilayah), asset boleh tetap dipakai sebagai dekorasi background.

### Requirement 7: Migrasi data lama 13 desa

**User Story:** Sebagai admin yang sedang migrate dari level kecamatan ke level desa, saya butuh kepastian bahwa data lama tidak hilang begitu saja, atau setidaknya saya tahu cara backup-nya sebelum drop.

#### Acceptance Criteria

1. WHEN admin menjalankan migration script v5 THEN script SHALL membuat tabel `dusun` baru dengan 9 dusun seed, menyediakan opsi A default (drop semua data lama setelah backup dump dengan instruksi `pg_dump` di komentar), dan opsi B (rename tabel data lama ke `*_archive_kecamatan` agar data tetap ada tapi tidak diakses aplikasi).
2. WHEN aplikasi production di-deploy ulang setelah migration THEN endpoint legacy SHALL tidak menerima request (return error jelas), DAN aplikasi tidak crash karena schema baru.
3. WHERE testing/staging env perlu re-seed THEN sistem SHALL menyediakan SQL script untuk hapus + re-seed dusun cepat.
4. WHEN dokumentasi migration di-update THEN AGENTS.md & PROJECT_REVIEW.md SHALL menjelaskan urutan: jalankan v1-v4 (untuk env baru), atau jalankan v5 saja (untuk env yang sudah pakai v4).

### Requirement 8: Backward compatibility selama migrasi

**User Story:** Sebagai developer/admin, saya ingin migrasi yang aman: kalau ada masalah, saya bisa rollback tanpa kehilangan data dan downtime minimal.

#### Acceptance Criteria

1. WHEN migration v5 dijalankan THEN sistem SHALL idempotent — boleh dijalankan ulang tanpa error.
2. IF user menjalankan v5 di env yang belum pernah jalan v1-v4 THEN script SHALL keluarkan error jelas dengan pesan "jalankan v1-v4 dulu".
3. WHEN deployment baru di-rollout THEN aplikasi SHALL tidak menampilkan data legacy "13 desa" di mana-mana (kecuali di tabel archive yang tidak diakses aplikasi).
4. WHERE export laporan menggunakan data archive (untuk laporan periode lama), fitur ini DEFERRED (bukan scope sekarang).
5. WHEN cypress/jest test dijalankan setelah migration THEN semua test existing SHALL pass tanpa adjustment besar — kecuali test yang memang spesifik tentang "desa" jadi "dusun".

## Yang TIDAK menjadi requirement

1. Tidak ada multi-tenant / multi-desa di iterasi ini. Aplikasi hanya untuk satu desa: Belikurip.
2. Tidak ada modul data perorangan/keluarga/dasawisma.
3. Tidak ada perubahan AI provider (tetap Gemini).
4. Tidak ada perubahan auth provider (tetap JWT custom + Supabase service role).
5. Tidak ada migrasi otomatis data 13 desa lama ke 9 dusun (data lama bukan padanan dusun, jadi tidak masuk akal di-mapping otomatis).

## Pertanyaan terbuka

1. **Data lama 13 desa di Supabase production: di-archive atau di-drop?** — Default: di-archive ke `*_archive_kecamatan` supaya tidak hilang permanen. User boleh drop manual setelah yakin tidak butuh.
2. **Apakah masih perlu role `sekretaris`?** — Default: ya, tetap ada (kalau di desa ada sekretaris PKK desa).
3. **Perlu role baru "kepala dusun" / "kader dusun" yang scope-nya per dusun?** — Default: tidak. Role lama cukup. User boleh tolak nanti kalau memang butuh granular per dusun.
4. **URL `/publik/desa/[id]` dipertahankan atau diganti `/publik/dusun/[id]`?** — Default: ganti ke `/publik/dusun/[id]` supaya istilahnya konsisten. Redirect 301 dari `/publik/desa/[id]` opsional kalau peduli SEO.
5. **Bagaimana dengan data Bumil yang punya kolom `bulan`? Apakah RT/RW/Dawis di gambar (kolom 3,4,5) bagian dari schema bumil bulanan, atau ditarik dari tabel lain (data_umum / data_kegiatan_warga)?** — Default: kolom RT/RW/Dawis di laporan Bumil ditarik dari `data_kegiatan_warga` (yang sudah punya `jml_rt`, `jml_rw`, `jml_dawis`) untuk dusun & tahun yang sama, supaya tidak duplikasi data per bulan. Kalau user mau RT/RW/Dawis disimpan di `data_bumil` per bulan, saya tambah kolom.
