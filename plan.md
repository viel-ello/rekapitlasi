# Prompt Implementasi Fitur dan UI/UX

Anda adalah senior product-minded full-stack web developer dan UI/UX engineer. Tugas Anda adalah meningkatkan aplikasi Sistem Rekapitulasi Data PKK agar lebih berguna, nyaman dipakai, dan siap untuk operasional harian admin, sekretaris, dan operator Pokja.

Konteks proyek:
- Aplikasi menggunakan Next.js App Router 16.2.5.
- Baca `AGENTS.md` dan dokumentasi lokal Next.js di `node_modules/next/dist/docs/` sebelum mengubah kode.
- Baca `PROJECT_REVIEW.md` untuk memahami hasil review keamanan, bug, dan rekomendasi sebelumnya.
- Jangan merusak perbaikan keamanan yang sudah ada.
- Jangan percaya role dari client/localStorage untuk keputusan server.
- Semua fitur baru yang membaca atau mengubah data sensitif tetap harus mengikuti auth/permission server-side.

Tujuan utama:
1. Membuat aplikasi lebih membantu pekerjaan rekap harian.
2. Membuat proses input, validasi, import, export, dan review data lebih aman dan jelas.
3. Meningkatkan dashboard agar berisi insight operasional, bukan hanya tampilan statistik.
4. Membuat UI tabel besar lebih nyaman di desktop dan mobile.
5. Menambahkan fitur bertahap tanpa memperbesar risiko keamanan.

Prioritas fitur P0:
1. Status kelengkapan data per desa/tahun/bulan.
   - Tampilkan status: lengkap, belum lengkap, perlu dicek.
   - Buat ringkasan jumlah desa lengkap dan belum lengkap di dashboard.
   - Sediakan filter berdasarkan tahun, bulan, dan jenis data.

2. Validasi data otomatis.
   - Deteksi nilai kosong, negatif, bukan angka, dan lonjakan tidak wajar.
   - Tampilkan warning inline di tabel.
   - Jangan menghalangi semua input, tetapi beri peringatan yang jelas sebelum simpan/export.

3. Import Excel dengan preview dan diff.
   - Sebelum import, tampilkan data yang akan ditambah, diubah, dilewati, dan gagal.
   - Tampilkan nama desa yang tidak cocok.
   - Wajib ada konfirmasi sebelum data benar-benar disimpan.
   - Jangan langsung mutate database setelah upload tanpa preview.

4. Template Excel resmi.
   - Tambahkan tombol download template untuk Data Umum, Pokja I-IV, Kegiatan Warga, dan Bumil.
   - Template harus mengikuti kolom database dan format yang mudah di-import kembali.

Prioritas fitur P1:
1. Dashboard tren.
   - Grafik tren KK, jiwa, dasa wisma, posyandu, bumil, dan indikator utama lain.
   - Tampilkan perbandingan tahun berjalan dengan tahun sebelumnya.
   - Highlight data yang perlu perhatian.

2. Audit log explorer.
   - Tambahkan filter berdasarkan user, action, tabel, desa, dan rentang tanggal.
   - Tampilkan detail perubahan dengan jelas.
   - Jika memungkinkan, simpan before/after untuk perubahan penting.

3. Workflow submit dan approval.
   - Operator/Pokja mengisi data.
   - Sekretaris/admin melakukan review.
   - Data yang sudah disetujui bisa dikunci.
   - Admin dapat membuka ulang periode jika diperlukan.

4. Lock periode laporan.
   - Admin dapat mengunci tahun/bulan tertentu.
   - Mutasi ke periode terkunci harus ditolak server-side kecuali admin membuka lock.

Prioritas UI/UX:
1. Dashboard operasional.
   - Tambahkan KPI cards: desa lengkap, desa belum lengkap, data perlu dicek, aktivitas terakhir.
   - Tambahkan quick actions: import Excel, export laporan, buka audit log, kelola user.
   - Jangan membuat dashboard terlalu dekoratif; fokus pada kejelasan dan pekerjaan harian.

2. Tabel data.
   - Pertahankan sticky kolom desa.
   - Tambahkan search desa.
   - Tambahkan sticky header.
   - Tambahkan group header kolom.
   - Tambahkan status save: belum disimpan, menyimpan, tersimpan, gagal.
   - Pertimbangkan tombol "Simpan Semua Perubahan" agar autosave tidak membingungkan.
   - Highlight cell yang baru berubah atau memiliki warning.

3. Admin page.
   - Rapikan tab atau pisah menjadi halaman: users, desa, columns, logs, backup.
   - Tambahkan loading, empty, dan error state yang jelas.
   - Tambahkan konfirmasi destruktif yang detail untuk delete/restore.
   - Jangan diam jika fetch gagal.

4. Mobile UX.
   - Untuk tabel besar, buat mode card per desa.
   - Tambahkan navigasi cepat antar desa.
   - Pastikan tombol aksi cukup besar untuk touch.
   - Hindari horizontal scroll ekstrem sebagai satu-satunya pengalaman mobile.

5. Accessibility.
   - Tambahkan `aria-label` untuk tombol icon-only.
   - Pastikan input punya label.
   - Pastikan focus state terlihat.
   - Pastikan kontras teks kecil cukup.
   - Hormati `prefers-reduced-motion`.

6. Visual polish.
   - Gunakan hijau sebagai identitas utama, tetapi jangan semua elemen bernuansa hijau.
   - Gunakan amber untuk warning, merah untuk destructive/error, biru untuk info.
   - Konsistenkan radius, spacing, ukuran tombol, dan state hover/focus.
   - Pastikan logo tidak broken dan asset tersedia di `public`.

Batasan implementasi:
- Jangan melakukan refactor besar yang tidak perlu.
- Jangan mengubah schema produksi tanpa migration/SQL yang jelas.
- Jangan menambahkan library besar kecuali manfaatnya jelas.
- Jangan menurunkan keamanan demi UX.
- Jangan menjalankan `npm audit fix --force`.

Rencana kerja:
1. Audit halaman dan komponen yang ada.
2. Buat desain data untuk status kelengkapan dan validasi.
3. Implementasikan fitur P0 lebih dulu.
4. Tambahkan UI states yang jelas.
5. Tambahkan test untuk logic validasi dan permission.
6. Jalankan `npm test` dan `npm run build`.
7. Lakukan smoke test alur utama:
   - login,
   - buka dashboard,
   - input data,
   - import preview,
   - export,
   - audit log,
   - akses non-admin.

Definition of Done:
- Dashboard menunjukkan status kelengkapan data yang berguna.
- Tabel data memberi warning dan status penyimpanan yang jelas.
- Import Excel tidak langsung mutate tanpa preview/konfirmasi.
- Template Excel tersedia.
- UI admin punya loading/error/empty state.
- Mobile tidak bergantung sepenuhnya pada tabel lebar.
- Auth dan permission server-side tetap aman.
- `npm test` dan `npm run build` berjalan, atau kegagalan dijelaskan dengan alasan spesifik.
- Perubahan terdokumentasi ringkas.
