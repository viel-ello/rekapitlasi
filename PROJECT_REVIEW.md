# Review Proyek Rekapitlasi PKK

Tanggal review: 2026-05-11

Dokumen ini merangkum hasil testing singkat, analisis kelemahan, serta saran fitur dan tampilan untuk aplikasi Sistem Rekapitulasi Data PKK Kecamatan Baturetno.

## Ringkasan Eksekutif

Aplikasi sudah memiliki pondasi fitur yang cukup kaya: login, dashboard, data Pokja, data umum, data bumil, import Excel, export Word/Excel, audit log, role, dan AI assistant. Namun sebelum pengembangan fitur baru, prioritas paling tinggi adalah menutup celah keamanan API.

Masalah utama saat ini adalah beberapa endpoint admin dan export dapat diakses tanpa login, role pada endpoint chat dipercaya dari body request client, serta kredensial default admin masih aktif. Dalam kondisi aplikasi terekspos ke jaringan publik, ini berisiko menyebabkan kebocoran data dan perubahan data oleh pihak tidak berwenang.

## Hasil Testing

Testing dilakukan terhadap dev server lokal di `http://localhost:3000`.

### Yang Berjalan

- `GET /` berhasil `200`.
- `GET /api/auth/me` tanpa sesi mengembalikan `401`, ini benar.
- `POST /api/auth` dengan `admin/admin123` berhasil login dan mengembalikan cookie `auth-token`.
- `GET /api/export/excel?tahun=2026` berhasil menghasilkan file Excel.
- `GET /api/export/word?tahun=2026` berhasil menghasilkan file Word.

### Temuan Testing

- `GET /api/admin/users` dapat diakses tanpa login dan mengembalikan daftar user.
- `GET /api/admin/desa` dapat diakses tanpa login.
- `GET /api/admin/logs` dapat diakses tanpa login.
- `GET /api/admin/columns` dapat diakses tanpa login.
- `DELETE /api/admin/users?id=999999` mengembalikan `200` tanpa login.
- `GET /api/export/excel?tahun=2026` dapat diakses tanpa login.
- `GET /api/export/word?tahun=2026` dapat diakses tanpa login.
- Halaman admin memanggil `/api/admin/desa/{id}`, tetapi route yang tersedia adalah `/api/admin/desa`, sehingga update desa dari UI berpotensi `404`.
- Halaman admin memanggil `/api/admin/restore`, tetapi route restore sebenarnya berada di `POST /api/admin/backup`, sehingga fitur restore dari UI berpotensi `404`.
- `npm test` gagal karena `better-sqlite3` dipakai di `lib/db.js`, tetapi tidak ada di dependency terpasang.
- `npm run build` gagal dengan `EPERM unlink .next/...`, kemungkinan karena dev server aktif sedang mengunci folder `.next`.
- `npm audit --omit=dev` menemukan vulnerability moderate dari dependency internal Next/PostCSS. Jangan langsung menjalankan `npm audit fix --force` karena rekomendasinya berisiko downgrade besar.

## Kelemahan Prioritas

### Critical

1. Endpoint admin belum diproteksi secara konsisten.

   File terkait:
   - `app/api/admin/users/route.js`
   - `app/api/admin/desa/route.js`
   - `app/api/admin/logs/route.js`
   - `app/api/admin/columns/route.js`

   Dampak:
   - Data user, desa, dan audit log bisa dibaca tanpa login.
   - Beberapa operasi admin bisa dipanggil tanpa autentikasi.

   Saran:
   - Buat helper server seperti `requireAuth(request, allowedRoles)`.
   - Terapkan ke semua route admin untuk semua method, bukan hanya sebagian method.

2. Kredensial default admin masih aktif.

   File terkait:
   - `lib/seed.js`

   Dampak:
   - Jika aplikasi online dan password belum diganti, akun admin mudah diambil alih.

   Saran:
   - Rotasi password admin.
   - Jangan hardcode password produksi.
   - Pada first run, paksa admin mengganti password.
   - Simpan default password hanya di dokumentasi lokal atau env khusus development.

3. Endpoint chat mempercayai role dari request body.

   File terkait:
   - `app/api/chat/route.js`

   Dampak:
   - Client dapat mengirim body dengan role lebih tinggi, misalnya `admin`.
   - Jika AI melakukan function call update data, kontrol akses dapat dilewati.

   Saran:
   - Jangan terima `user.role` dari body.
   - Ambil user dari cookie JWT melalui `getAuthUser(request)`.
   - Validasi ulang role dan izin di server sebelum setiap mutasi database.

4. Supabase service role digunakan secara global.

   File terkait:
   - `lib/supabase.js`

   Dampak:
   - Jika endpoint lupa auth, service role dapat melewati RLS Supabase.

   Saran:
   - Pisahkan client server admin dan client public.
   - Service role hanya dipakai di route server yang benar-benar butuh.
   - Tetap terapkan authorization di route handler walau memakai service role.

### High

1. Dashboard dijaga dari client-side saja.

   File terkait:
   - `app/dashboard/layout.js`

   Dampak:
   - Request awal ke halaman dashboard/admin masih bisa return `200`.
   - Proteksi sebenarnya bergantung pada fetch client setelah halaman dimuat.

   Saran:
   - Tambahkan proteksi server-side, misalnya melalui Proxy/Middleware atau check di route/page server.
   - Tetap anggap semua API sebagai public endpoint yang wajib auth sendiri.

2. Export Word/Excel terbuka tanpa login.

   File terkait:
   - `app/api/export/excel/route.js`
   - `app/api/export/word/route.js`

   Dampak:
   - Semua data rekap dapat diunduh tanpa autentikasi.

   Saran:
   - Minimal butuh user login.
   - Pertimbangkan role khusus untuk export.
   - Tambahkan audit log untuk aktivitas export.

3. Route UI admin tidak cocok dengan route API.

   File terkait:
   - `app/dashboard/admin/page.js`
   - `app/api/admin/desa/route.js`
   - `app/api/admin/backup/route.js`

   Dampak:
   - Update desa dan restore database dari UI gagal.

   Saran:
   - Ubah fetch UI ke endpoint yang benar, atau buat route dinamis yang memang diharapkan UI.

4. Strategi database bercampur antara Supabase dan SQLite.

   File terkait:
   - `lib/db.js`
   - `lib/supabase.js`
   - `package.json`

   Dampak:
   - Test gagal.
   - Maintenance menjadi membingungkan.

   Saran:
   - Pilih satu sumber data utama.
   - Jika Supabase adalah target produksi, pindahkan test ke Supabase mock/test client.
   - Jika SQLite tetap dibutuhkan, tambahkan `better-sqlite3` ke dependency dan pastikan migrasi/test konsisten.

### Medium

1. `JWT_SECRET` wajib ada saat import module auth.

   Dampak:
   - Test utility seperti `canWrite` ikut gagal jika env tidak tersedia.

   Saran:
   - Pisahkan permission map dari module JWT.
   - Tambahkan `.env.test` atau setup env test.

2. Validasi input belum konsisten.

   Contoh:
   - Role pada create/update user perlu whitelist.
   - `table_name` pada dynamic column perlu whitelist.
   - Field numeric perlu validasi range dan tipe.

   Saran:
   - Gunakan schema validator seperti Zod.
   - Terapkan validasi di server, bukan hanya UI.

3. Mutasi data lewat autosave `onBlur` berpotensi mengejutkan user.

   Dampak:
   - User bisa tidak sadar data sudah tersimpan.
   - Banyak request kecil.

   Saran:
   - Tambahkan indikator "belum disimpan", "menyimpan", dan "tersimpan".
   - Pertimbangkan tombol "Simpan semua perubahan" per desa atau per halaman.

4. Audit log belum menjadi kontrol keamanan penuh.

   Saran:
   - Pastikan `writeLog` di-await atau errornya ditangani.
   - Catat IP, user agent, action detail, sebelum/sesudah untuk perubahan penting.

5. Asset login berpotensi hilang.

   File terkait:
   - `app/page.js`

   Catatan:
   - Login page memakai `/logo.png`, tetapi file tersebut tidak terlihat di daftar `public`.

   Saran:
   - Tambahkan `public/logo.png` atau ubah referensi ke asset yang tersedia.

## Saran Fitur

### Fitur Data dan Operasional

1. Status kelengkapan data per desa.

   Tampilkan indikator desa mana yang sudah lengkap, belum lengkap, atau perlu revisi untuk setiap tahun/bulan.

2. Validasi kualitas data.

   Tambahkan deteksi otomatis untuk:
   - Nilai kosong yang wajib diisi.
   - Nilai negatif.
   - Lonjakan tidak wajar dibanding tahun sebelumnya.
   - Total laki-laki/perempuan yang tidak konsisten.

3. Workflow submit dan approval.

   Role Pokja mengisi data, sekretaris/admin melakukan review, lalu data dikunci setelah disetujui.

4. Riwayat revisi per baris.

   User dapat melihat perubahan terakhir, siapa yang mengubah, dan apa nilai sebelum/sesudahnya.

5. Lock periode laporan.

   Admin dapat mengunci tahun atau bulan tertentu agar data final tidak berubah tanpa izin.

6. Import Excel dengan preview dan diff.

   Sebelum import, tampilkan:
   - Data yang akan ditambah.
   - Data yang akan berubah.
   - Data yang gagal karena format salah.
   - Nama desa yang tidak cocok.

7. Template Excel resmi.

   Sediakan tombol unduh template per Pokja supaya format input seragam.

8. Backup terjadwal.

   Tambahkan backup otomatis harian/mingguan, daftar versi backup, dan tombol restore dari versi tertentu.

9. Report builder.

   User dapat memilih tahun, desa, Pokja, dan kolom lalu export ke Excel/PDF/Word.

10. Dashboard tren lintas tahun.

   Tampilkan grafik perkembangan KK, jiwa, posyandu, bumil, data Pokja, dan indikator kunci lain.

11. Ranking dan perbandingan desa.

   Tambahkan view perbandingan antar desa untuk metrik tertentu, misalnya jumlah kader, posyandu, rumah sehat, dan lain-lain.

12. Notifikasi dan reminder.

   Sistem mengingatkan desa/Pokja yang belum mengisi data mendekati tenggat.

13. Manajemen role lebih granular.

   Izin tidak hanya per role, tetapi juga per action:
   - read
   - create
   - update
   - delete
   - export
   - import
   - approve

14. Profil pengguna.

   Tambahkan halaman profil untuk ganti password, melihat role, last login, dan aktivitas terakhir.

15. Mode read-only publik internal.

   Jika ada kebutuhan transparansi, buat halaman ringkasan publik yang hanya menampilkan agregat, bukan data mentah penuh.

### Fitur AI Assistant

1. AI memakai auth server, bukan user dari client.

   AI harus tahu role dari JWT server-side.

2. Mode dry-run untuk perubahan data.

   Jika AI hendak mengubah data, tampilkan preview dulu dan minta konfirmasi user.

3. Jawaban AI mencantumkan sumber data.

   Misalnya: "berdasarkan data Pokja IV tahun 2026".

4. Batasi tool AI.

   AI hanya boleh memanggil fungsi yang sudah divalidasi server, dengan whitelist table dan kolom.

5. AI untuk analisis, bukan hanya chat.

   Contoh:
   - "Desa mana yang datanya belum lengkap?"
   - "Bandingkan data posyandu 2024 sampai 2026."
   - "Cari anomali data ibu hamil."

## Saran Tampilan dan UX

### Login Page

- Pastikan logo benar-benar tersedia dan tidak broken.
- Kurangi dekorasi bergerak bila performa mobile terasa berat.
- Tambahkan pesan singkat saat gagal login karena rate limit.
- Tambahkan link "lupa password" atau instruksi menghubungi admin.

### Dashboard

- Tambahkan KPI cards yang langsung menjawab kondisi utama:
  - Total desa aktif.
  - Persentase kelengkapan data.
  - Jumlah data yang belum lengkap.
  - Aktivitas terakhir.
- Tambahkan filter tahun global yang memengaruhi seluruh dashboard.
- Tambahkan grafik tren sederhana untuk metrik utama.
- Tambahkan "quick actions": import, export, tambah user, backup.

### Tabel Data Pokja

- Sticky kolom desa sudah bagus, pertahankan.
- Tambahkan group header agar kolom panjang lebih mudah dipahami.
- Tambahkan pencarian desa.
- Tambahkan mode density: compact dan comfortable.
- Tambahkan highlight cell yang baru berubah.
- Tambahkan validasi inline untuk nilai tidak wajar.
- Tambahkan status autosave yang jelas.
- Pertimbangkan tombol "Simpan semua" untuk mengurangi request saat banyak edit.

### Admin Page

- Pisahkan tab admin ke URL, misalnya:
  - `/dashboard/admin/users`
  - `/dashboard/admin/desa`
  - `/dashboard/admin/logs`
  - `/dashboard/admin/backup`
- Tambahkan guard UI berdasarkan role admin.
- Tambahkan filter audit log berdasarkan user, action, tabel, desa, dan tanggal.
- Tambahkan konfirmasi yang lebih detail untuk delete/restore.
- Pada restore, tampilkan nama file, ukuran file, dan waktu backup saat ini.

### Mobile

- Untuk tabel besar, horizontal scroll saja belum cukup.
- Tambahkan mode "card per desa" untuk layar kecil.
- Tambahkan tombol cepat pindah desa.
- Pastikan tombol aksi tidak terlalu kecil di layar sentuh.

### Visual Design

- Saat ini warna hijau dominan dan cocok dengan tema PKK/desa, tetapi perlu aksen sekunder yang lebih terkontrol agar tidak terasa satu warna.
- Gunakan warna amber hanya untuk warning/action penting, bukan dekorasi berlebih.
- Konsistenkan radius card dan button agar UI terasa rapi.
- Gunakan icon button dengan tooltip untuk aksi berulang seperti edit, hapus, refresh, download.

### Accessibility

- Tambahkan `aria-label` untuk tombol icon-only.
- Pastikan semua input punya label.
- Pastikan focus state terlihat jelas.
- Pastikan kontras teks kecil cukup kuat.
- Tambahkan `prefers-reduced-motion` untuk mengurangi animasi bagi user yang sensitif.

### Performance

- Pertimbangkan `next/font` atau self-host font daripada `@import` Google Fonts di CSS.
- Hindari fetch data besar berulang tanpa cache/client state yang jelas.
- Untuk tabel besar, pertimbangkan virtualized table jika jumlah desa/kolom bertambah.
- AI endpoint saat ini mengambil konteks semua tahun dan banyak tabel; ini bisa mahal dan lambat. Batasi konteks sesuai pertanyaan/tahun.

## Roadmap Prioritas

### Fase 0 - Keamanan Wajib

- Tambahkan helper auth server.
- Proteksi semua route admin.
- Proteksi export/import.
- Perbaiki endpoint chat agar role diambil dari JWT.
- Rotasi password admin dan secret.
- Pisahkan penggunaan Supabase service role.
- Tambahkan test unauthorized access.

### Fase 1 - Stabilitas

- Perbaiki dependency/test `better-sqlite3`.
- Tambahkan `.env.test` atau setup env test.
- Perbaiki mismatch endpoint admin desa dan restore.
- Pastikan build bisa berjalan setelah dev server dimatikan.
- Tambahkan error handling UI untuk response non-array/non-200.

### Fase 2 - UX Data Entry

- Status autosave jelas.
- Validasi inline.
- Search/filter desa.
- Completion status.
- Import preview dan diff.
- Template Excel resmi.

### Fase 3 - Reporting dan Monitoring

- Dashboard tren.
- Report builder.
- Audit log explorer.
- Backup terjadwal.
- Approval workflow.

### Fase 4 - AI Assistant Aman

- Dry-run dan konfirmasi sebelum mutasi.
- Sumber data pada jawaban.
- Tool whitelist server-side.
- Deteksi anomali data.
- Ringkasan otomatis data belum lengkap.

## Checklist Perbaikan Teknis

- [ ] Buat `requireAuth(request, allowedRoles)` atau helper serupa.
- [ ] Terapkan helper ke `app/api/admin/users/route.js`.
- [ ] Terapkan helper ke `app/api/admin/desa/route.js`.
- [ ] Terapkan helper ke `app/api/admin/logs/route.js`.
- [ ] Terapkan helper ke `app/api/admin/columns/route.js`.
- [ ] Terapkan helper ke `app/api/export/excel/route.js`.
- [ ] Terapkan helper ke `app/api/export/word/route.js`.
- [ ] Terapkan helper ke `app/api/chat/route.js`.
- [ ] Hapus dependency role dari body request chat.
- [ ] Rotasi password `admin/admin123`.
- [ ] Rotasi `JWT_SECRET`.
- [ ] Review penggunaan `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Perbaiki fetch `/api/admin/desa/{id}`.
- [ ] Perbaiki fetch `/api/admin/restore`.
- [ ] Putuskan strategi SQLite vs Supabase.
- [ ] Perbaiki test suite.
- [ ] Tambahkan test endpoint admin tanpa auth harus `401/403`.
- [ ] Tambahkan `public/logo.png` atau ubah path logo.

## Catatan Next.js

Berdasarkan panduan lokal Next.js di `node_modules/next/dist/docs/`, Route Handler di `app/api/**/route.js` adalah endpoint publik dan tidak ikut terlindungi oleh layout. Karena itu, authorization harus dilakukan langsung di Route Handler atau helper server yang dipanggil Route Handler.

Auth check di layout client hanya membantu pengalaman pengguna, tetapi tidak cukup sebagai kontrol keamanan.

## Prompt Implementasi Perbaikan

Gunakan prompt berikut bila ingin meminta AI coding agent atau developer lain melakukan perbaikan proyek ini secara menyeluruh.

```text
Anda adalah senior full-stack web developer dan security-minded reviewer. Tugas Anda adalah memperbaiki proyek Next.js ini berdasarkan dokumen PROJECT_REVIEW.md sampai aman, stabil, dan siap dikembangkan lebih lanjut.

Konteks penting:
- Proyek memakai Next.js App Router versi 16.2.5.
- Ikuti instruksi AGENTS.md: baca panduan Next lokal di node_modules/next/dist/docs/ sebelum mengubah kode terkait route handler, auth, atau struktur App Router.
- Jangan menghapus perubahan user yang tidak terkait.
- Jangan menjalankan destructive command seperti git reset --hard.
- Jangan menjalankan npm audit fix --force karena dapat menyebabkan downgrade besar.
- Prioritaskan keamanan API sebelum polish UI.

Tujuan utama:
1. Tutup semua celah akses tanpa autentikasi.
2. Pastikan role dan permission selalu ditentukan server-side dari JWT/cookie, bukan dari request body atau localStorage.
3. Perbaiki bug endpoint admin UI yang 404.
4. Perbaiki test/build agar dapat menjadi quality gate.
5. Tambahkan peningkatan UX paling penting tanpa memperbesar risiko.

Langkah kerja wajib:
1. Audit struktur repo, package.json, route handlers, auth helper, Supabase client, dashboard layout, dan admin page.
2. Baca dokumentasi lokal Next.js yang relevan:
   - Route Handlers
   - Authentication
   - Environment Variables
   - Proxy/Middleware bila dipakai untuk proteksi route UI
3. Buat helper auth server yang reusable, misalnya:
   - getRequiredUser(request)
   - requireAuth(request, allowedRoles)
   - requirePermission(request, action/table)
4. Terapkan helper tersebut ke semua endpoint sensitif:
   - app/api/admin/users/route.js
   - app/api/admin/desa/route.js
   - app/api/admin/logs/route.js
   - app/api/admin/columns/route.js
   - app/api/admin/backup/route.js
   - app/api/import/excel/route.js
   - app/api/export/excel/route.js
   - app/api/export/word/route.js
   - app/api/chat/route.js
   - app/api/chat/import-confirm/route.js
   - semua POST/PUT/DELETE route data rekap
5. Pastikan endpoint admin tanpa cookie valid mengembalikan 401 atau 403.
6. Pastikan endpoint export tanpa cookie valid tidak mengunduh data.
7. Perbaiki app/api/chat/route.js:
   - Jangan percaya user.role dari body.
   - Ambil user dari getAuthUser(request).
   - Jika tidak login, return 401.
   - Role dan allowedTables harus berasal dari JWT/server.
   - Validasi table_name dan nama kolom dengan whitelist sebelum update.
   - Untuk mutasi via AI, lakukan dry-run/preview bila feasible; minimal wajib validasi server-side sebelum update.
8. Perbaiki app/dashboard/admin/page.js:
   - Fetch update desa harus sesuai route yang tersedia, atau buat route dinamis yang benar.
   - Restore database harus memanggil endpoint yang benar.
   - Tambahkan handling response error agar UI tidak diam saat gagal.
9. Perbaiki kredensial default:
   - Jangan hardcode password produksi admin/admin123.
   - Jika tetap ada seeding development, gated dengan env development/test.
   - Dokumentasikan bahwa password default wajib diganti.
10. Review lib/supabase.js:
   - Pisahkan service role server-only dari anon client bila diperlukan.
   - Pastikan service role tidak dipakai dari client component.
   - Jangan expose secret ke browser.
11. Putuskan strategi test database:
   - Jika SQLite test masih dipertahankan, tambahkan dependency better-sqlite3 dan pastikan test memakai DATABASE_PATH test.
   - Jika Supabase menjadi satu-satunya backend, update test agar tidak bergantung pada lib/db.js lama.
12. Tambahkan atau perbaiki test:
   - unauthenticated admin endpoints harus 401/403
   - non-admin tidak boleh akses admin mutation
   - export tanpa login ditolak
   - chat tidak menerima role dari body
   - canWrite/permission mapping tetap benar
   - endpoint UI admin yang diperbaiki tidak 404
13. Jalankan verifikasi:
   - npm test
   - npm run build
   - smoke test endpoint utama via HTTP
14. Jika build gagal karena dev server mengunci .next, hentikan dev server dengan cara aman atau jalankan build setelah proses dev server berhenti.

Prioritas implementasi:
P0 - Keamanan wajib:
- Proteksi semua endpoint admin/export/chat.
- Role dari JWT/server saja.
- Rotasi/hilangkan default admin password.
- Test unauthorized access.

P1 - Stabilitas:
- Perbaiki mismatch route admin desa dan restore.
- Perbaiki test dependency/database.
- Pastikan build berhasil.
- Tambahkan error handling UI.

P2 - UX cepat:
- Tambahkan status loading/error yang jelas di admin page.
- Tambahkan feedback gagal pada fetch admin/desa/logs/columns.
- Pastikan asset logo tidak broken.
- Tambahkan aria-label untuk tombol icon-only yang disentuh.

P3 - Fitur lanjutan setelah aman:
- Completion status per desa/tahun.
- Import preview dan diff.
- Template Excel resmi.
- Audit log explorer dengan filter.
- Dashboard tren dan report builder.
- Workflow approval dan lock periode.

Definition of Done:
- Tidak ada endpoint admin sensitif yang return data tanpa auth.
- Tidak ada export data tanpa auth.
- Chat/AI tidak bisa menaikkan role dari request body.
- Semua mutasi penting memvalidasi role server-side.
- UI admin untuk update desa dan restore tidak lagi 404.
- Test suite berjalan atau kegagalannya dijelaskan dengan alasan spesifik dan rencana lanjut.
- Build production berjalan.
- Perubahan terdokumentasi ringkas di akhir pekerjaan.

Laporkan hasil akhir dalam format:
1. Ringkasan perubahan
2. File yang diubah
3. Hasil test/build
4. Risiko tersisa
5. Saran langkah berikutnya
```


---

# Update 2026-05-11 — Implementasi perbaikan & fitur baru

Diberi catatan terpisah supaya bagian review awal di atas tidak diubah.

## Yang sudah diperbaiki

### Bug fungsional
- Fix endpoint ganti password di `Sidebar.js` (sebelumnya memanggil `/api/auth/change-password` dengan `oldPassword/newPassword`; sekarang `/api/auth/password` dengan `currentPassword/newPassword`).
- `Topbar.js` tombol Profil Saya, Ganti Password, Keluar sekarang berfungsi (tombol bel di-disable sementara sampai sistem notifikasi ada).
- Endpoint AI `gemini-1.5-flash` yang sudah deprecated diganti default `gemini-flash-latest`. Dapat di-override via env `GEMINI_MODEL`.
- Logo hilang: `/logo.png` sekarang punya `onError` fallback ke `/map-baturetno.svg` di login & sidebar.
- Route `app/api/admin/backup` yang masih memakai SQLite `fs.readFileSync` diganti 410 Gone — tab Database dihapus dari admin UI, diganti "Import Excel" + tombol unduh template.
- `next.config.mjs` `serverExternalPackages: ['better-sqlite3']` dihapus (tidak ada dependency SQLite).
- `lib/audit.js` dibuat `async` dan semua pemanggil sekarang `await writeLog(...)` supaya log tidak hilang di serverless.
- Dead imports `ROLE_TABLE_MAP`, `parseExcel`, `canWrite` di `app/api/chat/route.js` dibersihkan.
- AI upload Excel: tambah validasi ekstensi `.xlsx` di samping magic bytes PK.
- `VALID_TABLES` di chat route sekarang konsisten dengan `ROLE_PERMISSIONS` admin (include `data_kegiatan_warga`).

### Security & stabilitas
- `lib/supabase.js` fail-fast saat env tidak ada. Disediakan alias `supabaseAdmin` untuk pemakaian eksplisit.
- `middleware.js` → `proxy.js` (konvensi Next.js 16). Selain cek cookie, sekarang ikut `jwtVerify` sebelum pass ke halaman dashboard. Token invalid di-clear otomatis.
- AI chat: konteks DB dibatasi tahun aktif ±1 (dari sebelumnya semua tahun), chat history dibatasi 12 pesan terakhir.

### Fitur baru
- **Rename & sembunyikan kolom standar**. Tabel `table_column_overrides`. Admin UI di `/dashboard/admin` → tab "Kolom" → subtab "Kolom Standar". Label override diterapkan di input page, stats page, export Excel, dan template. Kolom hidden otomatis dikecualikan dari completeness check. Data tetap aman di DB (hide reversible).
- Halaman **/dashboard/profile** — info akun, daftar permission, ganti password.
- Mobile card untuk `BumilDataPage` (sebelumnya hanya `PokjaDataPage`).
- Dashboard "Aktivitas Terakhir" sekarang relative time ("2 jam lalu") alih-alih "Baru saja".
- Completeness logic: kolom kosong tidak lagi otomatis membuat record INCOMPLETE (kolom opsional tahunan tidak menghukum status desa). Hanya "tidak ada data sama sekali" yang incomplete; selain itu NEEDS_CHECK (ada error/warning) atau COMPLETE.

## Yang belum dikerjakan (next steps)

- Workflow submit/approval & period lock (tabel `report_periods` sudah disiapkan di schema, tapi UI & guard server belum dibangun).
- Audit log explorer dengan filter user/tabel/tanggal (saat ini hanya list 100 terakhir).
- Import preview v2 dengan checkbox per baris.
- Dry-run / preview untuk function call AI mutate.
- `next/font` untuk Google Fonts (saat ini masih `@import`).
- Integrasi notifikasi (tombol bel sementara disabled).
- `lib/rate-limit.js` atomic via SQL RPC (saat ini masih select → update).

## Cara migrate

1. Jalankan `supabase_schema.sql` (sekali).
2. Jalankan `supabase_schema_updates.sql` (sekali).
3. Jalankan `supabase_schema_updates_v2.sql` (script terbaru untuk `table_column_overrides`, `rate_limits`, audit log before/after, `report_periods`).
4. Pastikan `.env.local` punya `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `GEMINI_API_KEY`.
5. Opsional: set `GEMINI_MODEL=gemini-flash-latest` (atau model lain, mis. `gemini-2.5-flash`).
6. Tambahkan `public/logo.png` jika ingin menampilkan logo kustom (fallback otomatis ke map baturetno).
7. `npm run build`, `npm test`, lalu `npm start`.
