# Laporan Investigasi: Frontend UI/UX, Aksesibilitas, & Fitur Operasional Kader

**Agent ID**: `explorer_survey_frontend_4`  
**Role**: Frontend UI/UX & Accessibility Specialist Explorer  
**Tanggal**: 2026-10-22  
**Target Milestone**: Survey & Technical Exploration Phase 4  

---

## 1. Observation

Berdasarkan inspeksi mendalam terhadap file kode sumber dan konfigurasi aplikasi, berikut adalah temuan faktual verbatim beserta lokasi barisnya:

### 1.1 `app/globals.css` dan Validasi Cell di Mode Gelap (`NestedDataPage.js`)
- Di `app/globals.css` baris 1303–1309:
  ```css
  /* Input di dalam nested table */
  .dark .nested-table table input,
  .dark .nested-table table textarea {
    background-color: #15201b !important;
    color: #e5e7eb !important;
    border-color: #2d3a33 !important;
  }
  ```
  Aturan CSS ini menggunakan `!important` untuk `background-color` dan `border-color`.
- Di `components/NestedDataPage.js`:
  - Baris 847–856 (`AutoGrowTextarea`):
    ```jsx
    className="w-full text-[13px] py-1.5 px-2 rounded-md border outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-dark text-gray-900 dark:text-gray-100"
    style={{
      border: hasError ? '1px solid #fca5a5' : hasWarning ? '1px solid #fcd34d' : undefined,
      background: hasError ? '#fef2f2' : hasWarning ? '#fffbeb' : undefined,
      ...
    }}
    ```
  - Baris 858–864 (`isText` text input):
    ```jsx
    <input type="text"
      key={`${d.id}-${col.key}-${dataVersion}`}
      aria-label={`${col.fullLabel || col.label} — ${d.nama}`}
      className="bg-white dark:bg-surface-dark text-gray-900 dark:text-gray-100"
      style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }}
      ... />
    ```
    (Input text sama sekali belum memiliki logika styling error/warning).
  - Baris 866–878 (numeric input):
    ```jsx
    <input
      key={`${d.id}-${col.key}-${dataVersion}`}
      type="text"
      inputMode="decimal"
      aria-label={`${col.fullLabel || col.label} — ${d.nama}`}
      className="bg-white dark:bg-surface-dark text-gray-900 dark:text-gray-100"
      style={{
        width: '100%', padding: '2px 4px', fontSize: 12, textAlign: 'center',
        border: hasError ? '1px solid #fca5a5' : hasWarning ? '1px solid #fcd34d' : '1px solid #e5e7eb',
        borderRadius: 4,
        background: hasError ? '#fef2f2' : hasWarning ? '#fffbeb' : undefined,
        outline: 'none',
      }}
      ...
    ```
  - Akibat spesifikasi CSS: Aturan `.dark .nested-table table input` yang memiliki flag `!important` di stylesheet selalu mengalahkan *inline style* tanpa `!important`. Akibatnya pada dark mode, garis batas merah `#fca5a5` dan kuning `#fcd34d` serta latar `#fef2f2` / `#fffbeb` **sepenuhnya tertimpa** oleh warna gelap `#15201b` dan border `#2d3a33`. Pengguna di dark mode tidak dapat melihat sel mana yang salah validasi.

### 1.2 Temuan Kritis Tambahan: `SteppedForm` Nyasar di Luar Scope Komponen pada `NestedDataPage.js`
- Di `components/NestedDataPage.js` baris 36–93:
  Komponen helper `VerticalText` dideklarasikan sebelum komponen utama `NestedDataPage`.
  Namun, pada baris 52–90 di dalam `VerticalText`:
  ```jsx
  function VerticalText({ children, height = 130 }) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ writingMode: 'vertical-rl', ... }}>
          {children}
        </div>
        {/* Modal Formulir Bertahap (SteppedForm wizard) */}
        {wizardDusun && (
          <SteppedForm
            isOpen={!!wizardDusun}
            onClose={() => setWizardDusun(null)}
            title={`Formulir ${config.title}`}
            subtitle={`Dusun ${wizardDusun.nama}`}
            ...
          />
        )}
      </div>
    );
  }
  ```
  `wizardDusun`, `setWizardDusun`, `config`, `leaves`, `getRowSnapshot`, `prevYearData`, `saving` **sama sekali tidak didefinisikan di scope luar**. Jika tabel merender header vertikal dan kode ini dievaluasi saat runtime, JavaScript akan melempar `ReferenceError: wizardDusun is not defined` yang menyebabkan seluruh halaman crash. `SteppedForm` harus dipindahkan ke dalam JSX return dari `NestedDataPage`.

### 1.3 Kontrol Header Hardcoded & Tombol "Batalkan" di `BumilDataPage.js`
- Di `components/NestedDataPage.js`:
  - Baris 613: `<select value={tahun} ... className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none shadow-sm">`
  - Baris 617: `<select value={bulan} ... className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none shadow-sm">`
  - Baris 631: `<input type="text" ... className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm" />`
  - Baris 638: `onlyIssues ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'`
  - Baris 652: `<button onClick={() => setConfirmCancel(true)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Batalkan</button>`
  - Baris 662 & 674: Mobile "Lompat ke": `border border-gray-200 bg-white/95 backdrop-blur` dan `border border-gray-200 rounded-lg text-sm`
  - Baris 683: `className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100"`
- Di `components/BumilDataPage.js`:
  - Baris 568:
    ```jsx
    <button onClick={fetchData} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Batalkan</button>
    ```
    Tombol ini langsung memicu `fetchData` tanpa konfirmasi modal apa pun. Data yang sedang diedit kader seketika musnah jika tombol tertekan tanpa sengaja. `ConfirmModal` sudah di-import di baris 15, tetapi hanya dipakai untuk `confirmSaveAll` (baris 445–454), belum ada untuk `confirmCancel`.
  - Baris 578, 589, 598: Memiliki hardcoded `bg-white`, `border-gray-200`, dan `border-gray-100` serupa.

### 1.4 Mekanisme 1-Click Carry-Over Data Periode Lalu
- Di `NestedDataPage.js` dan `BumilDataPage.js`:
  - Endpoint API mendukung parameter `?tahun=YYYY&bulan=MM`.
  - Pada `BumilDataPage.js`, `MONTHS` (array 12 bulan) sudah tersedia. Pada `NestedDataPage.js`, tabel bulanan terdeteksi via `hasMonth = !!config.hasMonth`.
  - Saat ini kader harus mengetik ulang seluruh angka setiap pergantian bulan, padahal data kependudukan dan sarana lingkungan bersifat kontinuitas (hanya ada mutasi kecil).
  - Belum ada tombol atau aksi "Salin Data Bulan Lalu".

### 1.5 Auto-Draft LocalStorage & PWA Manifest
- Belum ada file `lib/useLocalDraft.js` di direktori `lib/`.
- Belum ada file `app/manifest.js` di direktori `app/`.
- Di `app/layout.js` baris 31–38, icon web saat ini mengarah ke `/logo.png`. `public/logo.png` (20.279 bytes) dan `public/map-baturetno.svg` (6.018 bytes) tersedia di filesystem.
- Konvensi Next.js 16 (lihat `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`) mendukung metadata route generator `app/manifest.js`.

### 1.6 Aksesibilitas (A11y) pada Chart & Toast
- Di `components/charts/KaderDonut.jsx` baris 41:
  `<svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">`
  Tidak memiliki atribut `role="img"` dan tidak memiliki atribut `aria-label`.
- Di `components/charts/DusunBarChart.jsx` dan `components/charts/StackedBumilBar.jsx`:
  Grafik dirender menggunakan elemen HTML `<div>` interaktif dan progress bar dengan animasi framer-motion, tetapi kontainer tidak memiliki atribut `role="region"` / `aria-label`, dan batang progress tidak memiliki `role="progressbar"`, `aria-valuenow`, dsb.
- Di `components/Toast.jsx` (Global Toast Viewport baris 58–59):
  Komponen global sudah memiliki `role={isAlert ? 'alert' : 'status'}` dan `aria-live={isAlert ? 'assertive' : 'polite'}`.
- Namun, **toast lokal** di halaman tabel:
  - `components/NestedDataPage.js` baris 558: `<div className="fixed top-4 right-4 z-50 ...">`
  - `components/BumilDataPage.js` baris 456: `<div className="fixed top-4 right-4 z-50 ...">`
  - `components/PokjaDataPage.js` baris 498: `<div className="fixed top-4 right-4 z-50 ...">`
  - `components/AiChatBubble.js` baris 28: `<div className="absolute top-14 left-1/2 ...">`
  Seluruh toast lokal ini tidak memiliki atribut `role="status"` dan `aria-live="polite"`, sehingga pengumuman simpan/gagal tidak dibacakan oleh pembaca layar (screen reader).

---

## 2. Logic Chain

1. **Dari Observasi 1.1 ke Solusi CSS Validasi**:
   - Karena selector `.dark .nested-table table input` di `app/globals.css` menyematkan `border-color: #2d3a33 !important` dan `background-color: #15201b !important`, CSS cascade memprioritaskan aturan ini di atas style inline.
   - Untuk mengatasinya tanpa merusak layout pixel-perfect, kita harus membuat selector CSS spesifik dengan kelas semantik: `.cell-error` dan `.cell-warning`.
   - Di `app/globals.css`:
     Tambahkan selector:
     `.dark .nested-table table input.cell-error`, `.dark .nested-table table textarea.cell-error`, `.dark .cell-error`
     dan `.cell-warning` dengan `!important`.
     Warna merah di dark mode: latar `rgba(127, 29, 29, 0.35)`, border `rgba(248, 113, 113, 0.85)`, teks `#fecaca`, plus inner ring highlight `inset 0 0 0 1px rgba(239, 68, 68, 0.45)`.
     Warna kuning di dark mode: latar `rgba(120, 53, 15, 0.35)`, border `rgba(251, 191, 36, 0.85)`, teks `#fef3c7`, plus inner ring highlight `inset 0 0 0 1px rgba(245, 158, 11, 0.45)`.
   - Di `NestedDataPage.js`: Pasang kelas `${hasError ? 'cell-error' : hasWarning ? 'cell-warning' : ''}` pada `AutoGrowTextarea`, text input, dan numeric input, serta bersihkan inline style `border` dan `background` yang redundant.

2. **Dari Observasi 1.2 ke Pemindahan `SteppedForm`**:
   - `VerticalText` berada di luar fungsi `NestedDataPage`. Saat JSX `VerticalText` dieksekusi, lookup identifier `wizardDusun` mencari di lexical scope `VerticalText` dan global scope. Karena tidak ada, runtime JavaScript melempar `ReferenceError`.
   - Pindahkan blok `{wizardDusun && <SteppedForm ... />}` ke dalam `NestedDataPage`, sejajar dengan `ConfirmModal` pada baris 556.

3. **Dari Observasi 1.3 ke Harmonisasi Glass & Konfirmasi Batalkan**:
   - Di `NestedDataPage.js`, ganti seluruh padanan `bg-white border-gray-200` pada dropdown tahun/bulan dan search input dengan `.glass-pill`, `.glass-input`, dan `dark:text-gray-100`.
   - Di `BumilDataPage.js`, tombol "Batalkan" harus memicu dialog modal tipe `danger` terlebih dahulu:
     Definisikan state `const [confirmCancel, setConfirmCancel] = useState(false);`.
     Ubah tombol `onClick={() => setConfirmCancel(true)}`.
     Pasang `ConfirmModal` tipe bahaya (`type="danger"`) yang menanyakan kepastian pengguna sebelum memanggil `fetchData()`.

4. **Dari Observasi 1.4 ke Desain Fitur 1-Click Carry-Over**:
   - Tombol "Salin Data Bulan Lalu" hanya perlu tampil jika `hasMonth === true` dan pengguna memiliki hak edit (`canEdit === true`).
   - Alur kerja:
     a. Tentukan periode asal:
        Jika `bulan === 1`, `sourceTahun = tahun - 1`, `sourceBulan = 12`.
        Jika `bulan > 1`, `sourceTahun = tahun`, `sourceBulan = bulan - 1`.
     b. Tampilkan modal konfirmasi: "Salin Data dari [Bulan Lalu] [Tahun Lalu]?" dengan penjelasan bahwa data disalin ke draft aktif dan belum disimpan ke database.
     c. Saat dikonfirmasi: panggil `fetch(`${config.apiEndpoint}?tahun=${sourceTahun}&bulan=${sourceBulan}`)`.
     d. Filter baris data untuk dusun yang editable bagi user saat ini (`isDusunEditable(d.id)`).
     e. Masukkan field-field data ke dalam draft (pada `NestedDataPage`: `pendingChangesRef` dan `data`; pada `BumilDataPage`: `data`).
     f. Tandai dusun terkait sebagai dirty (`setDirtyIds` / `setSaveStatus('dirty')`), increment `dataVersion` agar input tabel re-mount dengan nilai baru.
     g. Tampilkan banner notifikasi sticky amber dengan tombol "Batalkan" dan "Simpan Semua".

5. **Dari Observasi 1.5 ke Arsitektur Auto-Draft & PWA**:
   - Buat hook `lib/useLocalDraft.js` dengan storage key: `pkk_draft_${tableName}_${tahun}_${hasMonth ? bulan : 'annual'}_${userDusunId ?? 'all'}`.
   - Hook menyediakan:
     - `draftData`, `hasDraft`, `draftTimestamp`.
     - `saveDraft(data)` (dengan debounce).
     - `restoreDraft()` yang menyuntikkan data kembali ke form.
     - `clearDraft()` yang menghapus item dari `localStorage`.
   - Di halaman form: saat halaman dibuka pertama kali dan `hasDraft === true`, tampilkan banner pemulihan draf liquid-glass.
   - Buat `app/manifest.js` sesuai spesifikasi Next.js 16 App Router dengan `start_url: '/dashboard'`, `display: 'standalone'`, warna tema zamrud `#047857`, dan ikon resmi PKK dari `/logo.png`.

6. **Dari Observasi 1.6 ke Aksesibilitas WCAG AA**:
   - Tambahkan `role="img"` dan `aria-label` deskriptif pada elemen SVG di `KaderDonut.jsx`.
   - Tambahkan `role="region"` dan `aria-label` pada `DusunBarChart.jsx` dan `StackedBumilBar.jsx`.
   - Lengkapi seluruh kontainer toast lokal di `NestedDataPage.js`, `BumilDataPage.js`, `PokjaDataPage.js`, dan `AiChatBubble.js` dengan `role={toast.type === 'error' ? 'alert' : 'status'}` dan `aria-live={toast.type === 'error' ? 'assertive' : 'polite'}`.

---

## 3. Caveats

1. **Kompatibilitas Safari / Mobile WebKit pada Backdrop Filter**:
   - Aturan VisionOS Liquid Glass membutuhkan prefix `-webkit-backdrop-filter: blur(...)` selain `backdrop-filter: blur(...)` agar efek embun kaca tampil di iOS Safari. Di `app/globals.css` sudah ada fallback `@supports not (backdrop-filter: blur(1px))`.
2. **Karakteristik Penyalinan Data Periode Lalu pada Kolom Kejadian**:
   - Pada tabel `data_bumil`, kolom seperti `bayi_lahir` atau `ibu_meninggal` adalah indikator insidensi (kejadian bulanan), sedangkan `ibu_hamil` dan jumlah RT/RW/Dawis adalah stok/status berjalan. Saat melakukan carry-over, formulir menyalin seluruh baris periode sebelumnya sebagai nilai awal draft. Pengguna **wajib meninjau** (karena itu sengaja tidak langsung disimpan ke database dan sticky banner dirty langsung aktif).
3. **Penyimpanan LocalStorage Kuota & Sanitasi**:
   - Data draft disimpan dalam bentuk string JSON. Karena data per dusun hanya berukuran ~2–5 KB per tabel-periode, konsumsi penyimpanan sangat kecil (< 50 KB total) dan tidak akan melebihi batas 5 MB browser.
   - Draft harus otomatis dibersihkan saat `saveAll()` sukses agar tidak memunculkan banner pemulihan palsu.

---

## 4. Conclusion

Investigasi menyimpulkan rencana tindakan konkret dan terstruktur bagi implementer agent:

### 4.1 Rencana Modifikasi Kode Spesifik

#### A. `app/globals.css`
Tambahkan definisi kelas validasi di dekat baris 1316:
```css
/* Table cell validation states */
.cell-error {
  border-color: #f87171 !important;
  background-color: rgba(254, 242, 242, 0.95) !important;
  color: #991b1b !important;
}
.cell-warning {
  border-color: #fbbf24 !important;
  background-color: rgba(254, 252, 232, 0.95) !important;
  color: #92400e !important;
}
.dark .cell-error,
.dark .nested-table table input.cell-error,
.dark .nested-table table textarea.cell-error {
  border-color: rgba(248, 113, 113, 0.85) !important;
  background-color: rgba(127, 29, 29, 0.35) !important;
  color: #fecaca !important;
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.45) !important;
}
.dark .cell-warning,
.dark .nested-table table input.cell-warning,
.dark .nested-table table textarea.cell-warning {
  border-color: rgba(251, 191, 36, 0.85) !important;
  background-color: rgba(120, 53, 15, 0.35) !important;
  color: #fef3c7 !important;
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.45) !important;
}
```

#### B. `components/NestedDataPage.js`
1. **Perbaikan SteppedForm Nyasar**:
   - Hapus baris 52–90 dari fungsi `VerticalText`.
   - Pindahkan blok `{wizardDusun && <SteppedForm ... />}` ke dalam body return komponen `NestedDataPage` (sekitar baris 556).
2. **Penerapan Kelas Validasi & Pembersihan Inline Style**:
   - Definisikan `const errorClass = hasError ? 'cell-error' : hasWarning ? 'cell-warning' : '';` pada iterasi kolom leaf.
   - Pasangkan `errorClass` ke dalam `className` `AutoGrowTextarea`, text input, dan numeric input.
3. **Harmonisasi Liquid Glass Header**:
   - Ganti `bg-white border-gray-200` pada dropdown tahun dan bulan (baris 613 & 617) menjadi `glass-pill text-gray-800 dark:text-gray-100`.
   - Ganti search input (baris 631) menjadi `glass-input`.
   - Ganti tombol "Hanya bermasalah" (baris 638) agar saat tidak aktif menggunakan `glass-pill text-gray-700 dark:text-gray-300`.
   - Ganti tombol "Batalkan" (baris 652) menjadi `glass-pill text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400`.
4. **Integrasi 1-Click Carry-Over Data Periode Lalu**:
   - Tambahkan tombol "Salin Data Bulan Lalu" di toolbar jika `hasMonth && canEdit`.
   - Pasang dialog konfirmasi sebelum mengambil dan menyalin data ke dalam draft.

#### C. `components/BumilDataPage.js`
1. **Konfirmasi Tombol Batalkan**:
   - Tambahkan state `const [confirmCancel, setConfirmCancel] = useState(false);`.
   - Ubah tombol Batalkan (baris 568) memicu `setConfirmCancel(true)`.
   - Pasang `ConfirmModal` bertipe `danger` dengan pesan konfirmasi.
2. **Integrasi 1-Click Carry-Over Data Periode Lalu**:
   - Sediakan tombol "Salin Data Bulan Lalu" di header controls yang menyalin data periode sebelumnya ke dalam `data` state dan menandai `saveStatus` sebagai `dirty`.

#### D. Pembuatan `lib/useLocalDraft.js`
- Modul hook React yang menangani autosave localStorage per `tableName + tahun + bulan + dusunId`, memberikan status `hasDraft`, fungsi `restoreDraft()`, dan `clearDraft()`.

#### E. Pembuatan `app/manifest.js`
- Berkas Route Handler PWA metadata Next.js 16 dengan nama `Lumbung Data PKK Desa Belikurip`, warna emerald `#047857`, background `#064e3b`, dan ikon dari `/logo.png`.

#### F. Peningkatan Aksesibilitas (A11y)
- `KaderDonut.jsx`: Tambahkan `role="img"` dan `aria-label={`Grafik donat distribusi kader, total ${total} kader`}` pada `<svg>`.
- `DusunBarChart.jsx`: Tambahkan `role="region"` pada chart dan `role="progressbar"` pada progress bar.
- `StackedBumilBar.jsx`: Tambahkan `role="region"` pada chart dan `role="group"` pada per-dusun row.
- `NestedDataPage.js`, `BumilDataPage.js`, `PokjaDataPage.js`, `AiChatBubble.js`: Tambahkan `role={toast.type === 'error' ? 'alert' : 'status'}` dan `aria-live={toast.type === 'error' ? 'assertive' : 'polite'}` pada elemen toast lokal.

---

## 5. Verification Method

Implementer dan Challenger agent dapat memverifikasi hasil perbaikan dengan metode berikut:

1. **Uji Otomatis Unit & Integrasi**:
   Jalankan seluruh rangkaian test suite:
   ```bash
   npm test
   ```
   *Expected*: Seluruh 31 test suites (268+ tests) harus lulus 100% tanpa regresi.
2. **Uji Kompilasi Produksi Next.js 16**:
   Jalankan build produksi:
   ```bash
   npm run build
   ```
   *Expected*: Kompilasi selesai tanpa Turbopack/metadata error, dan rute `/manifest.webmanifest` ter-generate otomatis dari `app/manifest.js`.
3. **Pemeriksaan Visual Dark Mode Input Validasi**:
   - Masukkan angka yang melanggar batas (misal: Balita lebih besar dari Jiwa atau nilai negatif) di `NestedDataPage`.
   - Aktifkan Dark Mode.
   - Periksa bahwa input menampilkan bingkai merah bercahaya halus (`.cell-error`) atau kuning (`.cell-warning`), dan tidak tertimpa menjadi abu-abu gelap `#2d3a33`.
4. **Pemeriksaan Konfirmasi Batalkan di `BumilDataPage`**:
   - Ketik perubahan pada salah satu sel di `BumilDataPage`.
   - Klik tombol "Batalkan".
   - Periksa bahwa modal konfirmasi bahaya (`ConfirmModal`) muncul menanyakan persetujuan pembatalan sebelum data dibuang.
5. **Pemeriksaan 1-Click Carry-Over**:
   - Buka bulan kosong (misal: April 2026).
   - Klik "Salin Data Bulan Lalu".
   - Periksa bahwa modal konfirmasi muncul, dan setelah dikonfirmasi, nilai-nilai dari Maret 2026 terisi ke dalam tabel, status dusun menjadi `dirty`, dan banner kuning muncul.
6. **Pemeriksaan Aksesibilitas**:
   - Periksa DOM elemen SVG pada `KaderDonut.jsx` memiliki atribut `role="img"` dan `aria-label`.
   - Periksa elemen toast saat menyimpan data memiliki atribut `role="status"` dan `aria-live="polite"`.
