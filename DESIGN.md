# UI/UX Design References: Airtable and Typeform

Dokumen ini merangkum desain situs publik Airtable dan Typeform, lalu mengambil pola yang relevan untuk aplikasi Rekapitlasi TP PKK Desa Belikurip. Hasilnya adalah arahan desain, bukan instruksi untuk menyalin branding atau seluruh pola situs tersebut.

## 1. Ruang lingkup dan bukti

### Target yang diamati

- [Airtable homepage](https://www.airtable.com/)
- [Airtable Platform](https://www.airtable.com/platform)

### Metode

REA menjalankan skenario browser terkendali di Chromium pada viewport 1440 × 1000, tema terang, dan preferensi `reduced_motion`. Halaman publik dimuat, DOM/accessibility tree dan screenshot diambil. Pada halaman Platform, tab **Durable workflows** diklik untuk menguji perubahan panel.

### Batas pengamatan

- Ini adalah halaman marketing dan demo statis/interaktif yang tertanam. Workspace Airtable sesudah login tidak diamati.
- Cookie consent terlihat pada capture homepage; tidak ada pilihan consent yang dikirim.
- Klaim tentang tampilan mobile, aksesibilitas menyeluruh, performa di jaringan/perangkat berbeda, dan alur fitur setelah login belum diuji.
- Situs memiliki konten promosi yang dapat berubah. Deskripsi produk di dokumen ini mencatat apa yang tampil pada sesi pengamatan, bukan jaminan fitur/penawaran yang tetap.

### Bukti REA

| Evidence ID | Pengamatan |
|---|---|
| `ev_cc3f34c34a7dbdc3710ba2d87f0175be19158870c523f9440339d4652ac30c54` | Homepage, navigation, hero, tabs use case, sections dan footer |
| `ev_54e0819f99efe529920d0c56d5f968a3325582726427df08ebc9cf7ee2d5a8f5` | Halaman Platform, screenshot, struktur konten, hero produk dan customer story |
| `ev_f0ce709483440daa0c213b7c095772341c0f7d1e37f4d6c56d59bca4e946475a` | Klik tab Durable workflows dan perubahan konten panel |

## 2. Ringkasan desain Airtable

Airtable memosisikan produk sebagai ruang kerja untuk data, workflow, aplikasi, kolaborasi, dan otomasi. Situsnya menjelaskan nilai produk dengan pola **pesan utama → visual produk → contoh penggunaan → kapabilitas → bukti pelanggan → CTA**.

Homepage yang diamati memakai headline “Teams, workflows, and agents. All in one space.” dan dua aksi utama: **Start building for free** serta **Book a demo**. Di bawahnya ada demo use case interaktif dengan tab Operations, Project Management, Marketing, Sales, dan Build anything. Setelah itu, situs menunjukkan positioning, logo pelanggan, kapabilitas builder, dan footer navigasi.

Halaman Platform meneruskan pola serupa: headline “Humans and agents, on the same page”, deskripsi singkat, CTA “Try it now” dan “Book demo”, lalu gambar antarmuka produk. Bagian workflow memiliki tab Shared data, Durable workflows, Open surfaces, dan Governance. Klik pada Durable workflows mengubah konten panel menjadi uraian dan visual tentang workflow bersama yang bertahan dan dapat dilanjutkan oleh anggota tim maupun agent.

## 3. Analisis UI

### 3.1 Hierarki visual

- **Navigasi dibagi menjadi dua tingkat.** Banner promosi tipis berada di atas navigasi utama. Di dalam navigasi, bagian platform/solusi/sumber daya berada di kiri, sementara CTA demo dan signup lebih menonjol di kanan.
- **Headline menjadi titik fokus.** Judul halaman berukuran besar, kalimat pendek, dan kontras tinggi. Subjudul lebih kecil dan menjelaskan janji produk.
- **Tindakan utama dibedakan secara visual.** CTA primer berupa tombol gelap berisi teks terang; CTA sekunder berupa tombol terang dengan outline.
- **Ruang putih memberi jeda antarbagian.** Halaman tidak menjejalkan semua penjelasan ke hero. Contoh UI produk menjadi bukti visual setelah klaim.
- **Visual produk membawa konteks.** Screenshot/ilustrasi menampilkan tabel, filter, status, sidebar, kartu agent, atau data terstruktur sehingga calon pengguna dapat membayangkan produknya.

### 3.2 Warna dan tipografi

- Halaman marketing menggunakan dasar putih/terang, teks hitam atau abu gelap, dan tombol primer gelap.
- Aksen biru muncul pada tautan, sementara warna ungu/magenta tampak di sebagian contoh produk dan visual promosi.
- Antarmuka produk yang divisualisasikan memakai warna untuk membedakan kategori, status, prioritas, dan komponen agent.
- Tipografi sans-serif modern dan headline besar memberi kesan produk digital yang rapi dan profesional.

**Interpretasi:** palet netral membantu teks dan UI contoh terbaca, sementara aksen dipakai secara selektif untuk tindakan atau kategori. Screenshot tidak cukup untuk mengukur nilai token warna, ukuran font, atau kontras dengan standar aksesibilitas.

### 3.3 Komponen yang terlihat

- Header dengan navigasi bertingkat, promo bar, CTA primer dan sekunder.
- Hero dengan judul, satu paragraf pendukung, dua CTA, dan visual produk.
- Tablist dengan panel konten yang berubah berdasarkan tab.
- Mockup antarmuka berisi sidebar, tabel, filter, status chip, kartu, dan elemen otomasi.
- Logo pelanggan dan cerita pelanggan sebagai bukti sosial.
- Kartu kapabilitas dengan judul, ringkasan, dan tautan lanjutan.
- Footer dengan kelompok tautan per kategori serta kanal sosial.

## 4. Analisis UX

### Hal yang bekerja baik

1. **Produk dijelaskan melalui contoh konkret.** Pengunjung melihat data/workflow, bukan hanya daftar fitur abstrak.
2. **CTA sesuai tahap keputusan.** Pengguna yang siap mencoba diarahkan ke signup; pengguna organisasi besar dapat memilih demo.
3. **Tab mengemas beberapa use case tanpa membuat halaman menjadi deretan panjang yang seragam.** Saat tab Durable workflows dipilih, panel berganti menjadi uraian dan visual yang sesuai.
4. **Kategori produk membantu orientasi.** Platform, Solutions, Resources, Enterprise, Pricing, dan demo dipisahkan dalam navigasi.
5. **Konten menghubungkan kapabilitas dengan masalah kerja.** Contoh seperti shared data, workflow, automations, serta integrasi memberi gambaran manfaat.
6. **Bukti sosial ditempatkan sebagai penguat.** Logo dan customer story mendukung klaim utama tanpa mengambil alih hero.

### Trade-off dan risiko

- Navigasi bertingkat dan mega-menu dapat memuat banyak pilihan; menu harus tetap mudah dipahami dan dikendalikan lewat keyboard.
- Halaman marketing panjang dan mengandung banyak CTA, tab, video, serta gambar. Pada produk data-entry, pola seperti ini bisa memperlambat pengguna yang datang untuk menyelesaikan tugas.
- Demo produk marketing bukan jaminan alur kerja produk sesungguhnya. Jangan menggunakan screenshot pemasaran untuk menyimpulkan detail fitur workspace.
- Warna chip yang banyak dapat membuat layar tabel bising jika setiap kolom diberi warna tanpa semantik yang konsisten.
- Cookie consent yang terlihat menutup area bawah viewport pada capture awal, sehingga pengelolaan consent dan posisi banner juga memengaruhi pengalaman pertama.
- Dalam capture REA homepage muncul pesan console dari skrip consent/analytics. Karena ini terjadi di lingkungan browser terkendali, hal itu dicatat sebagai kondisi capture, bukan kesimpulan bahwa seluruh pengguna mengalami kegagalan yang sama.

## 5. Pelajaran yang relevan untuk Rekapitlasi

Aplikasi Rekapitlasi adalah alat operasional untuk input dan pemantauan data, bukan pembangun workflow generik. Karena itu, pola Airtable paling relevan untuk **kejelasan data, komponen tabel, indikator status, dan contoh fitur**, bukan untuk menyalin homepage panjang atau promosi AI.

### Terapkan

- Tampilkan **judul halaman dan konteks** yang spesifik: nama kelompok data, dusun, dan tahun aktif.
- Jadikan aksi utama tiap halaman terlihat dan tunggal, misalnya **Tambah Data**, **Simpan Perubahan**, **Unduh Template**, atau **Lihat Rekap**.
- Gunakan tata letak panel/kartu untuk ringkasan dashboard, lalu arahkan pengguna ke tabel yang menjadi sumber tindakan.
- Terapkan chip status hanya untuk nilai bermakna dan konsisten, seperti **Lengkap**, **Perlu diperiksa**, atau **Belum diisi**.
- Gunakan tab hanya untuk kategori sejajar yang memang sering dibandingkan. Pertahankan tab yang aktif secara jelas dan jangan memuat seluruh formulir kompleks dalam satu panel yang tersembunyi.
- Tampilkan preview file/template dan contoh tabel jika itu mengurangi kebingungan sebelum impor atau ekspor.
- Kelompokkan menu berdasarkan tugas utama pengguna dan role; label harus memakai istilah yang dikenal kader, sekretaris, dan admin.
- Berikan feedback langsung setelah aksi, termasuk status simpan, kesalahan validasi, dan konsekuensi data yang jelas.
- Pertahankan dasar visual netral dan kontras, lalu gunakan warna brand yang sudah ditetapkan untuk aksen dan status terpilih.

### Jangan salin langsung

- Jangan memakai banner promosi, signup/demo CTA, logo pelanggan, atau customer stories di area dashboard internal.
- Jangan memutar video/animasi latar pada halaman input data.
- Jangan memaksa pengguna masuk melalui alur scroll marketing untuk menemukan menu kerja.
- Jangan meniru palet dan branding Airtable sehingga identitas TP PKK Desa Belikurip hilang.
- Jangan mengubah tabel yang perlu dibaca menjadi kartu besar tanpa alasan responsif yang jelas.

## 6. Arahan desain untuk area aplikasi

### Dashboard

- Header menunjukkan nama aplikasi, halaman aktif, identitas pengguna, dan kontrol profil/keluar.
- Navigasi utama tetap stabil dan mengelompokkan Data Umum, Pokja, Bumil, Rekap Dawis, Statistik, serta Admin sesuai hak akses.
- Awali konten dengan judul, tahun terpilih, dusun/cakupan yang sedang ditampilkan, dan ringkasan status data.
- Gunakan KPI secukupnya: total data, kelengkapan, dan hal yang memerlukan pemeriksaan. Setiap KPI harus dapat ditelusuri ke daftar data terkait.
- Gunakan tabel untuk desktop dan pola kartu yang sudah digunakan aplikasi untuk perangkat mobile.

### Halaman data dan form

- Letakkan filter tahun/dusun, pencarian, dan aksi tambah/ekspor dalam toolbar yang ringkas.
- Pertahankan header kolom, label satuan, dan urutan data yang konsisten dengan format laporan.
- Bedakan badge/status dari nilai data. Status bukan pengganti informasi validasi rinci.
- Berikan validasi dekat dengan field, pertahankan isi saat terjadi kesalahan, dan jelaskan langkah pemulihan.
- Pisahkan aksi berisiko/administratif dari aksi rutin; minta konfirmasi hanya untuk tindakan yang memiliki konsekuensi nyata.
- Untuk kader-dusun, tampilkan cakupan dusun yang sedang dikelola sebagai konteks yang jelas, bukan sebagai elemen dekoratif.

### Impor dan ekspor

- Sajikan alur bertahap: pilih file/template → periksa format dan preview → tinjau masalah → konfirmasi proses.
- Sebelum proses dijalankan, tunjukkan jumlah baris yang akan diproses dan kesalahan yang dapat diperbaiki.
- Sediakan status proses dan ringkasan hasil setelah impor/ekspor.

## 7. Design system awal yang disarankan

Nilai di bawah adalah **rekomendasi untuk dibahas/diterapkan di aplikasi**, bukan pengukuran token Airtable.

| Elemen | Arahan |
|---|---|
| Latar | Putih atau abu sangat muda untuk area kerja; panel permukaan dibedakan dengan border tipis |
| Teks utama | Abu gelap/hampir hitam dengan kontras tinggi |
| Brand | Gunakan warna brand TP PKK yang sudah ada sebagai aksen identitas, tidak mengambil alih seluruh permukaan |
| CTA primer | Satu warna isi yang kontras dan konsisten; gunakan label tindakan langsung |
| CTA sekunder | Outline atau gaya netral untuk tindakan pendukung |
| Status | Warna semantik konsisten, selalu disertai teks atau ikon yang dapat dibaca |
| Radius dan border | Sudut sedang, garis tipis, fokus pada pemisahan permukaan dan tabel |
| Tipografi | Sans-serif mudah dibaca; headline halaman tegas tetapi lebih kecil dari headline marketing Airtable |
| Gerak | Transisi singkat untuk perubahan state; hormati `prefers-reduced-motion` |

Sebelum memilih kode warna, ukuran font, atau spacing final, cocokkan dengan design token dan komponen aplikasi yang sudah ada agar hasilnya konsisten dan tidak membuat sistem desain kedua.

## 8. Kriteria penerimaan

- Pengguna dapat mengenali cakupan data (tahun, dusun, kelompok data) tanpa menebak.
- Aksi utama terlihat tanpa perlu mencari ke beberapa menu atau menggulir jauh.
- Tabel tetap bisa dipindai, status memiliki label teks, dan warna memiliki arti yang konsisten.
- Form memberi petunjuk, validasi, dan pesan sukses/gagal yang jelas.
- Semua aksi dapat dijalankan dengan keyboard dan fokus terlihat.
- Tampilan mobile mempertahankan akses pada data dan aksi penting tanpa memotong kolom secara diam-diam.
- Gerak dekoratif tidak menghalangi pekerjaan dan dapat dikurangi.
- Pola visual mendukung identitas TP PKK Desa Belikurip dan tidak membuat pengguna mengira aplikasi ini adalah Airtable.

## 9. Ringkasan keputusan

**Adopsi dari Airtable:** headline/tujuan yang jelas, contoh UI konkret, CTA yang mudah ditemukan, kategori konten yang tertata, tab yang memperlihatkan satu panel relevan, tabel dan status yang konsisten.

**Adaptasi untuk Rekapitlasi:** fokus pada pekerjaan rutin dan role pengguna; utamakan navigasi stabil, data yang mudah dipindai, validasi yang bisa ditindaklanjuti, serta alur impor/ekspor yang transparan.

**Hindari:** halaman marketing panjang di dashboard, banner promosi, video besar, navigasi tersembunyi untuk fitur rutin, dan penyalinan branding Airtable.

---

# Analisis UI/UX Typeform

## 10. Ruang lingkup dan bukti Typeform

### Target yang diamati

- [Typeform homepage](https://www.typeform.com/)
- [Typeform Forms](https://www.typeform.com/forms)
- [Online Registration Form Template](https://www.typeform.com/templates/simple-registration)

### Metode

REA menjalankan skenario browser terkendali di Chromium pada viewport 1440 × 1000, tema terang, dan preferensi `reduced_motion`. DOM, accessibility tree, URL, screenshot, dan event console/page error diamati. Pada halaman template, tombol **Preview template** diklik.

### Batas pengamatan

- Yang diamati adalah marketing site dan preview template publik, bukan builder Typeform setelah login.
- Halaman template menyatakan pengalaman satu pertanyaan pada satu waktu. Klaim ini berasal dari isi halaman Typeform; pengalaman responden aktif tidak berhasil diamati karena area preview masih berupa panel loading pada capture sesudah klik.
- Tidak ada data form yang diisi atau dikirim.
- Tampilan mobile dan kondisi koneksi/perangkat lain belum diuji.

### Bukti REA

| Evidence ID | Pengamatan |
|---|---|
| `ev_85a57667b4ee16b2aa5e9ddd4186f150a547c5dcd12b1bc3e2f423eb47abf949` | Homepage, hero, kategori ASK/ACT/LEARN, fitur, cerita pelanggan, integrasi |
| `ev_d5385e73b3a7ea71d8792f7555b38bc3592de0ed9ae812274195fdbd07e24c06` | Halaman Forms, contoh builder, kategori form, kapabilitas dan fitur keamanan |
| `ev_ea392c998c3ea8bf7b61fefeeedab7b3e6af4127ff43679b6946d3ee452227c7` | Halaman template registrasi dan konten FAQ |
| `ev_fce7ca8a68ea13f87b0372fbf47a6bdd8f24f2e8a737e13bb961d2b8927ff2b5` | Klik Preview template; modal dan panel preview tampil, isi form belum siap dibaca |

## 11. Ringkasan desain Typeform

Typeform memosisikan produknya sebagai pembuat form, automasi, serta alur pengumpulan dan pengolahan respons. Homepage mengelompokkan ceritanya ke tiga jalur: **ASK** untuk Intelligent Forms, **ACT** untuk Growth Flow, dan **LEARN** untuk Research Flow. Halaman Forms menerjemahkan janji tersebut ke contoh kategori, builder visual, template, analitik, kolaborasi, keamanan, dan integrasi.

Situs menekankan pengurangan friksi saat membuat dan mengisi form. Halaman template registrasi menyebut form dapat disesuaikan melalui conditional logic dan menggambarkan pengalaman satu pertanyaan pada satu waktu. Karena preview interaktif gagal tampil penuh saat pengamatan, bagian tersebut dicatat sebagai klaim/pola yang dipromosikan Typeform, belum sebagai perilaku yang diverifikasi langsung dalam sesi ini.

## 12. Struktur halaman dan pola UI yang diamati

### 12.1 Homepage

- Announcement bar berisi pesan integrasi/produk dan tautan “Try it now”.
- Navigasi utama mencakup Platform, Solutions, Resources, Pricing, Log in, Contact sales, dan Sign up.
- Hero berlatar gelap ungu kehitaman dengan headline serif besar, uraian singkat, dan satu CTA primer “Get started—it’s free”.
- Tiga kartu ASK / ACT / LEARN merangkum jalur produk. Label “New” terlihat pada dua kartu yang diidentifikasi sebagai produk baru.
- Bagian berikutnya menguraikan fitur form, automasi, dan riset; lalu bukti pelanggan, integrasi, serta CTA akhir.
- Video/animasi memiliki kontrol jeda. Ini terlihat sebagai affordance di accessibility tree, tetapi pengaturan pemutaran lebih luas belum diuji.

### 12.2 Halaman Forms

- Hero terang dengan layout editorial dua kolom: judul dan teks di kiri, visual produk/editor di kanan.
- Judul “Simplify form creation with an intuitive form builder”, ringkasan manfaat, dan CTA “Create a form”.
- Halaman menampilkan 28 question types sebagai klaim produk, lalu mencontohkan signup forms, feedback forms, dan order forms.
- Urutan berikutnya membahas builder drag-and-drop, customization, template, keamanan/akses, perlindungan data, kolaborasi, integrasi, dan template populer.
- Mockup editor memperlihatkan daftar/struktur pertanyaan di satu sisi dan preview visual form di sisi lain. Ini adalah ilustrasi marketing, bukan builder aktif yang diperiksa.

### 12.3 Halaman template registrasi

- Breadcrumb dan kategori membantu pengunjung memahami posisi template di katalog.
- Judul, deskripsi singkat, dan CTA “Use this template” berada di area atas.
- Tombol “Preview template” membuka modal. Di sesi ini, preview form masih menampilkan area loading; tidak ada pertanyaan yang dapat diisi.
- Label “Works great on every device” dan tautan “Start with this template” menunjukkan manfaat dan langkah berikutnya.
- Isi lanjutan menyediakan penjelasan, FAQ accordion, dan rekomendasi template/kategori terkait.

## 13. Analisis UX Typeform

### Kekuatan yang teramati

1. **Produk dijelaskan dalam tiga pekerjaan besar.** ASK / ACT / LEARN memecah penawaran yang beragam ke kelompok hasil yang mudah diingat.
2. **CTA utama tunggal per konteks.** Homepage dan halaman Forms sama-sama menonjolkan langkah mulai, sementara jalur sales disediakan terpisah.
3. **Contoh visual dekat dengan penjelasan.** Form signup, feedback, dan order memperlihatkan ragam hasil, tidak hanya menyebutkan fitur.
4. **Template menyediakan titik awal.** Halaman template menjelaskan tujuan template, menyediakan preview, tombol untuk memakainya, dan FAQ.
5. **Fitur diterangkan dari kebutuhan pengguna.** Kustomisasi, analytics, keamanan, kolaborasi, dan integrasi dipisah ke bagian yang bisa dipindai.
6. **Kontrol media tersedia.** Ada kontrol pause/resume untuk video di homepage; konten gerak tidak sepenuhnya tanpa kontrol yang tampak.
7. **Konten menyoroti kendali desain.** Branding, pertanyaan, dan conditional logic dipaparkan sebagai hal yang dapat diatur oleh pembuat form.

### Trade-off dan risiko

- **Satu pertanyaan per layar** dapat membuat form terasa ringan, tetapi dapat menambah jumlah langkah dan menyulitkan responden membandingkan beberapa isian yang saling terkait.
- Banyak animasi, video, dan visual dapat menyita bandwidth atau perhatian. Hal ini berisiko untuk perangkat lama atau koneksi terbatas.
- Marketing site memiliki navigasi bertingkat serta banyak bagian. Jika pola itu dipindahkan ke aplikasi operasional, pengguna dapat menghabiskan waktu mencari tugas rutin.
- Tombol preview yang menghasilkan panel loading tidak memberi pengguna demonstrasi yang memadai pada sesi ini. Preview harus memiliki state loading, berhasil, dan gagal yang jelas.
- Klaim metrik seperti persentase pengumpulan data, jumlah question types, atau jumlah pengguna berasal dari copy marketing yang diamati; angka tersebut tidak diverifikasi secara independen.

## 14. Pelajaran yang relevan untuk Rekapitlasi

Rekapitlasi mengelola data pelaporan periodik dengan tabel, form, validasi, role, dan ekspor. Pola Typeform cocok untuk **mengurangi beban pada alur input**, khususnya form yang panjang atau digunakan kader-dusun. Pola tersebut kurang cocok untuk mengganti keseluruhan tabel rekap yang perlu dibaca lintas banyak record.

### Terapkan

- Pecah form yang panjang ke beberapa bagian bernama jelas, misalnya Identitas, Data Pokok, dan Pemeriksaan. Gunakan indikator langkah agar pengguna mengetahui posisi dan sisa pekerjaan.
- Untuk kelompok pertanyaan yang saling berkaitan, tampilkan beberapa field dalam satu bagian sehingga pengguna dapat meninjau dan membandingkan jawabannya.
- Gunakan conditional visibility hanya bila jawaban sebelumnya memang mengubah isian berikutnya; jangan menyembunyikan field penting secara mengejutkan.
- Sediakan template dan contoh data sebelum impor Excel, lalu tampilkan preview dan masalah validasi sebelum konfirmasi.
- Sertakan review akhir yang merangkum dusun, periode, dan jumlah isian sebelum data disimpan atau dikirim.
- Tampilkan label, contoh format, satuan, serta penjelasan singkat dekat dengan field. Pertahankan istilah laporan resmi agar tidak mengubah makna data.
- Berikan tombol Kembali/Lanjut yang konsisten, pertahankan jawaban ketika pengguna kembali, dan tampilkan pesan validasi langsung pada field bermasalah.
- Gunakan daftar atau tabel untuk pencarian, perbandingan, dan pemeriksaan lintas banyak data; form bertahap dipakai untuk membuat/mengubah satu record.
- Pada halaman publik atau panduan, gunakan contoh form untuk membantu kader memahami alur tanpa mencampur materi promosi dengan dashboard internal.

### Jangan terapkan langsung

- Jangan paksa satu pertanyaan per layar untuk form pelaporan dengan banyak angka dan field terkait. Ini berpotensi memperbanyak klik dan membuat konteks sulit dibandingkan.
- Jangan pakai animasi, tema gelap, atau aksen ungu Typeform sebagai pengganti identitas TP PKK.
- Jangan meniru pola Growth Flow/Research Flow yang tidak sesuai tujuan aplikasi.
- Jangan membuat form bercabang tanpa ringkasan aturan; pengguna harus tahu mengapa pertanyaan tertentu muncul atau tidak muncul.
- Jangan biarkan satu-satunya jalur input hanya berupa wizard apabila pengguna perlu mengedit banyak kolom sekaligus.

## 15. Pola form yang disarankan untuk aplikasi

| Situasi | Pola yang disarankan |
|---|---|
| Menambah satu record dengan beberapa bagian | Form bertahap, bagian diberi judul, indikator progres sederhana |
| Mengedit banyak kolom pada record yang sama | Form terstruktur dengan kelompok field, bukan satu pertanyaan per layar |
| Melihat dan membandingkan banyak dusun/periode | Tabel dengan filter dan status yang konsisten |
| Mengimpor Excel | Pilih file → validasi dan preview → koreksi masalah → konfirmasi → ringkasan hasil |
| Pertanyaan lanjutan hanya berlaku pada kondisi tertentu | Conditional field dengan alasan/label yang tetap mudah dipahami |
| Pengguna mobile mengisi data ringkas | Kartu/field berurutan dengan target sentuh nyaman dan tombol navigasi yang selalu jelas |

Simpan/batal, hak akses, validasi server, dan pemeriksaan kunci periode tetap harus mengikuti aturan aplikasi yang ada. Rekomendasi visual tidak mengubah otorisasi atau alur penyimpanan.

## 16. Perbandingan kontribusi referensi

| Aspek | Airtable | Typeform | Penerapan untuk Rekapitlasi |
|---|---|---|---|
| Orientasi utama | Workspace data dan workflow | Pengumpulan respons dan alur form | Tabel untuk pemantauan; form untuk input per record |
| Pola visual | Netral, contoh tabel, CTA gelap | Hero editorial, serif display, visual form kuat | Ambil kejelasan komponen; pertahankan branding aplikasi |
| Pekerjaan yang dibantu | Mengelola dan menghubungkan data | Membuat dan mengisi form | Jadikan data/review sebagai pusat, input sesingkat mungkin |
| Interaksi yang patut dipelajari | Tab use case, chip, layout contoh data | Template, preview, tahapan/conditional logic | Preview impor, form berbagian, status dan validasi eksplisit |
| Yang harus dihindari | Landing marketing di dashboard | Wizard terlalu panjang untuk banyak angka | Jaga navigasi kerja dan keterbandingan nilai |

## 17. Kriteria penerimaan tambahan untuk alur form

- Pengguna selalu mengetahui bagian/step saat ini dan dapat kembali tanpa kehilangan jawaban.
- Semua field wajib ditandai, memiliki label yang jelas, dan kesalahan dapat diperbaiki tanpa mengulang form dari awal.
- Conditional field hanya muncul pada kondisi yang relevan dan tidak menghilangkan nilai tanpa pemberitahuan.
- Pengguna dapat meninjau ringkasan sebelum menyimpan.
- Tabel multi-record tetap tersedia untuk pemantauan dan pembandingan.
- Alur tetap dapat digunakan dengan keyboard, pembaca layar, dan preferensi reduced motion.
- Pada layar sempit, tombol lanjut/kembali mudah dijangkau dan konten tidak terpotong.

## 18. Ringkasan keputusan Typeform

**Adopsi:** formulir yang terasa terarah, template/contoh sebagai titik mulai, progressive disclosure yang masuk akal, preview yang dapat dipahami, grouping pertanyaan, dan feedback yang membantu menyelesaikan pekerjaan.

**Adaptasi:** wizard singkat untuk pembuatan/pengeditan record bila form memang panjang; gunakan tabel untuk tinjauan banyak record, dan pertahankan ringkasan sebelum menyimpan.

**Hindari:** satu pertanyaan per layar untuk semua data, navigasi marketing di dashboard, animasi dekoratif berat, dan branching yang membuat alur tidak dapat diprediksi.
