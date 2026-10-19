# Review Fitur, Tampilan & UI/UX — Lumbung Data PKK Desa Belikurip

**Tanggal:** 2 Juli 2026
**Reviewer:** Claude (Opus 4.8) — review berbasis kode (static review)
**Cakupan:** Fitur, tampilan/visual, design system, UI/UX, dark mode, responsif, aksesibilitas, performa & SEO.

---

## 0. Metodologi & Keterbatasan

- Review dilakukan dengan **membaca kode** (`app/`, `components/`, `lib/`, `tailwind.config.js`, `app/globals.css`), **bukan** menjalankan aplikasi. Jadi temuan visual seperti "warna kontras" atau "layout patah di layar X" bersifat **inferensi dari kode** dan sebaiknya dikonfirmasi di browser.
- Sudah ada beberapa dokumen review sebelumnya (`PROJECT_REVIEW.md`, `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md`, `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md`, `UI_UX_AND_FEATURE_GAPS.md`, `AI_SKILLS_PROJECT_REVIEW.md`). Dokumen ini **fokus ke kondisi terkini** dan menandai mana yang **sudah beres** vs **masih terbuka**, sambil menambahkan **temuan baru** yang belum tercatat.
- Beberapa temuan menyertakan referensi `file:baris` agar bisa langsung dieksekusi.

---

## 1. Ringkasan Eksekutif

Aplikasi ini **jauh di atas rata-rata** untuk kategori aplikasi data internal desa. Sudah ada: RBAC + row-level per kader dusun, workflow persetujuan + period lock, import Excel dengan preview diff, export Excel/Word/PDF, AI assistant dengan dry-run, dashboard kaya chart, portal publik, dark mode, onboarding tour, dan test (server + client). Fondasi UX-nya matang: `Dialog` yang accessible (focus trap), `Toast` dengan `aria-live`, auto-save on blur + Ctrl+S, validasi inline, dan tampilan mobile (card view) yang dipikirkan serius.

**Kesimpulan:** ini bukan proyek "kurang fitur", tapi proyek yang **kekurangannya sekarang ada di lapisan konsistensi & finishing** — terutama **dark mode yang masih tambal-sulam**, **sistem komponen yang belum benar-benar dipakai seragam** (token warna, tombol, spinner, toast dibuat ulang di banyak tempat), beberapa **celah aksesibilitas pada tabel & chart**, dan **portal publik yang belum dioptimalkan untuk SEO**. Sebagian besar adalah pekerjaan **konsolidasi**, bukan fitur baru.

**Skor kasar (subjektif, berbasis kode):**

| Aspek | Skor | Catatan singkat |
|---|---|---|
| Kelengkapan fitur | 9/10 | Sangat lengkap untuk domainnya |
| Tampilan/visual | 8/10 | Identitas emerald/glass konsisten & modern |
| Konsistensi design system | 6/10 | Token & primitives ada tapi kurang dipakai |
| UI/UX interaksi | 7.5/10 | Auto-save, validasi, mobile bagus; feedback belum seragam |
| Dark mode | 5/10 | Berfungsi tapi rapuh (override global + inline style bocor) |
| Responsif/mobile | 8/10 | Card view + drawer sidebar bagus |
| Aksesibilitas | 6.5/10 | Dialog/Toast bagus; tabel & chart masih lemah |
| Performa & SEO | 6/10 | Publik masih client-render, `<img>` mentah |

---

## 2. Yang Sudah Bagus (jangan diutak-atik tanpa alasan)

1. **`components/ui/Dialog.jsx`** — modal reusable yang benar-benar accessible: `role="dialog"` + `aria-modal`, focus trap Tab/Shift+Tab, Escape, **focus restore** ke pemicu, body scroll lock. Ini pondasi yang bagus — pakai ini di mana-mana.
2. **`components/Toast.jsx`** — pakai `aria-live="polite"/"assertive"`. Toast global sudah accessible.
3. **`components/OnboardingTour.jsx`** — spotlight cutout via SVG mask, navigasi keyboard (←/→/Esc), layout mobile khusus, progress dots, auto-scroll & auto-flip posisi tooltip, dukung dark mode. Rapi tanpa library.
4. **Data entry mobile** (`PokjaDataPage.js`) — card view yang bisa expand, "Lompat ke dusun", target sentuh ≥44px, indikator "Belum disimpan/Tersimpan", label per field. Ini benar-benar dipikirkan untuk kader yang input via HP.
5. **UX menyimpan** — auto-save on blur per baris, `Ctrl+S` (`useKeyboardShortcut`), pelacakan "dirty", konfirmasi simpan saat ada peringatan validasi, **preserve scroll** setelah simpan (`lib/preserveScroll.js`).
6. **Validasi inline** — error/warning/info per sel, ringkasan validasi, filter "Hanya bermasalah".
7. **Kualitas kode UI** — **tidak ada `console.log`** yang tertinggal, **tidak ada `window.confirm`/`alert`** (sudah diganti `Dialog`), `prefers-reduced-motion` dihormati (`globals.css:471`), font di-self-host via `next/font` + anti-flash theme script (`app/layout.js`).
8. **Portal publik** sudah ada narasi ("Ringkasan Kondisi"), definisi istilah, dan catatan privasi — bukan sekadar angka telanjang.

---

## 3. Temuan (dikelompokkan) + Rekomendasi

Legenda severity: 🔴 Tinggi · 🟡 Sedang · 🟢 Rendah/Quick-win

### A. Dark Mode — masih tambal-sulam (paling berdampak)

- 🔴 **A1. Strategi dark mode tidak seragam (3 pendekatan bercampur).** Hanya **7 dari 131** file yang memakai varian Tailwind `dark:`. Sisanya bergantung pada **override global** di `globals.css` (`.dark .bg-white`, `.dark .text-gray-700`, dst — baris ~674–838), sementara `Topbar.js`/`OnboardingTour.jsx`/`dashboard/layout.js` memakai `dark:` variant, dan ada pula warna **hardcoded** (`dashboard/layout.js:81` `dark:bg-gray-950` vs token `#0b1310` vs `#111c18`). Akibatnya latar gelap punya ≥3 nilai berbeda dan sulit dirawat.
  - **Dampak:** setiap komponen baru yang pakai `bg-white`/`text-gray-*` "kebetulan" ikut gelap; yang tidak, bocor. Rawan regresi visual.
  - **Saran:** pilih **satu** strategi. Idealnya: definisikan surface/among token sebagai CSS variable (mis. `--surface`, `--text`, `--border`) yang berubah nilai di `.dark`, lalu pakai `bg-surface text-ink border-line` di komponen. Hilangkan blok override `.dark .bg-*` global bertahap.

- 🔴 **A2. Sel tabel "beku" (sticky) tetap terang di dark mode.** Di `PokjaDataPage.js` header & kolom sticky memakai **inline style** `style={{ background:'#f9fafb' }}` / `background:'#fff'` (baris **608–609, 633–634, 738–739**). Inline style **menang** atas CSS `.dark .data-table th {…}` (yang tanpa `!important`), jadi di dark mode **header "No/Nama Dusun", kolom pertama, dan baris JUMLAH tampil putih** — kontras rusak.
  - **Saran:** ganti inline `background` dengan class (`bg-surface`) atau tambahkan override `.dark` ber-`!important` seperti yang sudah terpaksa dilakukan untuk `NestedDataPage` (`globals.css:805–838`). Lebih baik: hilangkan inline style.

- 🟢 **A3. `tailwind.config.js:3` → `darkMode: ['class', 'class']`** — nilai kembar `'class'` itu keliru/aneh (harusnya `'class'` saja, atau `['class', '<selector>']`). Quick fix.

- 🟢 **A4. Blok CSS dark mode terduplikasi.** Aturan sidebar dark ditulis **dua kali** di `globals.css` (≈baris **133–167** dan **637–672**). Dead/duplicate CSS — konsolidasikan.

- 🟡 **A5. Toast lokal `PokjaDataPage` tidak punya dark style & tidak ter-`aria-live`** (lihat B2) — di dark mode kartu toast `bg-green-50/bg-red-50` bergantung override global; tidak dijamin konsisten.

### B. Design System & Konsistensi Visual

- 🟡 **B1. Token warna semantik nyaris tidak dipakai.** `tailwind.config.js` mendefinisikan `success/warning/danger/info`, `surface/line/ink` (baris 58–91) — tapi komponen justru pakai utility mentah `gray-*`/`green-*`/`amber-*`/`red-*`. Inilah akar masalah dark-mode (harus di-override satu per satu). **Saran:** adopsi token semantik di komponen; itu sekaligus menyelesaikan A1.

- 🟡 **B2. Dua sistem Toast hidup berdampingan.** Ada toast global accessible (`Toast.jsx` + `lib/useToast`) yang dipakai `dashboard/page.js` (`showToast`), **tapi** `PokjaDataPage.js:449–458` menggulung **toast lokalnya sendiri** (fixed top-4 right-4) **tanpa `aria-live`**. Jadi notifikasi "Data berhasil disimpan" di halaman input **tidak diumumkan** ke screen reader dan tampil beda dari toast lain.
  - **Saran:** hapus toast lokal, pakai `useToast()` di semua tempat.

- 🟡 **B3. Bentuk tombol tidak konsisten.** Primitive `components/ui/button.jsx` memakai **pill** (`rounded-full`), tapi mayoritas CTA di-hand-roll dengan `rounded-xl` dan style manual (`EmptyState.jsx:39,47`, tombol simpan di `PokjaDataPage`, `DashboardToolbar`, modal password `Sidebar.js:202–203`). Praktisnya `ui/Button` jarang dipakai. **Saran:** standarkan — entah pill di mana-mana atau `rounded-xl` di mana-mana — lalu pakai `<Button>` sebagai satu sumber.

- 🟡 **B4. Spinner & skeleton dibuat ulang berkali-kali.** Markup spinner `border-2 border-t-transparent animate-spin` diulang di `dashboard/layout.js:71`, `DashboardToolbar.jsx:151`, `PokjaDataPage.js` (beberapa), `login/page.js:154`. Skeleton pun dua gaya: `.skeleton` shimmer (`globals.css:438`) vs `animate-pulse` ad-hoc (`dashboard/page.js:255–264`). **Saran:** buat `<Spinner/>` dan `<Skeleton/>` tunggal.

- 🟢 **B5. Typo class Tailwind — latar hilang.** `PokjaDataPage.js:750`: `className="sticky right-0 background-[#f0fdf4] z-30"` — `background-[…]` **bukan** class Tailwind valid (harusnya `bg-[#f0fdf4]`). Sel pojok kanan baris JUMLAH jadi transparan, bukan hijau muda. Quick fix.

- 🟢 **B6. Overflow menu di toolbar isinya 1 item** ("Unduh Template") dengan komentar `(future) actions` (`DashboardToolbar.jsx:78,91`). Kesan setengah jadi. **Saran:** entah isi dengan aksi lain (mis. Import inline, Export PDF) atau jadikan tombol langsung.

### C. Fitur & Alur (Functional/UX gaps)

- 🔴 **C1. Proteksi "perubahan belum disimpan" tidak konsisten & tidak menangkap navigasi SPA.** `beforeunload` hanya dipasang di `BumilDataPage.js:344` & `NestedDataPage.js:352`, **tidak** di `PokjaDataPage.js` (padahal ini komponen tabel generik yang dipakai untuk fallback & Kegiatan Warga). Selain itu `beforeunload` **tidak** menangkap klik `<Link>` antar-halaman (navigasi client-side), jadi user bisa kehilangan editan dengan pindah menu.
  - **Saran:** samakan proteksi di semua halaman data + tambahkan guard navigasi router (mis. intercept `router` / konfirmasi saat `dirtyCount > 0`).

- 🟡 **C2. "Batalkan" membuang semua editan tanpa konfirmasi.** `PokjaDataPage.js:557` tombol "Batalkan" langsung `fetchData(tahun)` → seluruh perubahan dirty hilang tanpa dialog. **Saran:** konfirmasi dulu (sudah punya `ConfirmModal`).

- 🟡 **C3. "Ganti Password" ada di dua tempat dengan perilaku beda.** `Sidebar.js` membuka **modal inline**, sedangkan `Topbar.js:69–73` (menu profil) memanggil `onOpenPasswordModal` yang **tidak pernah dikirim** dari `dashboard/layout.js:108`, sehingga fallback ke `router.push('/dashboard/profile')`. Jadi dua entry-point, dua pengalaman. **Saran:** satukan (satu modal, dipanggil dari dua tempat).

- 🟢 **C4. Onboarding tour salah target satu langkah.** `OnboardingTour.jsx:34` menargetkan `[aria-label="Pilih tahun dashboard"]`, tapi select tahun di `DashboardToolbar` ber-`aria-label="Tahun"` (`DashboardToolbar.jsx:142`). Target tak ketemu → langkah itu jatuh ke modal tengah (bukan spotlight). **Saran:** samakan selector/aria-label.

- 🟢 **C5. "Import" di toolbar hanya link ke `/dashboard/admin`** (`DashboardToolbar.jsx:70–76`), bukan import in-context. Friksi kecil; pertimbangkan import inline atau perjelas labelnya ("Import di Panel Admin").

### D. Aksesibilitas (a11y)

- 🔴 **D1. Chart SVG tak terbaca screen reader.** Semua chart buatan tangan (`MiniTrendCard`, donut L/P, `TrendCompareChart` di `dashboard/page.js`; `PublicBarChart` di `publik/page.js`) diberi `aria-hidden` / tanpa alternatif teks. Data visual **tidak punya padanan tekstual/tabel**. **Saran:** sediakan ringkasan teks atau tabel `sr-only` sebagai fallback; beri `role="img"` + `aria-label` berisi angka utama.

- 🟡 **D2. Input tabel desktop tanpa `<label>` terkait.** Di desktop, sel input `PokjaDataPage` hanya `cell-input` tanpa `id`/`label` (kartu mobile **sudah** benar: `htmlFor`/`id`, baris 369–375). Screen-reader di tabel desktop mendapat input tanpa nama yang jelas (hanya mengandalkan header kolom). **Saran:** tambahkan `aria-label` per input (mis. `"${col.label} — ${d.nama}"`).

- 🟡 **D3. Surfacing error validasi beda antara mobile & desktop.** Mobile menampilkan **teks error** di bawah field (baris 404–406); desktop hanya `title` (tooltip hover) + warna (baris 640, 652). Pengguna keyboard/mobile-less tak melihat pesan. **Saran:** tampilkan teks error yang sama di desktop (mis. baris ringkas di bawah tabel atau tooltip yang bisa difokus).

- 🟢 **D4. Dropdown/popover kustom tidak "focus-trapped".** Notifikasi & profil (`Topbar.js`), overflow menu (`DashboardToolbar`), dan `DesaCompareSelector` (`dashboard/page.js:643`) pakai popover manual (klik-luar + Esc) — dapat diterima untuk popover, tapi tak sekuat `Dialog`. Konsisten saja (Esc + `aria-expanded` sudah ada di sebagian). Prioritas rendah.

### E. Responsif & Mobile

- 🟢 **E1. Topbar kiri kosong** (`Topbar.js:110–118`) — hanya tombol menu mobile; di desktop area kiri melompong. Peluang menaruh **breadcrumb/judul halaman** untuk konteks (juga menjawab keluhan "hierarki dashboard datar" di review lama). Prioritas rendah.
- 🟢 **E2. Tabel lebar** sudah dibungkus `overflow-x-auto` (`data-table-wrapper`) + kolom sticky — bagus. Pastikan indikator "bisa digeser" terlihat di layar sempit (shadow/gradient di tepi). Nice-to-have.

### F. Performa & SEO

- 🟡 **F1. Portal publik full client-render.** `app/publik/page.js` diawali `'use client'` dan fetch data di browser. Untuk halaman yang **memang untuk publik/dibagikan**, ini merugikan **SEO** dan memperlambat first paint (butuh JS + roundtrip API sebelum konten muncul; hanya tampil "Memuat…"). **Saran:** jadikan Server Component / SSR (fetch `/api/public/summary` di server) + tambahkan `generateMetadata` per halaman publik.
- 🟡 **F2. Metadata sosial minim.** `app/layout.js:28–38` punya title/description/icon tapi **tanpa** `metadataBase`, Open Graph, atau Twitter card. Link publik yang dibagikan ke WA/FB tak punya preview kaya. **Saran:** tambahkan OG image + `metadataBase`.
- 🟢 **F3. `<img>` mentah, bukan `next/image`** di 3 tempat (logo `Sidebar.js:70,92`, `login/page.js:60,83`). Kehilangan optimasi ukuran/lazy. Kecil, tapi mudah diperbaiki.
- 🟢 **F4. Polling notifikasi tiap 60 dtk** tanpa cek visibilitas tab (`Topbar.js:34`). Untuk banyak user, sedikit boros. **Saran:** hentikan saat `document.hidden`.

### G. Technical Debt yang berdampak ke UX

- 🟡 **G1. Migrasi "desa → dusun" belum tuntas di lapisan UI.** Fallback ganda `dusun ?? desa` tersebar: `PokjaDataPage.js:123` (`r.dusun_id ?? r.desa_id`), `publik/page.js:52,195,198`, dll. Menambah percabangan & risiko bug tampilan. (Sudah dicatat sebagai "legacy alias" di review 17 Juni — **masih terbuka**.)
- 🟡 **G2. Duplikasi komponen Pokja.** `Pokja1DataPage`…`Pokja4DataPage` masing-masing bespoke (via `DataEditPage.js`), plus `PokjaDataPage.js` (759 baris) & `dashboard/page.js` (785 baris) besar. Perbaikan UI harus diulang di banyak file → sumber inkonsistensi. **Saran:** ekstrak sub-komponen bersama (header, baris, footer JUMLAH, toolbar).

---

## 4. Status vs Review Sebelumnya

| Temuan lama | Sumber | Status sekarang |
|---|---|---|
| README masih bawaan create-next-app | SENIOR #1 | ✅ **Beres** — `README.md` sudah lengkap & spesifik |
| `window.confirm` mentah | PROJECT_REVIEW | ✅ **Beres** — diganti `Dialog`/`ConfirmModal` |
| Halaman publik kurang naratif | SENIOR #8 | ✅ **Beres** — ada "Ringkasan Kondisi" + definisi istilah |
| A11y modal belum konsisten | REVIEW_TEMUAN #6 | 🟡 **Sebagian** — `Dialog` sudah focus-trap; popover/dropdown masih manual |
| Dark mode masih patch-based | SENIOR #9 / REVIEW_TEMUAN #7 | 🔴 **Masih terbuka** — lihat A1/A2 (kini dengan bukti sel sticky bocor) |
| Feedback error belum konsisten | SENIOR #4 | 🟡 **Sebagian** — dua sistem toast masih ada (B2) |
| File UI terlalu besar / duplikasi | SENIOR #2 | 🟡 **Masih terbuka** — G2 |
| Belum ada command palette/global search | SENIOR #13 | 🔴 **Masih terbuka** — belum ada `Ctrl+K`/pencarian global |
| Legacy alias desa/dusun | SENIOR #15 | 🟡 **Masih terbuka** — G1 |
| Dominan hijau/emerald | SENIOR #6 | 🟡 Subjektif — identitas masih sangat emerald (bisa disengaja) |

---

## 5. Prioritas Perbaikan (rekomendasi urutan)

**P0 — Perbaikan berdampak besar, effort sedang**
1. **Rapikan dark mode** (A1 + A2): pindah ke token CSS-variable; hilangkan inline `background` pada sel sticky. Ini menyembuhkan kelas bug visual sekaligus.
2. **Satukan feedback**: satu `<Toast>` (B2, buang toast lokal `PokjaDataPage`), satu `<Spinner>`/`<Skeleton>` (B4).
3. **Proteksi editan belum tersimpan konsisten** (C1) termasuk saat pindah menu.

**P1 — Konsistensi & a11y**
4. Standarkan tombol via `ui/Button` (B3) + adopsi token semantik (B1).
5. A11y tabel input (D2) + padanan teks untuk chart (D1) + error desktop (D3).
6. Satukan "Ganti Password" (C3).

**P2 — Publik & performa**
7. SSR + metadata untuk `/publik` (F1/F2), `next/image` (F3).
8. Ekstrak sub-komponen Pokja (G2), tuntaskan alias dusun (G1).

**Nice-to-have**
9. Command palette / global search (Ctrl+K).
10. Breadcrumb/judul di Topbar (E1), hentikan polling saat tab hidden (F4).

---

## 6. Quick Wins (≤ beberapa menit, bisa langsung)

| # | Berkas | Perbaikan |
|---|---|---|
| 1 | `components/PokjaDataPage.js:750` | `background-[#f0fdf4]` → `bg-[#f0fdf4]` |
| 2 | `tailwind.config.js:3` | `darkMode: ['class','class']` → `darkMode: 'class'` |
| 3 | `app/globals.css` ~133–167 vs 637–672 | Hapus blok dark-mode sidebar yang dobel |
| 4 | `components/OnboardingTour.jsx:34` | Selaraskan `aria-label` target filter tahun ("Tahun") |
| 5 | `components/PokjaDataPage.js` (input desktop) | Tambah `aria-label={\`${col.label} — ${d.nama}\`}` |
| 6 | `components/Topbar.js:34` | Bungkus polling dengan cek `document.hidden` |

---

## 7. Catatan Penutup

Ini produk yang **matang dan layak pakai**. Daftar di atas panjang bukan karena aplikasinya buruk, tapi karena sudah cukup bagus untuk pantas "dipoles ke level pro": bereskan **dark mode**, **satukan komponen (toast/tombol/spinner/token)**, tutup **celah a11y tabel & chart**, dan **optimalkan halaman publik**. Empat area itu menutup ~80% temuan bernilai dan membuat seluruh aplikasi terasa lebih konsisten.

> Catatan proses: sesi ini sempat mengenai **batas pemakaian 5 jam paket ($10/5h)** saat menjalankan beberapa agent paralel, sehingga review diselesaikan langsung (single-thread). Jika ingin, saya bisa lanjut membuat **PR/patch** untuk item P0 & Quick Wins pada sesi berikutnya.
