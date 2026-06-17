# Laporan — 17 Juni 2026 · Senior Review FASE 4 (Product UX Lanjutan)

Mengacu ke `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md`. FASE 4 selesai.

---

## Item 12 — Dashboard role-based "Yang perlu tindakan hari ini"

- `components/TodoTodayPanel.jsx` (**baru**) — panel aksi role-based di paling atas
  dashboard (setelah header):
  - **Admin**: jumlah periode menunggu review (link ke Approval Queue), dusun
    perlu dicek, dusun belum lengkap.
  - **Operator/kader**: periode yang dikembalikan untuk revisi, periode menunggu
    persetujuan, dusun perlu dicek/belum lengkap.
  - Empty state positif kalau tidak ada tindakan.
- `app/dashboard/page.js` — render `<TodoTodayPanel completeness={rekap?.completeness} />`.
- Panel fetch ringan sendiri (`/api/auth/me` + `/api/periods/queue`).

## Item 13 — Approval workflow

- `app/api/periods/route.js` — aksi **return wajib alasan** (min 3 karакter),
  disimpan ke `notes` (trimmed).
- `app/api/periods/queue/route.js` — filter **tahun, bulan, table_name, status**.
- `app/dashboard/approval/page.js` — rewrite:
  - Filter (tahun/bulan/tabel/status).
  - Modal **alasan revisi** wajib saat klik "Kembalikan".
  - **Histori status ringkas** per periode (diajukan/disetujui/catatan revisi).
  - Tombol **Kunci** untuk periode approved (via ConfirmModal).

## Item 14 — AI import preview re-run

- `components/AiChatBubble.js` — saat user mengganti **tahun/bulan** setelah upload,
  preview ditandai **stale**; muncul tombol **"↻ Hitung ulang preview"** dan tombol
  Simpan dinonaktifkan sampai preview dihitung ulang. Ini memastikan diff & confirm
  selalu memakai periode yang sama. Fungsi `recomputePreview()` memanggil ulang
  `/api/import/preview` dengan periode terkini.

## Item 15 — Halaman publik naratif

- `app/api/public/summary/route.js` — tambah `lastUpdated` (updated_at terbaru
  `data_umum` periode itu) + `perDusunChart` (KK & jiwa per dusun).
- `app/publik/page.js`:
  - **"Terakhir diperbarui"** di header.
  - **Narasi ringkas** kondisi (KK/jiwa/kelengkapan) per periode.
  - **Chart sederhana** "Jumlah KK per Dusun" (bar horizontal, tanpa lib).
  - **Definisi istilah** (Dasa Wisma, KK, Posyandu, JKN/BPJS, Rumah Sehat, Ibu Hamil).
  - Empty state chart yang jelas.

---

## Test yang ditambahkan

- `__tests__/server/approval-workflow.test.js` (**baru**, 3 test) — guard:
  return wajib alasan + notes trimmed + queue mendukung filter.

## Verifikasi

- `npm test -- --runInBand` → **22 suites / 192 test passing** (sebelumnya 21/189).
- `npm run build` → **clean**.

## File yang diubah/ditambah

| File | Status |
|------|--------|
| `components/TodoTodayPanel.jsx` | baru |
| `app/dashboard/page.js` | diubah (render TodoTodayPanel) |
| `app/api/periods/route.js` | diubah (return wajib alasan) |
| `app/api/periods/queue/route.js` | diubah (filter queue) |
| `app/dashboard/approval/page.js` | rewrite (filter + alasan return + histori + lock) |
| `components/AiChatBubble.js` | diubah (re-run preview saat ganti periode) |
| `app/api/public/summary/route.js` | diubah (lastUpdated + perDusunChart) |
| `app/publik/page.js` | diubah (narasi, chart, definisi, last-updated) |
| `__tests__/server/approval-workflow.test.js` | baru (3 test) |

## Catatan

- Tidak ada migration baru di FASE 4 (kolom `notes` di `report_periods` sudah ada sejak v4).
- Password `admin123` tetap (tidak disentuh).
- Item observability/command-palette/deprecation (P2 review) belum dikerjakan —
  bisa jadi backlog lanjutan.

Seluruh FASE 1–4 dari review `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md` selesai
(kecuali item 10 refactor dashboard yang ditunda di FASE 3 sebagai follow-up).
