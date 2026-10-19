# Laporan Audit: UI/UX, Aksesibilitas, Kelengkapan Fitur PKK, dan Verifikasi Temuan Lama

**Project:** Sistem Rekapitulasi Data TP PKK Desa Belikurip (Lumbung Data PKK)  
**Tanggal Audit:** 12 Oktober 2026  
**Auditor:** Teamwork UI/UX & Features Verifier (`explorer_uiux_features_1`)  
**Mode:** Read-Only Investigation (Tanpa modifikasi kode aplikasi atau data)  

---

## 1. Ringkasan Eksekutif

Aplikasi web **Lumbung Data PKK Desa Belikurip** (Next.js 16.2.5 App Router, React 19, Supabase PostgreSQL, Tailwind CSS) telah berevolusi secara signifikan dari prototype awal berbasis kecamatan (13 desa) menjadi sistem informasi data desa per-dusun (9 dusun: Soko, Melikan, Jamprit Wetan, Jamprit Kulon, Belikurip, Pagersari, Klerong, Tanjung, Banyuripan) dengan fitur yang sangat komprehensif.

Audit ini melakukan peninjauan mendalam pada dua aspek utama serta satu verifikasi historis penuh:
1. **Aspek 4 — UI/UX & Aksesibilitas:** Kesiapan mobile responsif, pengalaman kerja kader lapangan (Kader Dusun), kelayakan aksesibilitas (WCAG 2.1 AA, touch targets, contrast, keyboard nav, ARIA tags, dark mode).
2. **Aspek 6 — Kelengkapan Fitur TP PKK Desa Belikurip:** Kepatuhan terhadap spesifikasi teknis migrasi level desa (`.kiro/specs/migrasi-level-desa/`) dan standar pelaporan PKK (Pokja I–IV, Bumil, Rekapitulasi Dawis, Export Excel Annex A–F, Export Word, Template, Report Years, Column Overrides, AI Assistant).
3. **R2 — Verifikasi Status Seluruh Temuan Lama:** Pengujian status faktual terhadap **seluruh** butir review dari 6 dokumen historis (`PROJECT_REVIEW.md`, `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md`, `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md`, `REVIEW_UIUX_FITUR_2026-07-02.md`, `UI_UX_AND_FEATURE_GAPS.md`, dan `AI_SKILLS_PROJECT_REVIEW.md`).

### Ringkasan Temuan Kunci
- **Temuan Kritis Fitur (`FEAT-001`):** Terjadi **inkonsistensi kolom Pokja II** pada Excel Export (`app/api/export/excel/route.js:331,393`) di mana kolom `JML KLP PEMBACA` (`klp_pembaca`) diekspor di kolom 14 dan kolom resmi `bkb_jml_ibu_peserta` dihilangkan. Padahal di database, UI input (`components/Pokja2DataPage.js`), dan import (`lib/excel/sheetMap.js`), kolom resmi adalah `bkb_jml_ibu_peserta`. Akibatnya, input kader untuk `bkb_jml_ibu_peserta` tidak pernah diekspor, dan jika file hasil export diimpor ulang, terjadi **pergeseran kolom (data corruption)** pada kelompok data BKB.
- **Temuan Tinggi Fitur (`FEAT-002`):** Export Word (`app/api/export/word/route.js:168-185`) masih menggunakan **skema kolom legacy Pokja II** (termasuk 6 kolom yang sudah di-drop pada Migrasi v5) serta sama sekali tidak mendukung export untuk Data Umum, Rekapitulasi Dawis, dan Data Bumil.
- **Temuan Tinggi UI/UX (`UIUX-001` & `UIUX-002`):** Tombol **"Batalkan"** pada banner edit membuang seluruh perubahan dirty tanpa konfirmasi modal apa pun (`components/PokjaDataPage.js:557`, `NestedDataPage.js:568`, `BumilDataPage.js:540`). Selain itu, proteksi `beforeunload` tidak menangkap navigasi SPA client-side (`<Link>` di sidebar/menu), sehingga editan kader rentan hilang seketika saat salah klik.
- **Fragmentasi Sistem Toast (`UIUX-003`):** Terdapat komponen toast global ber-`aria-live` di `components/Toast.jsx`, namun 5 halaman utama masih menggulung state `toast` lokal mandiri tanpa dukungan pembaca layar (`aria-live`) dan tanpa dark mode styling.
- **Kebocoran Inline Style di Dark Mode (`UIUX-004`):** Sel-sel tabel sticky masih menggunakan inline style `background: '#f9fafb'`, `'#fff'`, `'#f0fdf4'` yang meng-override tema gelap sehingga menampilkan kontras putih-di-atas-putih.

---

## 2. Audit Aspek 4: UI/UX & Aksesibilitas

### 2.1. Evaluasi Responsivitas Mobile per Halaman

| Halaman / Komponen | Perilaku Mobile (< 768px) | Evaluasi UX & Kesiapan |
|---|---|---|
| **Pokja I–IV** (`Pokja1-4DataPage.js` via `NestedDataPage.js`) | Beralih ke **Mobile Card View** collapsible per dusun dengan dropdown "Lompat ke dusun". | **Bagus.** Menggunakan kartu lipat per dusun sehingga kader tidak perlu horizontal scroll pada 30+ kolom. Tombol simpan per dusun jelas. |
| **Data Bumil** (`BumilDataPage.js`) | Mobile Card View dengan quick jump, collapsible accordions, dan input ber-`inputMode="decimal"`. | **Sangat Bagus.** Disesuaikan untuk input numerik ibu hamil & balita di smartphone. |
| **Rekapitulasi Dawis** (`RekapDawisDataPage.js`) | Mobile Card View via `NestedDataPage`. | **Bagus.** Mengelompokkan 34 indikator dalam tampilan card vertikal. |
| **DataStatsPage** (`DataStatsPage.js`) | Grid KPI 1-2 kolom, ranking list vertikal, bar progress. | **Cukup.** Tampilan analitik ringkas, namun belum ada kartu detail dusun untuk drill-down di mobile. |
| **Admin Panel** (`app/dashboard/admin/page.js`) | Tabs membungkus (wrap), tabel responsif dengan horizontal scroll. | **Cukup.** Tabel log dan user masih memerlukan horizontal swipe, modal preview import sudah scrollable. |
| **Profil Pengguna** (`app/dashboard/profile/page.js`) | Stack vertikal (info akun, form ganti password, riwayat aktivitas). | **Sangat Bagus.** Form input pas untuk ukuran layar HP, touch target tombol submit lega. |
| **Dashboard Utama** (`app/dashboard/page.js`) | Single column stack: KPI cards, panel tugas hari ini, chart, matrix kelengkapan dengan overflow horizontal. | **Cukup-Bagus.** Informasi sangat padat, namun card layout mengalir alami ke bawah. |

### 2.2. Evaluasi Usability untuk Kader Dusun (Rural Village Cadres)

1. **Form Input:**
   - Input numerik telah menerapkan `inputMode="decimal"` (`PokjaDataPage.js:386`, `NestedDataPage.js:443`, `BumilDataPage.js:410`), yang secara otomatis memunculkan keypad angka besar pada smartphone Android/iOS kader dusun.
   - Ukuran font input mobile menggunakan `text-base` (16px), yang secara efektif mencegah auto-zoom paksa pada peramban iOS Safari saat fokus input.
   - Textarea keterangan telah menggunakan `AutoGrowTextarea.jsx` yang menyesuaikan tinggi konten secara otomatis.
2. **Feedback Simpan & Edit:**
   - Terdapat pelacakan dirty state real-time: indikator visual `"• Belum disimpan"` (amber), `"• Tersimpan"` (hijau), dan `"• Gagal simpan"` (merah) pada header kartu mobile (`PokjaDataPage.js:340-342`).
   - Sticky banner di bagian atas layar menunjukkan berapa dusun yang memiliki perubahan belum disimpan beserta tombol `"Simpan Semua"`.
   - Menggunakan `lib/preserveScroll.js` sehingga posisi scroll tidak meloncat ke atas setelah operasi simpan baris selesai.
3. **Visibilitas Error Validasi:**
   - Pada kartu mobile, pesan error/warning validasi (misal: "KK melebihi total jiwa" atau "Nilai melonjak tidak wajar") ditampilkan **secara eksplisit berupa teks di bawah input** (`PokjaDataPage.js:405`).
   - **Kelemahan Desktop:** Pada tampilan desktop tabel, pesan validasi **hanya disematkan pada tooltip kursor (`title="..."`)** (`PokjaDataPage.js:652, 662`), sehingga pengguna keyboard atau laptop layar sentuh tidak dapat membaca detail pesan kesalahan.
4. **Touch Target Sizes (Target Sentuh Layar):**
   - Header kartu mobile memiliki `minHeight: 56px` (`PokjaDataPage.js:331`), memenuhi standar WCAG (≥ 44x44px).
   - Input mobile memiliki `minHeight: 44px` (`PokjaDataPage.js:392`), memenuhi standar.
   - Tombol simpan mobile memiliki `minHeight: 44px` (`PokjaDataPage.js:422`), memenuhi standar.
   - **Kelemahan Desktop Table:** Tombol aksi simpan per baris pada tabel desktop hanya berukuran `w-8 h-8` (32x32px) (`PokjaDataPage.js:709`), terlalu kecil untuk perangkat laptop berlayar sentuh / hybrid tablet.
5. **Aksesibilitas Visual, Kontras, dan Tipografi:**
   - Terdapat label teks dengan ukuran sangat kecil (`text-[9px]` di `NestedDataPage.js:66` dan `text-[10px]` di `PokjaDataPage.js:338, 349, 405`) yang menyulitkan keterbacaan oleh kader PKK senior di pedesaan.
   - Warna amber pada badge warning (`text-amber-500` di atas `bg-amber-50`) memiliki rasio kontras marginal di bawah 4.5:1 terhadap latar belakang putih terang.
6. **Navigasi Keyboard & ARIA:**
   - Komponen modal `components/ui/Dialog.jsx` sudah sangat baik: mengimplementasikan `role="dialog"`, `aria-modal="true"`, focus trap (Tab/Shift+Tab), Escape key close, dan focus restore ke elemen pemicu.
   - **Kelemahan Input Desktop:** Seluruh sel input pada tabel desktop di `PokjaDataPage.js:656-670` tidak memiliki atribut `aria-label` maupun `id`/`htmlFor`, sehingga screen reader hanya membacakan "edit text" tanpa nama kolom dan tanpa nama dusun.
   - Visualisasi chart (`components/charts/*`) tidak memiliki representasi tabel `sr-only` atau padanan teks untuk pembaca layar.

---

### 2.3. Daftar Temuan Baru UI/UX & Aksesibilitas

#### `UIUX-001`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Tinggi
- **Lokasi:** `components/PokjaDataPage.js:557`, `components/BumilDataPage.js:540`, `components/NestedDataPage.js:568`
- **Deskripsi Masalah:** Tombol "Batalkan" pada banner perubahan belum tersimpan langsung memanggil `fetchData(tahun)` tanpa menampilkan dialog konfirmasi apa pun.
- **Dampak:** Kader dusun yang tidak sengaja menyentuh tombol "Batalkan" di smartphone akan langsung kehilangan seluruh input data yang telah diketik tanpa ada peringatan atau kesempatan membatalkan aksi tersebut.
- **Rekomendasi Konkret:** Pasang `ConfirmModal` tipe warning:
  ```jsx
  <ConfirmModal
    isOpen={confirmCancelOpen}
    type="warning"
    title="Batalkan semua perubahan?"
    message="Seluruh input yang belum disimpan pada periode ini akan dibuang dan dikembalikan ke data server."
    confirmText="Ya, batalkan"
    cancelText="Kembali mengedit"
    onConfirm={() => { setConfirmCancelOpen(false); fetchData(tahun); }}
    onCancel={() => setConfirmCancelOpen(false)}
  />
  ```

#### `UIUX-002`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Tinggi
- **Lokasi:** `components/PokjaDataPage.js:550`, `components/NestedDataPage.js:352`, `components/BumilDataPage.js:344`
- **Deskripsi Masalah:** Proteksi kehilangan input `beforeunload` hanya terpasang di `BumilDataPage` dan `NestedDataPage`, serta absen di `PokjaDataPage`. Lebih penting lagi, `beforeunload` hanya menangkap reload/close tab dan **tidak menangkap navigasi client-side Next.js (`<Link>` di Sidebar, Topbar, dan breadcrumb)**.
- **Dampak:** Jika kader sedang menginput data (dirty status aktif) lalu mengklik menu lain di sidebar, Next.js langsung berpindah halaman dan seluruh inputan yang belum disimpan lenyap seketika tanpa peringatan.
- **Rekomendasi Konkret:**
  1. Pasang event listener `beforeunload` di `PokjaDataPage.js`.
  2. Implementasikan router navigation guard / custom interceptor pada tautan sidebar saat `dirtyCount > 0` untuk memunculkan konfirmasi "Ada perubahan belum disimpan. Tinggalkan halaman?".

#### `UIUX-003`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `components/PokjaDataPage.js:449-458`, `components/BumilDataPage.js:441-450`, `components/NestedDataPage.js:488-497`, `app/dashboard/admin/page.js:29-33`, `app/dashboard/approval/page.js:50`
- **Deskripsi Masalah:** Terdapat sistem toast global accessible di `components/Toast.jsx` + `lib/useToast.js` yang sudah dilengkapi `aria-live="polite"`. Namun, 5 halaman utama di atas mengabaikan modul tersebut dan membuat state `toast` lokal sendiri dengan markup div floating fixed tanpa atribut `aria-live`.
- **Dampak:** Notifikasi keberhasilan/kegagalan simpan pada halaman input utama tidak diumumkan ke pengguna pembaca layar (screen reader) dan tampilan notifikasi menjadi tidak seragam.
- **Rekomendasi Konkret:** Hapus state lokal `const [toast, setToast] = useState(null)` di kelima file tersebut, gunakan hook terpusat `const { showToast } = useToast()`, dan biarkan `<ToastViewport />` di `app/dashboard/layout.js:115` merender seluruh notifikasi.

#### `UIUX-004`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `components/PokjaDataPage.js:608,609,612,633,738,739`, `components/NestedDataPage.js:760,792,793,794`
- **Deskripsi Masalah:** Sel-sel tabel sticky (No, Nama Dusun, dan baris JUMLAH) menggunakan inline styling kaku `style={{ background: '#f9fafb' }}`, `style={{ background: '#fff' }}`, dan `style={{ background: '#f0fdf4' }}`. Spesifisitas inline style mengalahkan aturan CSS dark mode global.
- **Dampak:** Pada dark mode, kolom No, Nama Dusun, dan baris total JUMLAH tetap menyala putih/terang benderang, menyebabkan tabrakan warna dan teks putih tidak terbaca di atas sel putih.
- **Rekomendasi Konkret:** Hapus seluruh inline `background` dari sel sticky dan gunakan class utilitas Tailwind atau class CSS bertema (mis. `bg-white dark:bg-surface-elevated` atau CSS variable `--table-sticky-bg`).

#### `UIUX-005`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Rendah
- **Lokasi:** `components/PokjaDataPage.js:750`
- **Deskripsi Masalah:** Typo nama class Tailwind pada sel pojok kanan baris JUMLAH:
  ```jsx
  {canEdit && <td className="sticky right-0 background-[#f0fdf4] z-30"></td>}
  ```
  `background-[#f0fdf4]` bukan class Tailwind yang valid (sintaks benar: `bg-[#f0fdf4]`).
- **Dampak:** Sel pojok kanan bawah tidak memiliki warna latar belakang (menjadi transparan) sehingga saat tabel di-scroll horizontal, teks di bawahnya terlihat tembus pandang.
- **Rekomendasi Konkret:** Ganti `background-[#f0fdf4]` menjadi `bg-[#f0fdf4]`.

#### `UIUX-006`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Rendah
- **Lokasi:** `components/OnboardingTour.jsx:34` vs `components/DashboardToolbar.jsx:142`
- **Deskripsi Masalah:** Langkah panduan Onboarding Tour menargetkan selector `target: '[aria-label="Pilih tahun dashboard"]'`, sedangkan dropdown filter tahun di `DashboardToolbar.jsx:142` memiliki atribut `aria-label="Tahun"`.
- **Dampak:** Elemen target tidak ditemukan oleh script tour sehingga spotlight gagal menyorot dropdown tahun dan fallback jatuh ke tengah layar.
- **Rekomendasi Konkret:** Di `components/DashboardToolbar.jsx:142`, ubah atribut `aria-label` select tahun menjadi `"Pilih tahun dashboard"`.

#### `UIUX-007`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Rendah
- **Lokasi:** `app/globals.css:133-167` vs `app/globals.css:646-675`, `tailwind.config.js:3`
- **Deskripsi Masalah:** Aturan CSS `.dark .sidebar` didefinisikan duplikat dua kali di `globals.css` dengan nilai hex warna yang berbeda (`#111a16` vs `#111c18`). Selain itu di `tailwind.config.js:3`, baris darkMode tertulis `darkMode: ['class', 'class']`.
- **Dampak:** Dead CSS code, potensi konflik rendering CSS, dan penulisan konfigurasi Tailwind yang anomali.
- **Rekomendasi Konkret:** Hapus blok duplikat `.dark .sidebar` di baris 133–167 `globals.css`, dan ubah `tailwind.config.js:3` menjadi `darkMode: 'class'`.

#### `UIUX-008`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `components/charts/DusunBarChart.jsx:29-98`, `components/charts/KaderDonut.jsx:41-60`, `components/charts/StackedBumilBar.jsx`, `app/dashboard/page.js:91-102`
- **Deskripsi Masalah:** Seluruh elemen `<svg>` chart animasi diberi atribut `aria-hidden="true"` atau tidak memiliki `role="img"` dan `aria-label`, serta tidak disertai tabel data padanan yang dapat dibaca pembaca layar.
- **Dampak:** Pengguna tunanetra/gangguan penglihatan yang menggunakan screen reader tidak dapat mengakses informasi data statistik per dusun dan distribusi kader PKK.
- **Rekomendasi Konkret:** Beri setiap wrapper chart atribut `role="region"` dengan `aria-label` deskriptif, dan sertakan tabel tersembunyi ber-class `sr-only` yang memuat ringkasan angka metrik.

#### `UIUX-009`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `components/PokjaDataPage.js:656-670`
- **Deskripsi Masalah:** Input sel pada tabel desktop tidak memiliki atribut `aria-label`, `id`, maupun `htmlFor`. Berbeda dengan tampilan kartu mobile yang sudah memiliki `<label htmlFor="...">`.
- **Dampak:** Pengguna screen reader yang bernavigasi menggunakan Tab di tabel desktop hanya mendengar pembacaan "Edit text, nol" tanpa informasi nama kolom data dan nama dusun.
- **Rekomendasi Konkret:** Tambahkan atribut `aria-label={`${col.label} — ${d.nama}`}` pada input teks/angka di baris 656 dan 665.

#### `UIUX-010`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `components/PokjaDataPage.js:652,662,674`
- **Deskripsi Masalah:** Pada tabel desktop, pesan error/warning validasi hanya ditaruh di atribut `title={valObj.warning || ''}`, sedangkan indikator visual hanya berupa border merah/amber.
- **Dampak:** Pesan detail kesalahan (misal: "KK tidak boleh melebihi jiwa") hanya bisa dibaca dengan meletakkan kursor mouse (hover) di atas sel. Pengguna keyboard murni atau pengguna layar sentuh tidak dapat membaca pesan ini.
- **Rekomendasi Konkret:** Sediakan popover tooltip yang muncul saat input menerima keyboard focus (`focus-visible`) atau tampilkan daftar ringkasan isu baris di bawah tabel.

#### `UIUX-011`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `app/publik/page.js:1`, `app/layout.js:28-38`
- **Deskripsi Masalah:** Halaman data publik `/publik` dideklarasikan dengan `'use client'` dan memuat data via `fetch` di dalam `useEffect`. Tidak ada metadata Open Graph, Twitter card, atau `metadataBase` di `layout.js`.
- **Dampak:** First Contentful Paint (FCP) lambat karena harus menunggu JS hydrate, tidak optimal untuk pengindeksan mesin pencari (SEO publik desa), dan tautan publik yang dibagikan ke WhatsApp atau Facebook tidak memiliki kartu preview (OG Card) yang informatif.
- **Rekomendasi Konkret:** Refactor `app/publik/page.js` menjadi Server Component yang memanggil logic `getPublicSummary()` langsung di server, serta tambahkan `export const metadata` dengan OpenGraph image dan deskripsi resmi TP PKK Desa Belikurip.

#### `UIUX-012`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Rendah
- **Lokasi:** `components/Topbar.js:34`
- **Deskripsi Masalah:** Polling interval 60 detik untuk memeriksa notifikasi baru `setInterval(fetchNotifications, 60000)` berjalan tanpa henti tanpa memeriksa apakah tab browser sedang aktif.
- **Dampak:** Membuang request API dan kuota data seluler kader desa saat tab browser ditinggalkan di latar belakang.
- **Rekomendasi Konkret:** Tambahkan pengecekan `if (document.hidden) return;` sebelum memicu fetch atau pasang listener `document.addEventListener('visibilitychange', ...)`.

#### `UIUX-013`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Rendah
- **Lokasi:** `components/ui/button.jsx`, `components/ui/card.jsx`, `components/ui/badge.jsx`, `components/ui/accordion.jsx`, `components/ui/table.jsx`
- **Deskripsi Masalah:** File primitive komponen UI di `components/ui/` berstatus **dead code / orphan code**. Tidak ada satu pun file di dalam aplikasi yang mengimpor `button.jsx` (hanya `Dialog.jsx` yang digunakan). Seluruh tombol di aplikasi dibuat manual secara ad-hoc dengan campuran style `rounded-xl`, `rounded-lg`, dan `rounded-full`.
- **Dampak:** Kode mubazir yang membingungkan developer baru serta inkonsistensi bentuk tombol dan card di berbagai halaman.
- **Rekomendasi Konkret:** Terapkan primitive `<Button>` dan `<Badge>` secara bertahap pada komponen formulir dan dashboard, atau hapus file primitive yang tidak dipakai.

#### `UIUX-014`
- **Aspek:** UI/UX & Aksesibilitas
- **Severity:** Sedang
- **Lokasi:** `components/Topbar.js:71`, `app/dashboard/layout.js:108`
- **Deskripsi Masalah:** Pada dropdown profil di Topbar, opsi "Ganti Password" memanggil `if (onOpenPasswordModal) onOpenPasswordModal(); else router.push('/dashboard/profile')`. Namun, pada `app/dashboard/layout.js:108`, `<Topbar user={user} onMobileMenuToggle={...} />` **tidak pernah mengirimkan prop `onOpenPasswordModal`**.
- **Dampak:** Mengklik "Ganti Password" di Topbar selalu melempar redirect ke halaman profil penuh, sementara tombol di Sidebar membuka modal dialog in-context. Pengalaman pengguna menjadi terbelah.
- **Rekomendasi Konkret:** Teruskan handler `onOpenPasswordModal` dari `layout.js` ke `Topbar` atau jadikan modal ganti password sebagai modal global yang dapat dipicu via state/URL.

---

## 3. Audit Aspek 6: Kelengkapan Fitur TP PKK Desa Belikurip

### 3.1. Kepatuhan Spesifikasi Format Laporan PKK Desa Belikurip

Berdasarkan perbandingan implementasi kode terhadap dokumen acuan `.kiro/specs/migrasi-level-desa/design.md` dan `requirements.md`:

| Tabel / Domain | Spesifikasi Resmi PKK & Migrasi v5 | Status Implementasi Kode | Evaluasi & Bukti |
|---|---|---|---|
| **Pokja I** | 19 kolom (No, Dusun, 16 metrik Pancasila & Gotong Royong, Keterangan). Annex B header hijau muda (`#D4EDDA`). | **Lengkap** | `lib/dataPages.js:56-74` (17 kolom logis + 2 identitas). Export Excel `app/api/export/excel/route.js:209-305` menerapkan Annex B dengan 19 kolom dan header hijau `#D4EDDA`. |
| **Pokja II** | 36 kolom (No, Dusun, 33 metrik Pendidikan, Keterangan). Drop 6 kolom legacy. Tambah 13 kolom baru. Annex C landscape A3. | **Bermasalah di Excel & Word** | `lib/dataPages.js:86-121` dan `supabase_schema_updates_v5.sql:164-179` sudah benar. Namun **Excel export menukar kolom `klp_pembaca` dan menghilangkan `bkb_jml_ibu_peserta` (`FEAT-001`)**, serta **Word export masih memakai skema legacy (`FEAT-002`)**. |
| **Pokja III** | 19 kolom (No, Dusun, 16 metrik Pangan, Sandang, Rumah Sehat, Keterangan). Annex D header biru muda (`#CCE5FF`). | **Lengkap** | `lib/dataPages.js:132-150`. Export Excel `app/api/export/excel/route.js:433-518` menerapkan Annex D dengan header biru `#CCE5FF` 19 kolom. |
| **Pokja IV** | 26 kolom (No, Dusun, 23 metrik Posyandu, Lansia, Jamban, Air, KB, Keterangan). Annex E header kuning muda (`#FFFF99`). | **Lengkap di Excel, Kurang di Word** | `lib/dataPages.js:161-186`. Export Excel `app/api/export/excel/route.js:526-646` lengkap 26 kolom. Di Word export, kolom `kk_tabungan` terlewat (`app/api/export/word/route.js:261`). |
| **Data Bumil** | 18 kolom (No, Dusun, RT, RW, Dawis, 4 metrik Ibu, 6 metrik Bayi termasuk `akte_l`/`akte_p`, 2 Balita Meninggal, Keterangan). Annex A landscape A4. | **Lengkap** | `lib/dataPages.js:244-266`. Kolom `akte_l` dan `akte_p` hadir. Export Excel `app/api/export/excel/route.js:112-204` derivasi RT/RW/Dawis dari Rekap Dawis secara otomatis. |
| **Rekap Dawis** | 34 kolom (No, Dusun, RW, RT, Dawis, KRT, KK, Anggota L/P, Balita, Lansia, 3 Buta, Difabel, Rumah, Air, Pangan, Kegiatan). Annex F landscape A3 vertical text. | **Lengkap** | `lib/dataPages.js:199-232`. Export Excel `app/api/export/excel/route.js:654-770` menerapkan 34 kolom dengan vertical text header. |
| **Data Umum** | 21 kolom (No, Dusun, RT, RW, Dawis, KRT, KK, Jiwa, Kader TPP/Umum/Khusus, Tenaga Honorer L/P, Tenaga Bantuan L/P, Keterangan). | **Lengkap** | `lib/dataPages.js:25-45`. Export Excel `app/api/export/excel/route.js:778-850` mencakup Honorer dan Bantuan. |
| **Report Years** | Tabel `report_years(tahun, is_active)` dengan fallback dinamis, endpoint admin CRUD, hook `useYears`. | **Lengkap** | `app/api/years/route.js`, `app/api/admin/years/route.js`, `lib/useYears.js`, `app/dashboard/admin/_components/YearsTab.jsx`. Terintegrasi di seluruh dropdown tahun. |
| **Column Overrides** | Fitur rename label dan hide kolom standar tanpa merusak konsistensi skema DB. | **Lengkap** | `app/api/admin/column-overrides/route.js`, `lib/columnOverrides.js`, `app/dashboard/admin/_components/ColumnsTab.jsx`. Terintegrasi di halaman data, stats, dan export Excel/template. |
| **AI Assistant** | Gemini assistant dengan dry-run preview, whitelist table/kolom, role validation dari JWT. | **Lengkap** | `app/api/chat/route.js`, `lib/aiMutation.js`, `components/ai-chat/*`, `app/api/chat/confirm-mutation/route.js`. |

---

### 3.2. Daftar Temuan Baru Kelengkapan Fitur

#### `FEAT-001`
- **Aspek:** Kelengkapan Fitur TP PKK Desa Belikurip
- **Severity:** Kritis
- **Lokasi:** `app/api/export/excel/route.js:331,393`, `lib/dataPages.js:98-100`, `lib/excel/sheetMap.js:63`
- **Deskripsi Masalah:** Pada fungsi export Excel Pokja II (`buildPokja2Sheet`), kolom 14 didefinisikan sebagai `JML KLP PEMBACA` yang diisi dari properti `data.klp_pembaca ?? 0` (baris 393), dan kolom BKB hanya memiliki 3 sub-kolom (Jml Klp, APE Set A, APE Set B). Kolom resmi `bkb_jml_ibu_peserta` dihilangkan.  
  Sebaliknya, pada database (`supabase_schema_updates_v5.sql:170`), `lib/dataPages.js:99`, `components/Pokja2DataPage.js:50`, dan `lib/excel/sheetMap.js:63`, kolom `bkb_jml_ibu_peserta` adalah kolom resmi dan `klp_pembaca` **tidak terdaftar**.
- **Dampak:** 
  1. Input data kader untuk "BKB Jumlah Ibu Peserta" tidak pernah masuk ke dalam file Excel hasil unduhan (selalu hilang).
  2. Saat file Excel hasil export diunggah kembali melalui fitur Import Excel, `lib/excel/parseExcel.js` membaca kolom ke-14 sebagai `bkb_klp` dan kolom ke-15 sebagai `bkb_jml_ibu_peserta`. Terjadi **pergeseran data (data misalignment / corruption)** yang fatal pada angka-angka BKB.
- **Rekomendasi Konkret:** Perbaiki baris 330–375 dan 393–397 di `app/api/export/excel/route.js`:
  1. Hapus header `JML KLP PEMBACA` di kolom N (col 14).
  2. Kembalikan grup BKB menjadi 4 sub-kolom: `bkb_klp` (col 14), `bkb_jml_ibu_peserta` (col 15), `bkb_ape_set_a` (col 16), `bkb_ape_set_b` (col 17).
  3. Petakan nilai baris sesuai kunci: `data.bkb_jml_ibu_peserta ?? 0`.

#### `FEAT-002`
- **Aspek:** Kelengkapan Fitur TP PKK Desa Belikurip
- **Severity:** Tinggi
- **Lokasi:** `app/api/export/word/route.js:128-185`, `app/api/export/word/route.js:253-264`
- **Deskripsi Masalah:** 
  1. Definisi Pokja II di `app/api/export/word/route.js:168-185` masih menggunakan kolom-kolom lama yang sudah dihapus pada migrasi v5 (`rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`) dan tidak memuat 13 kolom baru laporan resmi PKK (`jml_warga_3_buta`, `kf_klp`, `kf_wrg`, `paud_sejenis`, `bkb_*`, `kader_tutor_*`, `yg_dilatih_*`).
  2. Pada Pokja IV baris 253–264, kolom `kk_tabungan` terlewat dari daftar `flatKeys`.
  3. Endpoint Word export hanya mencakup Pokja I–IV. Tabel Data Umum, Rekapitulasi Dawis, dan Data Bumil sama sekali tidak tersedia di export Word.
- **Dampak:** Dokumen Word yang dihasilkan untuk Pokja II menampilkan kolom-kolom usang yang seluruh selnya kosong (karena kolom tidak ada lagi di DB), dan 13 indikator terkini tidak tercetak sama sekali. Pengguna juga tidak dapat membuat laporan Word untuk Data Umum, Dawis, dan Bumil.
- **Rekomendasi Konkret:**
  1. Perbarui `flatKeys` dan susunan header Pokja II pada `app/api/export/word/route.js` agar persis mengikuti `DATA_PAGES.pokja2`.
  2. Tambahkan kolom `kk_tabungan` pada Pokja IV.
  3. Tambahkan generator section Word untuk Data Umum, Rekap Dawis, dan Data Bumil.

#### `FEAT-003`
- **Aspek:** Kelengkapan Fitur TP PKK Desa Belikurip
- **Severity:** Sedang
- **Lokasi:** `components/NestedDataPage.js:520-538`
- **Deskripsi Masalah:** Kontrol `DensityToggle.jsx` (pilihan tata letak Nyaman / Ringkas) hanya diintegrasikan di `PokjaDataPage.js` dan `BumilDataPage.js`. Seluruh halaman tabel yang menggunakan `NestedDataPage.js` (Pokja I, Pokja II, Pokja III, Pokja IV, Rekapitulasi Dawis, dan Data Umum) tidak memiliki tombol Density Toggle di toolbarnya.
- **Dampak:** Operator yang membuka Pokja II (36 kolom) atau Rekap Dawis (34 kolom) pada layar berukuran standar (laptop 14 inci) tidak dapat mengaktifkan mode ringkas untuk merapatkan padding baris dan kolom.
- **Rekomendasi Konkret:** Impor `useDensity` dan pasang `<DensityToggle density={density} onChange={setDensity} />` di toolbar `components/NestedDataPage.js:522`, serta terapkan class `density-compact` pada elemen `<table>` saat mode compact aktif.

---

## 4. R2: Verifikasi Status Seluruh Temuan Lama

Di bawah ini adalah hasil audit dan verifikasi kode terkini terhadap **seluruh** temuan dari 6 dokumen review historis:
1. `PROJECT_REVIEW.md` (11 Mei 2026)
2. `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md` (17 Juni 2026)
3. `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md` (17 Juni 2026)
4. `REVIEW_UIUX_FITUR_2026-07-02.md` (2 Juli 2026)
5. `UI_UX_AND_FEATURE_GAPS.md` (12 Juni 2026)
6. `AI_SKILLS_PROJECT_REVIEW.md`

Status diklasifikasikan menjadi:
- **Sudah diperbaiki**: Masalah telah terselesaikan sepenuhnya di kode terkini.
- **Sebagian**: Telah dikerjakan sebagian namun masih ada celah atau cakupan yang belum selesai.
- **Belum**: Belum dikerjakan atau masih terbuka di kode terkini.
- **Tidak relevan lagi**: Tidak berlaku lagi akibat perubahan arsitektur (mis. penghapusan SQLite).

---

### Tabel Verifikasi Temuan Historis

| ID / Nama Temuan Lama | Dokumen Sumber | Status Saat Ini | Bukti Kode Terkini (`file:line`) | Analisis & Catatan Verifikasi |
|---|---|:---:|---|---|
| **Endpoint admin tanpa autentikasi** (`/api/admin/users`, `desa`, `logs`, `columns`) | `PROJECT_REVIEW.md:44-59` | **Sudah diperbaiki** | `app/api/admin/users/route.js:15`, `app/api/admin/dusun/route.js:13`, `app/api/admin/logs/route.js:13`, `app/api/admin/columns/route.js:27` | Semua route handler admin memanggil `requireAdmin(request)` yang memvalidasi JWT cookie secara ketat. Non-admin ditolak 401/403. |
| **Kredensial default admin masih aktif (`admin/admin123`)** | `PROJECT_REVIEW.md:60-72`, `UI_UX_AND_FEATURE_GAPS.md:33-35` | **Belum** | `supabase_schema.sql:309`, `AGENTS.md:111`, `README.md:86,181` | Akun default `admin/admin123` masih di-seed di SQL skema; belum ada pemaksaan ganti password pada login pertama (`must_change_password`). |
| **Chat endpoint percaya role dari request body** | `PROJECT_REVIEW.md:74-87` | **Sudah diperbaiki** | `app/api/chat/route.js:215` | Role diambil dari `requireAuth(request)` server-side via cookie JWT. Properti `body.user.role` diabaikan sepenuhnya. |
| **Supabase service role digunakan secara global** | `PROJECT_REVIEW.md:88-100` | **Sebagian** | `lib/supabase.js:20-50` | `supabaseAdmin` dipisah dari `supabaseAnon`. Namun fallback ke service role masih aktif pada mode development jika anon key tidak ada. |
| **Proteksi Dashboard hanya client-side** | `PROJECT_REVIEW.md:103-115` | **Sudah diperbaiki** | `proxy.js:1-68` | Next.js 16 Edge proxy memeriksa cookie JWT dengan `jwtVerify` sebelum halaman `/dashboard/*` dimuat ke browser. |
| **Export Word & Excel dapat diakses tanpa login** | `PROJECT_REVIEW.md:116-129` | **Sudah diperbaiki** | `app/api/export/excel/route.js:53`, `app/api/export/word/route.js:335` | Kedua route handler export diawali dengan `requireAuth(request)`. Akses anonim mengembalikan 401 Unauthorized. |
| **Route UI admin mismatch (`/api/admin/desa/{id}` & backup)** | `PROJECT_REVIEW.md:130-142` | **Sudah diperbaiki** | `app/dashboard/admin/_components/DesaTab.jsx:23,32`, `app/api/admin/backup/route.js:6` | `DesaTab` memanggil PUT `/api/admin/dusun`. Endpoint backup lama di-mark 410 Gone dan tab diganti "Import Excel". |
| **Strategi database bercampur (Supabase & SQLite)** | `PROJECT_REVIEW.md:143-158` | **Sudah diperbaiki** | `package.json`, `next.config.mjs`, `lib/supabase.js` | `better-sqlite3` telah dihapus sepenuhnya dari dependencies dan konfigurasi build. 100% data tersimpan di Supabase. |
| **Validasi input API belum konsisten** | `PROJECT_REVIEW.md:170-180` | **Sudah diperbaiki** | `lib/requestValidation.js:1-250` | Skema validasi server-side diterapkan untuk payload update, column overrides, dan mutasi data. |
| **Feedback autosave onBlur membingungkan** | `PROJECT_REVIEW.md:181-190` | **Sudah diperbaiki** | `components/PokjaDataPage.js:340-342, 550`, `NestedDataPage.js:545` | Terdapat banner dirty state, badge "Belum disimpan / Tersimpan", serta tombol "Simpan Semua". |
| **Audit log tidak di-await & tidak catat before/after** | `PROJECT_REVIEW.md:191-196` | **Sudah diperbaiki** | `lib/audit.js:16`, `supabase_schema_updates_v2.sql:10-15` | `writeLog` diubah menjadi `async` dan di-`await` di semua route. Tabel `audit_logs` menyimpan `before_json`, `after_json`, dan `ip`. |
| **Asset logo `/logo.png` berpotensi hilang** | `PROJECT_REVIEW.md:197-207` | **Sebagian** | `public/logo.png`, `components/Sidebar.js:70`, `app/page.js:55` | File `public/logo.png` sudah ada, namun klaim bahwa `onError` fallback ke `/map-baturetno.svg` sudah dipasang ternyata **belum ada di kode**. |
| **Matrix kelengkapan data per dusun** | `PROJECT_REVIEW.md:212-215` | **Sudah diperbaiki** | `app/dashboard/page.js:460-520` | Matrix status kelengkapan data per dusun tampil di dashboard dengan indikator lengkap/perlu dicek/belum lengkap. |
| **Validasi kualitas data otomatis** | `PROJECT_REVIEW.md:216-223` | **Sudah diperbaiki** | `lib/validation.js:1-120`, `lib/dataQuality.js:1-80` | Peringatan otomatis untuk anomali, lonjakan drastis dibanding tahun lalu, dan inkonsistensi gender. |
| **Workflow submit, review, dan approval** | `PROJECT_REVIEW.md:224-227`, `UI_UX_AND_FEATURE_GAPS.md:9-10` | **Sudah diperbaiki** | `app/dashboard/approval/page.js:1-261`, `app/api/periods/route.js:1-200` | Alur draft → submitted → approved → locked dengan antrean approval untuk admin sudah berjalan penuh. |
| **Lock periode laporan** | `PROJECT_REVIEW.md:233-235`, `UI_UX_AND_FEATURE_GAPS.md:9-10` | **Sudah diperbaiki** | `lib/periodLock.js:1-65`, `app/api/periods/route.js` | Server guard menolak mutasi (UI & AI) jika periode terkunci (`status === 'locked'`). |
| **Import Excel preview diff & confirm** | `PROJECT_REVIEW.md:236-243`, `UI_UX_AND_FEATURE_GAPS.md:15-16` | **Sudah diperbaiki** | `lib/excel/previewDiff.js:1-210`, `components/ai-chat/ImportPreviewModal.jsx` | Preview diff per baris (baru, ubah, lewati) dengan seleksi checkbox sebelum disimpan ke Supabase. |
| **Template Excel resmi per tabel** | `PROJECT_REVIEW.md:244-247` | **Sudah diperbaiki** | `app/api/export/template/route.js:1-159` | Endpoint unduh template blank Excel per tabel dengan nama-nama dusun sudah terisi otomatis. |
| **Fitur backup database terjadwal** | `PROJECT_REVIEW.md:248-250` | **Tidak relevan lagi** | `app/api/admin/backup/route.js` | Backup database PostgreSQL kini dikelola penuh via Supabase Dashboard. Backup tabel individual lewat Excel. |
| **Report Builder kustom** | `PROJECT_REVIEW.md:252-255` | **Sudah diperbaiki** | `app/dashboard/reports/page.js:1-320` | Pembuat laporan fleksibel (pilih tabel, dusun, kolom, tahun, bulan) dengan export ke Excel/Word/PDF. |
| **Dashboard tren lintas tahun** | `PROJECT_REVIEW.md:256-259` | **Sudah diperbaiki** | `app/dashboard/page.js:62-104`, `app/api/rekap/trend/route.js` | Kartu tren mini dengan grafik polyline interaktif menampilkan pergerakan data dari tahun ke tahun. |
| **Ranking dan perbandingan dusun** | `PROJECT_REVIEW.md:260-263` | **Sudah diperbaiki** | `components/DataStatsPage.js:300-348`, `components/charts/DusunBarChart.jsx` | Visualisasi peringkat dusun per indikator dengan horizontal bar chart. |
| **Sistem notifikasi dan pengingat** | `PROJECT_REVIEW.md:264-267`, `UI_UX_AND_FEATURE_GAPS.md:13-14` | **Sebagian** | `lib/notifications.js:1-120`, `app/dashboard/notifications/page.js` | Notifikasi approval/return aktif dengan badge bell di Topbar, namun reminder cron otomatis belum diimplementasikan. |
| **Halaman profil pengguna** | `PROJECT_REVIEW.md:279-282` | **Sudah diperbaiki** | `app/dashboard/profile/page.js:1-249` | Informasi profil, daftar permission, ganti password, dan log aktivitas login/mutasi terakhir. |
| **Mode publik data desa** | `PROJECT_REVIEW.md:283-286` | **Sudah diperbaiki** | `app/publik/page.js:1-278`, `app/api/public/summary/route.js` | Halaman portal data publik menampilkan agregat tanpa mengekspos data mentah privasi. |
| **AI dry-run mutation preview** | `PROJECT_REVIEW.md:293-296`, `UI_UX_AND_FEATURE_GAPS.md:11-12` | **Sudah diperbaiki** | `lib/aiMutation.js:1-180`, `components/ai-chat/MutationPreviewCard.jsx` | AI tidak langsung mengubah DB; menampilkan preview before/after yang harus dikonfirmasi oleh user. |
| **AI whitelist tool server-side** | `PROJECT_REVIEW.md:301-304` | **Sudah diperbaiki** | `lib/aiMutation.js:15-80` | `VALID_TABLES` dan `VALID_COLUMNS` divalidasi ketat di server sebelum eksekusi mutasi. |
| **README masih bawaan create-next-app** | `SENIOR_WEB_DEV_...:54-70` | **Sudah diperbaiki** | `README.md:1-213`, `.env.example`, `docs/DEPLOYMENT.md` | `README.md` ditulis ulang menjadi dokumentasi resmi, ada `.env.example` dan dokumentasi deployment/operasi. |
| **File UI terlalu besar (God Components)** | `SENIOR_WEB_DEV_...:71-92`, `AI_SKILLS_...:22-34` | **Sebagian** | `admin/page.js` (71 baris), `AiChatBubble.js` (54 baris), vs `NestedDataPage.js` (809 baris), `page.js` (786 baris) | `admin/page.js` dan `AiChatBubble.js` sudah dipecah rapi. Namun `NestedDataPage.js` dan `dashboard/page.js` masih sangat besar. |
| **Test frontend dan E2E belum sepadan** | `SENIOR_WEB_DEV_...:93-116` | **Sudah diperbaiki** | `__tests__/client/` (3 test), `e2e/tests/` (5 Playwright specs) | Ditambahkan pengujian React Testing Library untuk Dialog, Toolbar, Topbar, serta Playwright E2E smoke & a11y. |
| **Feedback error belum konsisten (alert/confirm)** | `SENIOR_WEB_DEV_...:117-134` | **Sebagian** | `components/ConfirmModal.js`, `Dialog.jsx` | `window.confirm` dan `alert` pada aksi utama diganti `ConfirmModal`, namun tombol "Batalkan" belum terproteksi dan toast terfragmentasi. |
| **UI dashboard terlalu padat & setara** | `SENIOR_WEB_DEV_...:135-155` | **Sebagian** | `components/TodoTodayPanel.jsx`, `app/dashboard/page.js:16` | Panel tugas hari ini ditambahkan di posisi teratas, tetapi halaman dashboard masih memuat banyak chart dan tabel dalam satu alur panjang. |
| **Dominan warna hijau/emerald monoton** | `SENIOR_WEB_DEV_...:157-173`, `UI_UX_AND_FEATURE_GAPS.md:27-28` | **Sebagian** | `tailwind.config.js:58-91`, `app/globals.css` | Status badges sudah memakai amber/biru/merah, namun permukaan dan identitas aplikasi masih sangat dominan hijau tua/emerald. |
| **Inkonsistensi border radius tombol** | `SENIOR_WEB_DEV_...:174-189`, `REVIEW_UIUX_FITUR_...:77-78` | **Belum** | `components/ui/button.jsx:13` vs `components/EmptyState.jsx:39`, `PokjaDataPage.js:565` | `ui/Button` memakai pill (`rounded-full`) tapi tidak pernah dipakai; tombol di kode dibuat manual dengan `rounded-xl` dan `rounded-lg`. |
| **Halaman publik kurang naratif bagi warga** | `SENIOR_WEB_DEV_...:190-207` | **Sudah diperbaiki** | `app/publik/page.js:130-170` | Ditambahkan narasi "Ringkasan Kondisi", definisi istilah Dasa Wisma, Posyandu, JKN/BPJS, serta catatan privasi data. |
| **Dark mode masih patch-based & rapuh** | `SENIOR_WEB_DEV_...:208-222`, `REVIEW_UIUX_FITUR_...:57-69` | **Belum** | `app/globals.css:674-838`, `PokjaDataPage.js:608,633` | Mengandalkan override CSS global `.dark .bg-white`, sel sticky tabel bocor warna putih di dark mode akibat inline style. |
| **Alasan revisi pada approval return** | `SENIOR_WEB_DEV_...:225-235` | **Sudah diperbaiki** | `app/dashboard/approval/page.js:98-105` | Input alasan revisi (minimal 3 karakter) diwajibkan saat admin melakukan tindakan "Kembalikan" periode. |
| **Import AI Chat diff stale saat periode diubah** | `SENIOR_WEB_DEV_...:247-254` | **Sudah diperbaiki** | `components/ai-chat/ImportPreviewModal.jsx:170-188` | State `previewStale` menandai diff kedaluwarsa jika tahun/bulan diubah dan tombol "Hitung ulang preview" diwajibkan sebelum simpan. |
| **Belum ada command palette (`Ctrl+K`)** | `SENIOR_WEB_DEV_...:255-264`, `REVIEW_UIUX_FITUR_...:138` | **Belum** | Codebase repository | Belum ada fitur pencarian global atau command palette `Ctrl+K`. |
| **Belum ada observabilitas produksi (Sentry/Log)** | `SENIOR_WEB_DEV_...:265-275` | **Belum** | Codebase repository | Belum terpasang error monitoring production seperti Sentry atau request tracing ID. |
| **Rencana pensiun legacy alias (`desa` & `kegiatan_warga`)** | `SENIOR_WEB_DEV_...:276-285` | **Belum** | `lib/auth.js:12`, `lib/dataPages.js:275` | Alias backward-compatibility masih dipertahankan tanpa dokumen rencana tanggal pensiun resmi. |
| **Supabase anon key warning & public client fallback** | `REVIEW_TEMUAN_...:21-42` | **Sudah diperbaiki** | `lib/supabase.js:31,42` | Di mode production, `supabaseAnon` melempar error tegas jika `NEXT_PUBLIC_SUPABASE_ANON_KEY` tidak diatur di environment. |
| **Risiko duplikasi `report_periods` (bulan IS NULL)** | `REVIEW_TEMUAN_...:43-67` | **Sudah diperbaiki** | `supabase_schema_updates_v5.sql`, `v13` | Dibuat partial unique indexes di PostgreSQL: satu untuk `bulan IS NULL` dan satu untuk `bulan IS NOT NULL`. |
| **Query notifikasi bulanan salah filter** | `REVIEW_TEMUAN_...:68-94` | **Sudah diperbaiki** | `lib/notifications.js:80-90` | Helper query menggunakan `.is('bulan', null)` untuk tahunan dan `.eq('bulan', bulan)` untuk bulanan. Lolos unit test. |
| **Import Excel belum month-aware penuh** | `REVIEW_TEMUAN_...:95-125` | **Sudah diperbaiki** | `lib/excel/previewDiff.js:115-130`, `lib/excel/importToSupabase.js:90-105` | Bulan menjadi parameter eksplisit di endpoint preview diff dan import confirm. |
| **Cache server-side untuk `/api/dusun`** | `REVIEW_TEMUAN_...:128-148`, `UI_UX_AND_FEATURE_GAPS.md:17-18` | **Sudah diperbaiki** | `app/api/dusun/route.js:15-35`, `lib/fetchDusun.js` | Module-level memory cache 60 detik dengan invalidasi seketika saat admin memperbarui data dusun. |
| **Aksesibilitas modal belum standar** | `REVIEW_TEMUAN_...:149-172` | **Sudah diperbaiki** | `components/ui/Dialog.jsx:1-110` | Primitive `Dialog` dengan focus trap Tab, Escape close, dan focus restore menggantikan modal usang. |
| **Typo class Tailwind `background-[#f0fdf4]`** | `REVIEW_UIUX_FITUR_...:81` | **Belum** | `components/PokjaDataPage.js:750` | Class invalid `background-[#f0fdf4]` masih tertulis pada baris 750, belum dikoreksi menjadi `bg-[#f0fdf4]`. |
| **Typo syntax `darkMode: ['class', 'class']`** | `REVIEW_UIUX_FITUR_...:64` | **Belum** | `tailwind.config.js:3` | Nilai array kembar `['class', 'class']` masih ada di file konfigurasi. |
| **Duplikasi aturan CSS dark mode sidebar** | `REVIEW_UIUX_FITUR_...:66` | **Belum** | `app/globals.css:133-167` vs `646-675` | Dua blok aturan `.dark .sidebar` dengan nilai warna berbeda masih tercantum di stylesheet. |
| **Target Onboarding tour filter tahun salah selector** | `REVIEW_UIUX_FITUR_...:94` | **Belum** | `components/OnboardingTour.jsx:34` vs `DashboardToolbar.jsx:142` | `[aria-label="Pilih tahun dashboard"]` tidak cocok dengan `aria-label="Tahun"`. |
| **Chart SVG tanpa alternatif pembaca layar** | `REVIEW_UIUX_FITUR_...:100` | **Belum** | `components/charts/DusunBarChart.jsx`, `KaderDonut.jsx`, `StackedBumilBar.jsx` | Elemen chart SVG tidak memiliki representasi tabel atau teks padanan aksesibilitas. |
| **Input desktop tanpa `aria-label`** | `REVIEW_UIUX_FITUR_...:102` | **Belum** | `components/PokjaDataPage.js:656-670` | Sel input pada tabel desktop tidak memiliki label yang dapat diidentifikasi screen reader. |
| **Error validasi hanya via hover title di desktop** | `REVIEW_UIUX_FITUR_...:104` | **Belum** | `components/PokjaDataPage.js:652,662` | Teks peringatan validasi hanya dapat diakses melalui tooltip mouse hover. |
| **Portal publik client-rendered tanpa SEO** | `REVIEW_UIUX_FITUR_...:115` | **Belum** | `app/publik/page.js:1`, `app/layout.js:28` | Halaman publik diawali `'use client'`, FCP lambat, tanpa metadata Open Graph. |
| **Polling notifikasi Topbar tanpa cek visibilitas** | `REVIEW_UIUX_FITUR_...:118` | **Belum** | `components/Topbar.js:34` | Polling interval 60 detik tetap berjalan saat tab diminimalkan atau di latar belakang. |
| **Komponen UI primitive shadcn orphan code** | `REVIEW_UIUX_FITUR_...:77-79` | **Belum** | `components/ui/button.jsx`, `card.jsx`, `badge.jsx`, `accordion.jsx`, `table.jsx` | File-file primitive tidak pernah diimpor oleh halaman aplikasi mana pun. |
| **Prop modal ganti password Topbar tidak diteruskan** | `REVIEW_UIUX_FITUR_...:92` | **Belum** | `components/Topbar.js:71`, `app/dashboard/layout.js:108` | `onOpenPasswordModal` tidak dikirim dari layout, memicu redirect alih-alih modal. |
| **Beban input data mobile (navigasi & accordion)** | `UI_UX_AND_FEATURE_GAPS.md:21-22` | **Sudah diperbaiki** | `components/PokjaDataPage.js:330-435`, `NestedDataPage.js:580-596` | Telah diterapkan collapsible mobile card dan dropdown lompat cepat antar dusun. |
| **Tabel lebar desktop sulit dipindai (Density Toggle)** | `UI_UX_AND_FEATURE_GAPS.md:23-24` | **Sebagian** | `components/DensityToggle.jsx`, `PokjaDataPage.js:492`, `BumilDataPage.js:483` | Density toggle hadir di PokjaDataPage dan BumilDataPage, namun **absen di seluruh tabel `NestedDataPage.js`**. |
| **Transisi halaman blank (Loading Skeleton)** | `UI_UX_AND_FEATURE_GAPS.md:25-26` | **Sudah diperbaiki** | `components/TableSkeleton.jsx`, `PokjaDataPage.js:50`, `NestedDataPage.js:472` | TableSkeleton dipasang pada masa tunggu pemuatan awal (initialLoading). |
| **Refactoring God Component `AiChatBubble.js`** | `AI_SKILLS_...:23-31` | **Sudah diperbaiki** | `components/AiChatBubble.js` (54 baris), `components/ai-chat/*`, `hooks/useAiChat.js` | `AiChatBubble.js` sukses direfaktor dari ~1000 baris menjadi komposisi tipis dengan custom hook. |
| **Hover state pada baris tabel** | `AI_SKILLS_...:46` | **Sudah diperbaiki** | `components/PokjaDataPage.js:632-634` | Ditambahkan class `group-hover:bg-primary-50/50 transition-colors` pada sel baris tabel. |

---

## 5. Roadmap Rekomendasi Perbaikan Bertahap

### 5.1. Quick Wins (Prioritas Segera — Dampak Tinggi, Usaha Ringan)
1. **Perbaiki Inkonsistensi Kolom Pokja II di Excel Export (`FEAT-001`):**  
   - Lokasi: `app/api/export/excel/route.js:331,393`
   - Tindakan: Hapus kolom phantom `JML KLP PEMBACA` (`klp_pembaca`) dan kembalikan kolom resmi `bkb_jml_ibu_peserta` di kelompok data BKB agar selaras dengan DB, input UI, dan sheet map import. Mencegah korupsi data saat proses ekspor-impor ulang.
2. **Tambahkan Konfirmasi Dialog pada Tombol "Batalkan" (`UIUX-001`):**  
   - Lokasi: `components/PokjaDataPage.js:557`, `components/BumilDataPage.js:540`, `components/NestedDataPage.js:568`
   - Tindakan: Tampilkan `ConfirmModal` tipe warning sebelum menghapus buffer perubahan dirty data.
3. **Perbaiki Typo Tailwind & Konfigurasi Dark Mode (`UIUX-005`, `UIUX-007`):**  
   - Lokasi: `components/PokjaDataPage.js:750`, `tailwind.config.js:3`, `app/globals.css:133-167`
   - Tindakan: Ubah `background-[#f0fdf4]` → `bg-[#f0fdf4]`, ubah `darkMode: ['class', 'class']` → `darkMode: 'class'`, dan hapus blok CSS duplikat `.dark .sidebar`.
4. **Koreksi Selector Target Onboarding Tour (`UIUX-006`):**  
   - Lokasi: `components/DashboardToolbar.jsx:142`
   - Tindakan: Selaraskan `aria-label="Pilih tahun dashboard"` pada dropdown filter tahun agar panduan spotlight tour berjalan tepat sasaran.
5. **Koreksi Polling Tab Background (`UIUX-012`):**  
   - Lokasi: `components/Topbar.js:34`
   - Tindakan: Hentikan interval polling saat `document.hidden` bernilai true.

### 5.2. Jangka Menengah (Prioritas Sedang — Stabilitas & Konsistensi UI/UX)
1. **Perbarui Skema Kolom Export Word (`FEAT-002`):**  
   - Lokasi: `app/api/export/word/route.js`
   - Tindakan: Perbarui `flatKeys` Pokja II agar memuat 13 kolom baru dan membuang kolom legacy v5; sertakan kolom `kk_tabungan` di Pokja IV; dan tambahkan section dokumen untuk Data Umum, Rekap Dawis, dan Data Bumil.
2. **Konsolidasi Sistem Toast Global (`UIUX-003`):**  
   - Lokasi: `components/PokjaDataPage.js`, `BumilDataPage.js`, `NestedDataPage.js`, `app/dashboard/admin/page.js`
   - Tindakan: Hapus seluruh state `toast` lokal mandiri dan gunakan hook `useToast()` tunggal agar notifikasi bersuara di pembaca layar (`aria-live="polite"`).
3. **Hilangkan Kebocoran Warna Sel Sticky di Dark Mode (`UIUX-004`):**  
   - Lokasi: `components/PokjaDataPage.js`, `components/NestedDataPage.js`
   - Tindakan: Hapus inline style background putih/hijau dari sel sticky dan ganti dengan semantic token class (`bg-surface dark:bg-surface-elevated`).
4. **Pasang Density Toggle di Seluruh Halaman Nested Table (`FEAT-003`):**  
   - Lokasi: `components/NestedDataPage.js`
   - Tindakan: Impor `useDensity` dan pasang tombol `DensityToggle` agar tabel Pokja I–IV, Dawis, dan Data Umum dapat diatur kerapatannya.
5. **Tambahkan Label Aksesibilitas Input Desktop (`UIUX-009`):**  
   - Lokasi: `components/PokjaDataPage.js:656-670`
   - Tindakan: Beri atribut `aria-label={`${col.label} — ${d.nama}`}` pada setiap input sel desktop.
6. **Guard Navigasi Client-Side untuk Perubahan Belum Disimpan (`UIUX-002`):**  
   - Lokasi: `components/Sidebar.js`, `components/PokjaDataPage.js`, `components/NestedDataPage.js`
   - Tindakan: Intercept klik menu tautan saat terdapat perubahan dirty agar pengguna tidak kehilangan data.

### 5.3. Jangka Panjang (Penyempurnaan Arsitektur & Finishing)
1. **Refactor Komponen Monolitik Besar:**  
   - Modularisasi `components/NestedDataPage.js` (809 baris) dan `app/dashboard/page.js` (786 baris) menjadi sub-komponen terisolasi (ekstrak hook `useDashboardData`, `useNestedData`, sub-tabel header, dsb.).
2. **Server-Side Rendering & SEO Portal Publik (`UIUX-011`):**  
   - Ubah `app/publik/page.js` menjadi React Server Component untuk First Contentful Paint instan, dan tambahkan metadata Open Graph lengkap.
3. **Penyatuan Komponen UI & Pembersihan Orphan Code (`UIUX-013`):**  
   - Standarkan hierarki tombol aplikasi menggunakan `<Button>` dari `components/ui/button.jsx` dan hapus komponen dead code yang tidak terpakai.
4. **Aksesibilitas Visualisasi Chart (`UIUX-008`):**  
   - Lengkapi seluruh chart buatan tangan dengan elemen fallback tabel teks tersembunyi (`sr-only`) untuk pembaca layar.
5. **Pemberlakuan Kebijakan Keamanan Akun Admin:**  
   - Tambahkan flag database `must_change_password` dan paksa rotasi password pada login pertama untuk menggantikan kredensial bootstrap default `admin123`.
