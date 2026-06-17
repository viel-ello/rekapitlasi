# Laporan Pekerjaan — 17 Juni 2026 · FASE 2 (Import Excel & Performa)

Mengacu ke `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md`. FASE 2 selesai.

---

## Item 4 — Import Excel month-aware

**Masalah:** Preview hanya filter `data_bumil` ke bulan 12; `data_umum` & `data_rekap_dawis` tidak difilter bulan. Confirm default ke bulan 12 → user bisa menimpa Desember tanpa sadar.

**Perubahan:**
- `lib/excel/previewDiff.js` — `buildImportDiff(parsedData, tahun, user, bulan)` sekarang menerima `bulan`. Semua tabel bulanan (`data_umum`, `data_rekap_dawis`, `data_bumil`) dibandingkan terhadap `(tahun, bulan)` target (fallback 12 hanya jika bulan tidak dikirim).
- `lib/excel/importToSupabase.js` — `importToSupabase(..., user, bulan)` menerima `bulan` eksplisit; record tabel bulanan pakai bulan itu (fallback 12 bila null).
- `app/api/import/preview/route.js`, `app/api/import/excel/route.js`, `app/api/import/confirm/route.js` — terima & validasi `bulan` (via `parseMonth`), teruskan ke helper. Audit log import menyertakan bulan.
- **UI admin (`app/dashboard/admin/page.js`)** — `ImportTab` punya dropdown **Bulan** + peringatan "Data akan disimpan ke <Bulan> <Tahun>". `ImportPreviewModal` menampilkan target periode bulanan.
- **UI AI chat (`components/AiChatBubble.js`)** — preview import punya dropdown Bulan + Tahun; `bulan` dikirim ke preview & confirm.

**Catatan:** Default snapshot Desember hanya berlaku kalau caller tidak mengirim bulan (mis. tooling lama). UI selalu mengirim bulan eksplisit.

---

## Item 5 — Server-side cache `/api/dusun`

**Masalah:** Cache hanya di client (`getDusunCached`). Route server tetap query DB tiap request.

**Perubahan:**
- `lib/server/dusunCache.js` (**baru**) — `getActiveDusun()` module-level cache (TTL 60 detik + in-flight dedupe), `invalidateDusunServerCache()`.
- `app/api/dusun/route.js` — pakai `getActiveDusun()` (tetap auth-gated).
- `app/api/admin/dusun/route.js` — panggil `invalidateDusunServerCache()` setelah PUT (rename/toggle aktif) supaya cache tidak basi.

**Catatan serverless:** Cache hidup per-instance (Vercel). Efektif untuk burst dalam 1 instance; bukan cache global lintas instance.

---

## Test yang ditambahkan

- `__tests__/server/import-month-aware.test.js` (**baru**, 5 test) — import `data_umum`/`data_rekap_dawis`/`data_bumil` ke bulan selain 12, fallback 12 tanpa argumen, dan tabel non-bulanan tidak dapat kolom bulan.

---

## Verifikasi

- `npm.cmd test -- --runInBand` → **17 suites / 172 test passing** (sebelumnya 16 / 167).
- `npm.cmd run build` → **clean**.

## File yang diubah/ditambah

| File | Status |
|------|--------|
| `lib/excel/previewDiff.js` | diubah (param bulan, semua tabel bulanan) |
| `lib/excel/importToSupabase.js` | diubah (param bulan eksplisit) |
| `app/api/import/preview/route.js` | diubah (terima bulan) |
| `app/api/import/excel/route.js` | diubah (terima bulan dari formData) |
| `app/api/import/confirm/route.js` | diubah (terima bulan + audit) |
| `app/dashboard/admin/page.js` | diubah (dropdown bulan + modal info) |
| `components/AiChatBubble.js` | diubah (dropdown bulan import) |
| `lib/server/dusunCache.js` | baru (server cache) |
| `app/api/dusun/route.js` | diubah (pakai cache) |
| `app/api/admin/dusun/route.js` | diubah (invalidate cache) |
| `__tests__/server/import-month-aware.test.js` | baru (5 test) |

## Risiko tersisa / catatan

- Di AI chat, preview diff dihitung saat upload (sebelum user ganti bulan di modal). Kalau user mengubah bulan setelah upload, angka diff bisa tidak sinkron, tapi **confirm tetap menyimpan ke bulan yang dipilih** (aman). Penyempurnaan: re-run preview saat bulan berubah (opsional, belum dikerjakan).
- Approval Queue admin (disebut di review) masuk FASE 3 item 8, belum dikerjakan.

Menunggu instruksi untuk lanjut ke FASE 3.
