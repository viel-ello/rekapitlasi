# Laporan — 17 Juni 2026 · Penerapan Design System (DESIGN.md / gaya Tableau)

Menerapkan prinsip DESIGN.md (gaya Tableau: minimalis, presisi geometris, tipografi
tegas, whitespace lega, shadow flat, netral dominan) ke project — **warna primary/
aksi tetap emerald** sesuai permintaan.

Pendekatan: lewat **design tokens global** (`tailwind.config.js` + `app/globals.css`)
agar konsisten di seluruh aplikasi tanpa menyentuh ratusan komponen satu per satu.

---

## Perubahan

### `tailwind.config.js`
- **Tipografi**: tambah `fontFamily.serif` (Georgia/Times) untuk heading display.
  Body & UI tetap sans (Fira Sans), mono tetap Fira Code.
- **Warna netral baru** (DESIGN.md: netral dominan, hijau hanya aksi/aksen):
  `surface` (white/subtle/muted), `line` (border), `ink` (teks utama/soft/faint).
- **Status semantik** token: `success`, `warning`, `danger`, `info` (bg/fg/border)
  untuk badge & alert.
- **Radius lebih crisp/geometris**: lg 8px, xl 10px, 2xl 12px, 3xl 14px
  (sebelumnya 12–20px). Tidak diturunkan ke 0px penuh agar ratusan komponen
  rounded existing tidak pecah — kompromi "geometris tapi tidak merusak".
- **Shadow flat & monokrom** (low-opacity hitam), bukan shadow berwarna biru:
  `card`, `card-hover`, `nav`, + `modal` baru.
- **Dashboard surface** netral: `bg-dashboard` `#f7f8f8` (sebelumnya hijau muda
  `#ecfdf5`), teks `#1a1f1d` — mengurangi dominasi hijau di area kerja.

### `app/globals.css`
- Heading `<h1>-<h3>` default pakai **serif** (otoritatif, gaya Tableau).
  Heading dengan class `font-mono`/`font-sans` tetap menang (utility layer).
- `data-table-wrapper` radius 12px → 10px (lebih crisp).

### `app/dashboard/page.js`
- Judul "Dashboard Operasional" lepas dari `font-mono` → ikut serif display baru.
- **KPI cards**: root `border-l-4` (aksen kiri tebal, gaya Tableau) + `shadow-card`
  flat baru. Angka KPI pakai `tabular-nums` agar digit rata (presisi data).

### Penajaman per-komponen (lanjutan)
- `app/globals.css` `.nav-item-active`: tambah indikator aktif tegas di sisi kiri
  (`box-shadow: inset 3px 0 0 #059669`) — gaya navigasi Tableau (active bar).
- `app/page.js` (welcome): KPI tile value pakai `tabular-nums`.
- **Migrasi shadow modal/dropdown → token flat `shadow-modal`** (gaya Tableau:
  elevation halus, bukan drop-shadow tebal `shadow-xl/2xl`):
  - `components/ui/Dialog.jsx` (default panel — dipakai luas).
  - `components/ConfirmModal.js`.
  - `components/Sidebar.js` (modal ganti password).
  - `components/DashboardToolbar.jsx` (modal unduh template).
  - `components/Topbar.js` (dropdown notifikasi & profil).

---

## Catatan desain

- **Emerald dipertahankan** sebagai primary/aksi/aksen (tombol, active state,
  hover tabel, focus ring). Yang berubah: background area kerja jadi netral
  abu-abu lembut, bukan hijau muda — sesuai DESIGN.md "netral dominan, status/
  brand color hanya untuk aksi".
- **Tidak full 0px radius**: DESIGN.md menyarankan sudut tajam, tapi aplikasi ini
  punya banyak komponen `rounded-xl/2xl`. Token radius diturunkan ke nilai crisp
  (8–14px) untuk nuansa lebih "alat kerja" tanpa refactor masif/regresi.
- Dark mode tidak diubah (tetap seperti sebelumnya).

## Verifikasi

- `npm test -- --runInBand` → **22 suites / 192 test passing**.
- `npm run build` → **clean**.

## File yang diubah

| File | Status |
|------|--------|
| `tailwind.config.js` | tokens: serif, surface/line/ink, status, radius crisp, shadow flat, dashboard netral |
| `app/globals.css` | heading serif, table wrapper radius, nav active bar |
| `app/dashboard/page.js` | judul dashboard serif, KPI cards border-l-4 + shadow-card + tabular-nums |
| `app/page.js` | KPI tile tabular-nums |
| `components/ui/Dialog.jsx` | default panel pakai shadow-modal flat |
| `components/ConfirmModal.js` | shadow-modal flat |
| `components/Sidebar.js` | modal password shadow-modal flat |
| `components/DashboardToolbar.jsx` | modal template shadow-modal flat |
| `components/Topbar.js` | dropdown notif & profil shadow-modal flat |

## Tindak lanjut opsional

- Bisa lanjut menajamkan per-komponen (mis. KPI cards & sidebar) ke radius lebih
  kecil + border `line` jika ingin makin dekat ke estetika Tableau penuh.
- Migrasi badge status existing ke token `success/warning/danger/info` agar 100%
  konsisten (saat ini badge sudah memakai warna serupa secara manual).
