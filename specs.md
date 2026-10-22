# Lusion.co — UI/UX Reference Specification

> Dokumen ini merekam pola UI/UX yang dapat diamati pada situs publik Lusion dan menerjemahkan pelajaran yang relevan menjadi arahan desain untuk aplikasi Rekapitlasi TP PKK Desa Belikurip. Ini adalah spesifikasi referensi, bukan klaim tentang implementasi internal Lusion atau permintaan untuk menyalin situsnya.

## 1. Ruang lingkup dan metode

- Target: [https://lusion.co/](https://lusion.co/) dan [https://lusion.co/projects](https://lusion.co/projects).
- Metode: REA `capture_browser_scenario` menjalankan Chromium terkelola dan mengambil DOM, accessibility tree, URL, screenshot, serta console/page errors.
- Kondisi yang direkam: viewport desktop 1440 × 1000, tema terang, preferensi reduced motion, tanpa cookie atau storage pengguna. Homepage ditunggu 10 detik; halaman Projects ditunggu 7 detik.
- Jenis bukti: replay browser terkendali. Interaksi yang dilakukan REA hanya membuka URL dan menunggu. Tidak ada klik, pengisian formulir, atau pengujian pengiriman newsletter.
- Bukti REA: homepage `ev_94ec6dd7e1cafb2a3d7560645af3bed1d84ab88a82721a22c5837b00afaff26e`; Projects `ev_fe990b727b51818e5ba0827dcb8efeb8403c9f3957360780deb36e78636fce32`.
- Batasan: pengamatan ini mewakili dua halaman pada satu ukuran desktop dan satu kali pemuatan. Tampilan mobile, detail tiap halaman proyek, perilaku setelah klik, performa lintas perangkat, dan hasil submit form belum diverifikasi. Label/menu yang tercantum di accessibility tree membuktikan elemen dan tautan tersedia, bukan bahwa semua interaksinya telah diuji.

## 2. Ringkasan produk dan tujuan UX

Lusion menampilkan dirinya sebagai studio kreatif yang membuat pengalaman web interaktif dan penceritaan visual 3D. UX-nya dirancang untuk menarik perhatian, membangun persepsi kualitas, lalu mengarahkan pengunjung ke karya, informasi studio, atau kontak.

Prinsip yang tampak:

1. **Identitas visual kuat sejak layar pertama.** Satu headline utama menjelaskan layanan, didampingi visual 3D/gerak yang dominan.
2. **Konten disusun sebagai perjalanan.** Homepage bergerak dari proposisi nilai ke pendekatan, karya unggulan, lalu ajakan bekerja sama dan informasi kontak.
3. **Karya menjadi bukti utama.** Daftar proyek menggunakan nama proyek dan kategori seperti web, design, development, 3D, animation, concept, dan AR.
4. **Navigasi ringkas.** Tautan utama yang terlihat mencakup Home, About Us, Projects, Contact, dan Labs; CTA “Let’s talk” menuju email.
5. **Ajakan bertindak berulang.** “Our Approach”, “See all projects”, CTA kerja sama, email, tautan sosial, dan newsletter memberi beberapa jalur tindak lanjut.

## 3. Struktur halaman yang diamati

### 3.1 Homepage `/`

Urutan konten yang terbaca:

1. Header/banner dengan tautan logo ke halaman utama, tombol “Back”, CTA “Let’s talk”, kontrol Menu, dan navigasi situs.
2. Hero dengan H1: “We create 3D visual storytelling and interactive web experiences that help brands stand out”, serta petunjuk “scroll to explore”.
3. Bagian pengenalan dengan headline “Bold Ideas, Brought to Life”, paragraf tentang gabungan design, motion, 3D, dan development, serta tautan “Our Approach”.
4. Area reel/video dan “Featured Work”, dengan deskripsi singkat dan tautan ke proyek-proyek pilihan.
5. Tautan “See all projects”.
6. Ajakan kerja sama “Is Your Big Idea Ready to Go Wild? Let’s work together!”.
7. Footer berisi alamat, tautan sosial, email general enquiries dan new business, newsletter, tautan Labs, serta copyright.

### 3.2 Projects `/projects`

- Judul bagian “PROJECTS” dan jumlah koleksi “19”.
- Daftar berisi 19 tautan proyek dalam tangkapan accessibility REA.
- Setiap entri menggabungkan kategori layanan dan nama proyek, misalnya Oryzo AI, Atlas Motion, Devin AI, dan Porsche: Dream Machine.
- Bagian akhir mengulang CTA kerja sama dan informasi kontak/footer.

### 3.3 Navigasi

Tautan utama yang tersedia pada accessibility tree: Home (`/`), About us (`/about`), Projects (`/projects`), Contact, dan Labs (`https://labs.lusion.co/`). CTA “Let’s talk” menuju `mailto:hello@lusion.co`. Menu menyediakan akses ke tautan utama dan signup newsletter. Pengujian REA pada task ini tidak membuka menu melalui klik, sehingga transisi buka/tutup dan animasinya belum dinyatakan terverifikasi.

## 4. Arah visual dan pola komponen

### Yang teramati atau tampak pada halaman

- Komposisi editorial dengan headline besar sebagai fokus pertama.
- Visual 3D dan gerak dipakai untuk menciptakan daya tarik dan memperlihatkan kemampuan studio.
- Aset karya dan thumbnail menjadi elemen penting pada bagian featured work/proyek.
- Header memuat identitas, tindakan kontak, dan menu tanpa daftar navigasi panjang yang selalu ditampilkan.
- Tautan proyek menyertakan metadata kategori, sehingga karya dapat dipahami dari disiplin yang terlibat.
- Footer memiliki informasi kontak dan kanal lanjutan yang jelas.

### Interpretasi desain

- Animasi dan media berat cocok untuk portfolio kreatif karena pengalaman itu sendiri adalah demonstrasi kemampuan studio.
- Urutan “pernyataan → bukti karya → kontak” meminimalkan langkah bagi calon klien.
- Kategori layanan membantu pemindaian daftar proyek, sementara media visual membuat tiap item lebih mudah dibedakan.
- Pola ini berorientasi eksplorasi, bukan pekerjaan operasional yang padat data.

## 5. Kekuatan UX yang layak dijadikan referensi

1. **Hierarki halaman jelas:** headline utama, penjelasan, bukti, lalu tindakan berikutnya.
2. **Satu tujuan utama per bagian:** memahami layanan, melihat karya, mempelajari studio, atau menghubungi.
3. **Konten dibuat mudah dipindai:** nama proyek dipasangkan dengan kategori dan tautan langsung.
4. **CTA menggunakan kata kerja dan tujuan yang jelas:** “Our Approach”, “See all projects”, “Let’s talk”.
5. **Kontak tersedia dalam beberapa bentuk:** email, sosial, lokasi, dan newsletter.
6. **Identitas merek konsisten:** visual yang khas mendukung pesan studio, bukan hanya dekorasi terpisah.

## 6. Risiko jika pola Lusion diterapkan mentah-mentah

- Visual 3D besar, video autoplay, dan transisi intens dapat menghambat pemuatan, aksesibilitas, atau perangkat pengguna dengan koneksi terbatas.
- Navigasi tersembunyi di balik menu menambah langkah untuk pengguna yang sering berpindah antarbagian kerja.
- Tipografi display yang sangat besar dan layout editorial dapat mengurangi kepadatan informasi yang dibutuhkan pada tabel administrasi.
- Pola portfolio tidak otomatis cocok untuk entri data, validasi, audit, rekap, atau kontrol akses berbasis peran.
- Newsletter dan CTA promosi tidak relevan pada layar kerja kader dan admin.

## 7. Rekomendasi penerapan untuk aplikasi Rekapitlasi

Gunakan Lusion sebagai referensi **kualitas presentasi dan hierarki**, bukan sebagai pola layout dashboard.

### Terapkan

- Pada halaman sambutan/login atau halaman informasi publik, gunakan satu headline ringkas yang menyatakan fungsi aplikasi, disusul tindakan utama yang jelas.
- Susun landing page dengan alur: tujuan aplikasi → manfaat/fitur inti → bukti/status informasi → tombol masuk atau mulai.
- Gunakan kartu untuk ringkasan statistik atau pintasan fitur, dengan judul, angka/status, dan tindakan yang langsung dapat dipahami.
- Pertahankan metadata yang membantu pemindaian, seperti periode laporan, nama dusun, kelompok data, dan status kelengkapan.
- Beri setiap bagian satu CTA utama. Gunakan label operasional yang spesifik seperti “Isi Rekap Dawis”, “Lihat Data Pokja”, atau “Unduh Template”.
- Pakai ilustrasi atau visual branding secara ringan pada halaman publik agar karakter aplikasi terasa, tanpa menutupi informasi.
- Hormati `prefers-reduced-motion`; animasi dekoratif harus dapat dikurangi dan tidak boleh menjadi satu-satunya petunjuk status.

### Jangan terapkan pada dashboard inti

- Jangan mengganti tabel, form, filter tahun/dusun, status kelengkapan, atau navigasi kerja dengan pengalaman scroll naratif.
- Jangan menyembunyikan navigasi rutin atau aksi penting di balik animasi/menu yang menambah langkah.
- Jangan memakai video/3D besar sebagai latar halaman input data.
- Jangan memakai tipografi display untuk label tabel kecil, validasi, atau status yang memerlukan pembacaan cepat.

### Prioritas desain untuk aplikasi

1. **Dashboard:** ringkasan status laporan dan pintasan sesuai hak akses, dengan navigasi stabil.
2. **Halaman input dan tabel:** keterbacaan, label konsisten, validasi dekat dengan field, filter periode/dusun jelas, serta aksi simpan/batal yang mudah ditemukan.
3. **Halaman publik/login:** terapkan hierarki dan kualitas visual ala Lusion dalam versi ringan dan cepat.
4. **Motion:** gunakan hanya untuk umpan balik singkat (misalnya transisi panel atau konfirmasi), dengan pengurangan gerak tersedia.

## 8. Kriteria penerimaan bila referensi ini diimplementasikan

- Pengguna dapat mengenali tujuan halaman dan tindakan utama dalam beberapa detik tanpa membaca paragraf panjang.
- Informasi tabel/form tetap lebih menonjol daripada dekorasi.
- Semua aksi utama dapat ditemukan melalui label yang jelas dan navigasi yang konsisten.
- Status sukses, gagal, kosong, memuat, dan perlu diperiksa memiliki teks yang terbaca, bukan hanya warna atau animasi.
- Konten inti tetap dapat digunakan saat animasi dikurangi dan pada viewport sempit.
- Media dekoratif tidak memblokir input, navigasi keyboard, atau pembacaan screen reader.

## 9. Matriks bukti dan batas klaim

| Klaim | Dasar | Status |
|---|---|---|
| H1 homepage menjelaskan layanan studio | Accessibility tree homepage | Teramati langsung |
| Homepage memuat pengenalan, featured work, proyek pilihan, CTA, dan footer | DOM/accessibility tree homepage | Teramati langsung |
| Projects menampilkan label PROJECTS, angka 19, dan 19 tautan proyek | Accessibility tree Projects | Teramati langsung pada satu pemuatan |
| CTA “Let’s talk” mengarah ke email | Href `mailto:hello@lusion.co` | Teramati langsung |
| Form newsletter memiliki input email dan tombol kirim | DOM/accessibility tree | Keberadaan teramati; submit belum diuji |
| Susunan hierarki dan CTA merupakan inspirasi untuk halaman publik Rekapitlasi | Analisis atas struktur yang diamati | Rekomendasi desain |
| Situs responsif, performa, dan interaksi animasinya efektif di semua perangkat | Tidak diuji dalam rekaman ini | Belum diketahui |

## 10. Referensi

- Lusion homepage: [https://lusion.co/](https://lusion.co/)
- Lusion projects: [https://lusion.co/projects](https://lusion.co/projects)
- REA controlled browser evidence: `ev_94ec6dd7e1cafb2a3d7560645af3bed1d84ab88a82721a22c5837b00afaff26e` (homepage) dan `ev_fe990b727b51818e5ba0827dcb8efeb8403c9f3957360780deb36e78636fce32` (projects).
