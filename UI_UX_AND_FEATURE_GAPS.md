# Catatan Sisa Kekurangan & Saran Pengembangan Sistem Rekapitulasi PKK

Tanggal Review: 12 Juni 2026 (Berdasarkan Laporan Pekerjaan Terakhir)
Dokumen ini berisi rangkuman fitur, kelemahan UI/UX, dan celah operasional yang masih belum terselesaikan pada Sistem Rekapitulasi Data PKK Kecamatan Baturetno. Di bagian bawah dokumen ini, terdapat *prompt* yang siap di-*copy-paste* untuk diberikan kepada Claude Opus 4.8 agar masalah-masalah ini dapat segera diselesaikan secara bertahap.

---

## 1. Kekurangan & Kelemahan Fitur Sistem
*   **Workflow Approval & Lock Periode Belum Selesai:** 
    Tabel `report_periods` sudah ada di database, tetapi antarmuka dan *server-guard* untuk mengunci periode laporan (bulanan/tahunan) belum dibangun. Tanpa fitur ini, data lama yang seharusnya sudah final dapat terubah secara tidak sengaja oleh operator.
*   **Absennya *Dry-Run* / Preview Mutasi AI:** 
    AI Assistant memiliki kewenangan (*function call*) untuk memperbarui data. Namun, sistem langsung mengeksekusi perubahan tersebut tanpa menampilkan jendela "Preview Mutasi" yang meminta persetujuan user sebelum *commit* ke database.
*   **Sistem Notifikasi Belum Aktif:** 
    Tombol "Bel" notifikasi saat ini masih berstatus di-*disable*. Fitur *reminder* otomatis (seperti mengingatkan dusun/pokja yang belum mengisi data mendekati tenggat waktu pengumpulan) belum direalisasikan, padahal tabel `notifications` sudah tersedia di skema.
*   **Import Excel Preview V2 Belum Tersedia:** 
    Otorisasi keamanan *import* memang sudah ditutup rapat per-role, namun UI *preview* sebelum proses *import* (menampilkan baris mana saja yang ditambah, diubah, atau dilewati lengkap dengan *checkbox* konfirmasi) belum rampung.
*   **Caching API Kurang Menyeluruh:** 
    Endpoint `/api/years` sudah menggunakan cache, namun `/api/dusun` belum di-cache karena banyaknya tempat pemanggilan (*call site*). Hal ini berpotensi membebani performa database jika aplikasi digunakan oleh puluhan kader serentak.

## 2. Kelemahan UI/UX dan Tampilan
*   **Beban Data Entry Berat di Versi Mobile:** 
    Walaupun desain "*Mobile Card*" sudah ada (seperti di form Bumil), mengisi data PKK sangat panjang dan mengharuskan *scroll* melelahkan. Belum ada fitur navigasi lompat cepat antar-dusun di layar sentuh, dan belum ada *collapsible groups* untuk menyembunyikan input yang tidak sedang dikerjakan.
*   **Tabel Ekstra Lebar di Desktop Sulit Dipindai:** 
    Tabel Data Pokja memiliki belasan hingga puluhan kolom. Belum ada fungsi *Group Headers* (pengelompokan kepala kolom bertingkat) maupun **Density Toggle** (Pilihan tata letak 'Compact' atau 'Nyaman').
*   **Transisi Halaman Terasa Loncat (*Blank State*):** 
    Beberapa rute halaman belum memiliki *Loading Skeleton*. Akibatnya, saat menarik (fetch) data, layar menjadi putih sejenak sebelum konten tiba-tiba muncul.
*   **Hierarki Visual Terlalu Dominan Satu Warna:** 
    Tema warna aplikasi terlalu didominasi oleh warna hijau PKK sehingga mengurangi kejelasan (*clarity*). Aksen peringatan (misal: *amber* untuk data tidak wajar, merah untuk gagal/hapus) belum diaplikasikan secara konsisten pada komponen tabel.
*   **Aksesibilitas (A11y) Kontras Teks Belum Diuji:** 
    Walau animasi dan *aria-label* sudah baik, namun rasio kontras teks kecil atau pada badge/status kelengkapan belum dites standar WCAG secara manual.

## 3. Celah Operasional Tertunda
*   **Risiko Password Default `admin123`:** 
    Pemaksaan penggantian password untuk akun Admin (yang menggunakan password default `admin123`) ditunda atas permintaan pengguna. Ini merupakan bom waktu keamanan apabila aplikasi mulai terekspos secara *online*.

---
---

## Prompt untuk Claude Opus 4.8

*Silakan salin teks di bawah ini dan berikan ke Claude Opus 4.8 untuk mulai bekerja menyelesaikan masalah di atas.*

```markdown
Anda adalah seorang Senior Full-Stack Next.js Developer & UI/UX Engineer. Tugas Anda adalah menyelesaikan sisa-sisa pekerjaan (backlog) pada proyek "Sistem Rekapitulasi Data PKK Kecamatan Baturetno". 

Konteks Proyek:
- Framework: Next.js App Router 16.2.5.
- Kondisi saat ini: Perbaikan celah keamanan kritis (seperti import per-role, limitasi AI context per-bulan, auth export) SUDAH dikerjakan dan stabil (146+ tests passing, build clean).
- Anda harus melanjutkan pekerjaan berdasarkan daftar masalah yang belum terselesaikan di bawah ini tanpa merusak fondasi keamanan dan backward compatibility yang sudah ada.

Berikut adalah Prioritas Pekerjaan (Kerjakan secara berurutan sesuai prioritas):

### FASE 1: Integritas Data & Keamanan (Backend/Logic)
1. **Fitur Workflow Lock Periode:** Bangun UI dan Server Guard untuk mengunci data. (Tabel `report_periods` sudah ada). Jika periode terkunci, endpoint mutate (baik UI maupun AI) harus mengembalikan error kecuali dilakukan oleh Admin yang membuka kuncinya.
2. **AI Dry-Run Mutasi:** Ubah logic asisten AI agar tidak langsung mengubah database saat menerima fungsi `update_dusun_data`. Alih-alih, AI harus merespons dengan memunculkan UI "Preview Mutasi" yang harus diklik persetujuannya (confirm) oleh user sebelum data di-commit.
3. **Caching Endpoint Dusun:** Tambahkan caching ringan (module-level cache TTL) pada `/api/dusun` sama seperti yang sudah dilakukan pada `/api/years`.

### FASE 2: Peningkatan UI/UX Responsif & Aksesibilitas
1. **Perbaikan Tabel Lebar Desktop:** Tambahkan fitur "Group Headers" untuk mengelompokkan kategori kolom di tabel Pokja, serta berikan "Density Toggle" (opsi untuk mengubah padding tabel menjadi 'Compact' atau 'Nyaman').
2. **Penyempurnaan Mobile UX:** Di komponen `MobileDataEntryCard` / `BumilDataPage`, tambahkan fitur "Collapsible Groups" (Accordion) agar form tidak terlalu panjang di-scroll di HP. Tambahkan juga menu dropdown/navigasi cepat untuk pindah antar-dusun di tampilan mobile.
3. **Loading Skeleton:** Implementasikan Loading Skeletons yang mulus (non-blocking UI) pada saat perpindahan halaman agar tidak terjadi blank screen/loncatan layout saat fetching data.
4. **Hierarki Visual:** Evaluasi ulang `app/globals.css` dan komponen kartu/tabel. Pastikan penggunaan warna fungsional (amber untuk warning, merah untuk error/belum lengkap, biru untuk info) lebih jelas dan tidak tertimpa dominasi warna hijau khas PKK.

### FASE 3: Fitur Tambahan (Nice-to-Have)
1. **Aktifkan Sistem Notifikasi:** Hidupkan kembali tombol lonceng yang didisable. Buat logic untuk mem-fetch tabel `notifications` untuk mengingatkan desa/kader terkait tenggat waktu pengisian data.
2. **Import Excel Preview V2:** Buat antarmuka perantara setelah pengguna mengunggah file Excel, menampilkan baris mana saja yang ditambah, diubah, atau di-skip akibat RLS, lalu minta konfirmasi user (Submit) sebelum data menimpa tabel.

Aturan Implementasi Anda:
- Lakukan eksekusi per Fase secara bertahap. 
- Jangan pernah jalankan command destruktif pada git maupun database.
- Pastikan semua perubahan Anda lolos pengujian (`npm run test`) dan proses `npm run build` tetap bersih.
- Setelah menyelesaikan 1 Fase, lapor kepada saya rangkuman file apa saja yang diubah, lalu minta instruksi untuk melangkah ke Fase selanjutnya.

Silakan mulai dengan melakukan audit singkat terhadap direktori komponen yang berhubungan dengan FASE 1 dan berikan rencana detail kode yang akan Anda ubah.
```
