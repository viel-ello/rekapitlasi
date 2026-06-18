# Laporan — 18 Juni 2026 · Restyle Dashboard gaya SaaS modern (shadcn/ui)

Permintaan: ubah tampilan agar menyerupai referensi dashboard SaaS modern
(kartu membulat lembut, ada kartu "hero" gelap, tombol pill, shadow diffuse,
heading sans-serif tebal, layout bento) dengan konvensi **shadcn/ui** —
**warna tetap hijau emerald**.

Ini perubahan arah dari look "Tableau" sebelumnya (sudut tajam, heading serif)
ke estetika SaaS modern sesuai referensi. Warna brand emerald dipertahankan.

---

## Fondasi shadcn/ui

- **Dependency baru**: `clsx`, `tailwind-merge`, `class-variance-authority`,
  `tailwindcss-animate` (building block standar shadcn).
- **`lib/utils.js`** — helper `cn()` (clsx + twMerge), konvensi shadcn.
- **Primitive baru** di `components/ui/`:
  - `card.jsx` — `Card` + sub-komponen (Header/Title/Description/Content/Footer).
    Varian `tone`: `default` (putih), `dark` (hero gelap), `emerald` (aksen).
  - `button.jsx` — `Button` dengan `cva`, bentuk **pill** (`rounded-full`).
    Varian: default(emerald)/dark/secondary/outline/ghost/danger + size.
  - `badge.jsx` — `Badge` pill status: default/neutral/success/warning/danger/info/dark.

## Design tokens (`tailwind.config.js`)

- **Radius dilembutkan** (SaaS look): lg 10, xl 14, 2xl 18, 3xl 24 px
  (sebelumnya 8/10/12/14 crisp).
- **Shadow diffuse & halus**: `card`, `card-hover` (lift saat hover), `soft`,
  `modal` — opacity rendah, warna `rgba(16,24,40,…)` (cool gray, bukan hitam pekat).
- **Fix bug**: font-family stack sempat punya kutip rusak (`Plus Jakarta Sans"`)
  hasil reformat config → menyebabkan CSS parse error saat build. Diperbaiki jadi
  `"Plus Jakarta Sans"`, `"Fira Code"`, `"Times New Roman"` (kutip ganda valid).

## Heading (`app/globals.css`)

- Heading `<h1>-<h3>` kembali ke **sans-serif** (Plus Jakarta Sans) bobot 700,
  letter-spacing -0.02em — sesuai referensi (heading tegas, bukan serif).

## Dashboard (`app/dashboard/page.js`)

- **KPI cards**: kartu pertama jadi **hero gelap** (`bg-ink` teks putih, ikon
  emerald-300) seperti kartu "Overall Information" di referensi; sisanya kartu
  putih `rounded-3xl` + `shadow-card` + hover lift. Hilangkan `border-l-4`.
- Panel "Status Kelengkapan", "Ringkasan Indikator", matrix, demografi, tren:
  `rounded-3xl` + `shadow-card` + border halus `gray-100` (sebelumnya
  `rounded-xl`/`shadow-sm`). Heading lepas dari `uppercase`/`font-mono`.
- `MiniTrendCard`: `rounded-3xl`, badge delta jadi pill (`rounded-full`),
  hover lift.
- Header dashboard: judul lebih besar/tegas (`text-3xl`), subjudul netral abu-abu.
- Skeleton loading: radius `rounded-3xl` mengikuti kartu baru.

## Komponen lain

- `components/TodoTodayPanel.jsx`: kartu `rounded-3xl` + `shadow-card`.

---

## Catatan

- **Emerald tetap** primary/aksi di semua primitive baru (button default, badge
  default, ikon hero, focus ring).
- Primitive shadcn baru belum dipasang menggantikan komponen lama secara masif —
  disediakan sebagai fondasi agar restyle berikutnya (form, modal, tabel) bisa
  konsisten. Dashboard sudah memakai gaya visual barunya langsung via Tailwind.
- Dark mode tidak diubah perilakunya.

## Verifikasi

- `npm run build` → **clean** (semua route ter-generate; setelah fix font quote).
- `npm test -- --runInBand` → **22 suites / 192 tests passing**.

## File

| File | Status |
|------|--------|
| `package.json` | + clsx, tailwind-merge, cva, tailwindcss-animate |
| `lib/utils.js` | baru — `cn()` |
| `components/ui/card.jsx` | baru — Card primitive |
| `components/ui/button.jsx` | baru — Button pill (cva) |
| `components/ui/badge.jsx` | baru — Badge status |
| `tailwind.config.js` | radius lembut, shadow diffuse, fix font quote |
| `app/globals.css` | heading sans-serif tebal |
| `app/dashboard/page.js` | KPI hero gelap, kartu rounded-3xl, restyle penuh |
| `components/TodoTodayPanel.jsx` | kartu rounded-3xl + shadow-card |

## Tindak lanjut opsional

- Terapkan primitive `Card`/`Button`/`Badge` ke halaman lain (login, welcome,
  admin, data entry) agar 100% konsisten gaya shadcn.
- Sidebar: bisa ditebalkan radius item nav + active pill mengikuti referensi.
- Tambah komponen shadcn lain sesuai kebutuhan (Input, Select, Dialog wrapper,
  Tabs, Table) supaya migrasi penuh.

---

## Update — Efek Liquid Glass (glassmorphism)

Restyle awal masih kartu solid putih (flat SaaS), belum "liquid glass" seperti
referensi. Ditambahkan efek frosted/translucent yang sebenarnya:

### `app/globals.css` (layer components baru di atas)
- `.glass-ambient` — lapisan gradient ambient `fixed` di belakang konten:
  beberapa radial-gradient emerald/teal lembut di atas kanvas netral. Inilah yang
  membuat kartu translucent terlihat "tembus". Ada varian dark.
- `.glass` / `.glass-strong` — panel kaca: `background: rgba(255,255,255,.55/.72)`
  + `backdrop-filter: blur() saturate()` + border terang + highlight `inset`.
- `.glass-dark` — kartu hero gelap versi kaca (gradient gelap + blur + inner light).
- Override dark mode untuk `.glass`/`.glass-strong`.

### `app/dashboard/layout.js`
- Render `<div className="glass-ambient">` di belakang.
- `<main>` diberi `relative z-[1]` agar konten di atas lapisan ambient.

### `components/ui/card.jsx`
- Tambah tone `glass` & `glass-dark` pada primitive `Card`.

### `app/dashboard/page.js`
- KPI hero → `.glass-dark`; KPI lain → `.glass`.
- Semua panel (Status, Indikator, MiniTrend, Matrix, Komposisi Jiwa, Tren) → `.glass`.
- Header tabel matrix & thead dibuat semi-transparan (`bg-white/30`,
  `border-white/40`) supaya menyatu dengan kaca.

### `components/TodoTodayPanel.jsx`
- Kartu → `.glass`.

### `components/Topbar.js`
- Bar atas lebih frosted: `bg-white/60 backdrop-blur-xl backdrop-saturate-150`
  + border `white/40`.

### Catatan teknis
- `backdrop-filter` didukung browser modern; fallback alami = panel tetap
  semi-transparan putih (tetap terbaca) bila blur tak didukung.
- Kontras teks dijaga: teks utama tetap `gray-800/900` di atas kaca terang,
  putih di atas `glass-dark`.
- Emerald tetap warna aksi/aksen & dipakai sebagai rona ambient.

### Verifikasi (setelah glass)
- `npm run build` → clean.
- `npm test -- --runInBand` → 22 suites / 192 tests passing.

---

## Update 2 — Hitam → Emerald + lanjut glass (sidebar/login/welcome)

Permintaan: semua elemen hitam/near-black di referensi diganti emerald, lalu
selesaikan halaman yang belum di-glass.

### Pilihan warna pengganti hitam
- **Surface gelap → `emerald-900 #064E3B`** (gradient ke `#052e23`). Cukup gelap
  untuk menggantikan hitam (kontras teks putih aman) tapi jelas hijau & sewarna
  brand. Dipakai di `.glass-dark`, Card tone `dark`, Button variant `dark`.
- **Aksen di atas surface gelap → `emerald-300 #6ee7b7`** (ikon/teks aksen),
  border `emerald-300/18`.

### Elemen yang diubah
- `app/globals.css`:
  - `.glass-dark` → gradient emerald-900 (sebelumnya abu-hitam).
  - `.sidebar` → panel kaca (translucent + `backdrop-filter`).
  - `.nav-item-active` → **pill emerald solid** (`#059669`, teks putih, shadow
    emerald) menggantikan model bar kiri — meniru pill aktif gelap di referensi.
  - `.nav-item` radius 14px (lebih pill).
- `components/ui/card.jsx` tone `dark` → `bg-primary-900`.
- `components/ui/button.jsx` variant `dark` → `bg-primary-900`.
- `components/Sidebar.js` brand title → `text-primary-700`.

### Halaman yang diselesaikan (glass + emerald + pill)
- **Login** (`app/login/page.js`): kartu → `.glass-strong`, background gradient
  emerald + ambient blob emerald, judul `text-primary-800`, tombol Masuk pill.
- **Welcome** (`app/page.js`): tombol header/hero jadi pill (`rounded-full`),
  CTA sekunder translucent (`bg-white/70 backdrop-blur`), feature card → `rounded-3xl`
  + hover lift.
- **Sidebar**: kaca + nav pill emerald (lihat di atas).
- **Topbar**: sudah glass di update sebelumnya.

### Verifikasi
- `npm run build` → clean.
- `npm test -- --runInBand` → 22 suites / 192 tests passing.

### Sisa opsional
- Halaman data entry (Pokja/Bumil/Rekap Dawis) & admin belum di-glass — masih
  kartu putih biasa (tetap konsisten warna, hanya belum frosted).
- Mobile data card & modal-modal besar (AiChatBubble) bisa diselaraskan bila perlu.

---

## Update 3 — Glass ke halaman data & admin (lanjutan)

Menyelesaikan halaman yang sebelumnya masih kartu putih biasa.

### Data entry (Pokja / Bumil / Rekap Dawis)
- `components/PokjaDataPage.js`: shell tabel desktop → `.glass rounded-3xl`;
  mobile card per-dusun → `rounded-2xl shadow-card border-gray-100`.
- `components/NestedDataPage.js` (Rekap Dawis): shell tabel → `.glass rounded-3xl`;
  mobile card → `rounded-2xl shadow-card`.
- `components/BumilDataPage.js`: shell tabel → `.glass rounded-3xl`;
  mobile card → `rounded-2xl shadow-card`.

### Statistik (DataStatsPage)
- StatCard → `.glass rounded-3xl` + angka `tabular-nums`.
- Dua panel besar (Total Indikator, Ranking Dusun) → `.glass rounded-3xl`,
  header semi-transparan (`bg-white/30 border-white/40`), heading lepas uppercase.
- Tombol "Edit Data" → pill (`rounded-full`).

### Admin panel
- `app/dashboard/admin/page.js`: tab → pill (`rounded-full`); tab non-aktif
  jadi translucent (`bg-white/70 backdrop-blur`).

### Catatan
- Isi tabel data (sel input) sengaja TIDAK diubah agar tetap maksimal terbaca;
  hanya shell/kartu pembungkus yang jadi kaca.
- Dark mode `.nested-table` override yang sudah ada tetap berlaku.

### Verifikasi
- `npm run build` → clean.
- `npm test -- --runInBand` → 22 suites / 192 tests passing.

### Status akhir cakupan glass + emerald
| Area | Status |
|------|--------|
| Dashboard (KPI, panel, matrix, chart) | ✅ glass + hero emerald |
| Sidebar | ✅ glass + nav pill emerald |
| Topbar | ✅ frosted |
| Login | ✅ glass-strong + ambient emerald |
| Welcome | ✅ pill + feature card |
| Data entry (Pokja/Bumil/Dawis) | ✅ shell glass + mobile card |
| Statistik | ✅ glass |
| Admin | ✅ tab pill |

---

## Update 4 — Glass ke modal & sisa halaman

### AiChatBubble
- FAB state terbuka: `bg-gray-700` → **`bg-primary-800`** (emerald, hilangkan abu).
- Panel chat & modal konfirmasi import: `rounded-3xl` + token `shadow-modal`
  (sebelumnya `shadow-2xl`).

### Halaman publik (`app/publik/page.js`)
- Tambah `.glass-ambient` di belakang + konten `relative z-[1]`.
- Semua kartu (filter, KPI, ringkasan, chart, indikator, tabel, definisi) → `.glass rounded-3xl`.
- Angka pakai `tabular-nums`.

### Approval / Reports / Profile
- `app/dashboard/approval/page.js`: modal alasan revisi `rounded-3xl shadow-modal`;
  empty-state & kartu antrian → `.glass rounded-3xl`.
- `app/dashboard/reports/page.js`: step content → `.glass rounded-3xl`.
- `app/dashboard/profile/page.js`: 3 kartu (info akun, aktivitas, ganti sandi) → `.glass`.

### Verifikasi
- `npm run build` → clean.
- `npm test -- --runInBand` → 22 suites / 192 tests passing.

### Cakupan final (semua glass + emerald, tanpa hitam)
Dashboard, Sidebar, Topbar, Login, Welcome, Data entry (Pokja/Bumil/Dawis),
Statistik, Admin, **Publik, AiChatBubble, Approval, Reports, Profile** — selesai.

---

## Update 5 — KPI card hero gelap dihapus (semua putih glass seragam)

Feedback: kartu KPI pertama (Dusun Lengkap) berwarna emerald gelap menonjol
sendiri. Diminta semua jadi putih liquid glass transparan.

- `app/dashboard/page.js`: hapus logika `hero` pada KPI cards. Keempat kartu KPI
  kini seragam `.glass` (putih translucent + blur), ikon `bg-white/50` dengan
  warna aksen per-kartu, teks `text-gray-900/700/500`.
- `.glass-dark` tidak lagi dipakai di dashboard (utility tetap ada bila perlu).

### Verifikasi
- `npm run build` → clean.
