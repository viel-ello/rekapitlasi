<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Konvensi paling penting di versi ini:
- `middleware.js` deprecated. Gunakan `proxy.js` di root (lihat `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). File `proxy.js` di repo ini sudah melakukan verifikasi JWT untuk rute `/dashboard/*`, bukan sekadar cek keberadaan cookie.
- Route Handler di `app/api/**/route.js` adalah endpoint publik. Otorisasi wajib ada di handler, tidak bisa diwakili oleh layout. Semua route sensitif di repo ini sudah pakai helper `requireAuth` / `requireAdmin` dari `lib/auth.js`.
- `next/image` bisa jadi tidak diperlukan untuk semua gambar karena `public/` sudah berisi asset lokal; gunakan `<img onError={...}>` fallback agar UI tidak pecah jika asset hilang.
<!-- END:nextjs-agent-rules -->

# Catatan arsitektur penting

## Database

- Produksi sepenuhnya di Supabase (PostgreSQL). Tidak ada lagi SQLite.
- `better-sqlite3` sudah dihapus dari dependency dan dari `next.config.mjs`.
- Endpoint `/api/admin/backup` di-mark deprecated (410 Gone). Backup database penuh dilakukan via Supabase Dashboard. Pertukaran data per tabel lewat fitur Export/Import Excel di panel admin.
- Skema awal: lihat `supabase_schema.sql`.
- Update kolom dinamis & overrides: `supabase_schema_updates.sql` + `supabase_schema_updates_v2.sql`. Jalankan berurutan di SQL Editor Supabase sebelum memakai fitur rename/hide kolom dan audit log before/after.

## Auth

- JWT (jose). `JWT_SECRET` WAJIB di `.env.local`; modul `lib/auth.js` akan throw saat di-import tanpa env ini.
- Cookie `auth-token` disetel saat login, di-clear saat logout atau saat proxy mendeteksi token invalid.
- `proxy.js` melindungi `/dashboard/*` dengan `jwtVerify` sebelum halaman dimuat. Rute API tetap wajib otorisasi sendiri.
- Role mapping: `ROLE_PERMISSIONS` di `lib/auth.js`. admin → semua tabel, sekretaris → data_umum + data_kegiatan_warga + data_bumil, pokja1-4 → tabelnya sendiri, user → read-only.
- Chat/AI: role diambil dari JWT server-side, bukan body. Jangan percaya `body.user`.

## Supabase client

- `lib/supabase.js` fail-fast: throw saat modul di-import di server tanpa `NEXT_PUBLIC_SUPABASE_URL` atau (service role ∨ anon).
- Export default `supabase` + alias `supabaseAdmin` (keduanya pakai service role saat ini). Disediakan terpisah supaya ke depan bisa dipisah tanpa refactor besar.

## Rate limit

- `lib/rate-limit.js` pakai tabel Supabase `rate_limits`. 5 attempt/15 menit/IP, block 30 menit setelah mencapai batas.
- Tabel dibuat di `supabase_schema_updates_v2.sql`.

## Audit log

- `lib/audit.js` sekarang `async` dan semua pemanggil harus `await writeLog(...)` agar log tidak hilang di serverless.
- Tabel `audit_logs` punya kolom opsional `before_json`, `after_json`, `ip` (ditambahkan di `supabase_schema_updates_v2.sql`). Pakai untuk mutasi penting.

## Kolom overrides (rename / hide kolom standar)

- Tabel: `table_column_overrides(table_name, column_key, label_override, is_hidden)`.
- Admin UI: `/dashboard/admin` → tab "Kolom" → subtab "Kolom Standar".
- Endpoint: `/api/admin/column-overrides` (GET untuk semua user login, POST/DELETE hanya admin).
- Dipakai oleh:
  - `components/PokjaDataPage.js`, `components/BumilDataPage.js`, `components/DataStatsPage.js` → render & validasi berdasarkan kolom yang visible saja.
  - `app/api/export/excel/route.js`, `app/api/export/template/route.js` → sembunyikan kolom hidden dan pakai label override.
  - `app/api/rekap/route.js` → kolom hidden tidak dihitung dalam completeness check.
- Write tetap menggunakan SEMUA kolom standar (termasuk hidden) supaya data di DB tetap konsisten, jadi hide aman untuk reversible.
- Server-side whitelist validasi: hanya `column_key` yang terdaftar di `DATA_PAGES` (`lib/dataPages.js`) yang boleh di-override.

## Kolom dinamis (custom)

- Tabel `table_schemas` + kolom JSONB `custom_columns` pada setiap tabel data.
- Admin UI: tab "Kolom" → subtab "Kolom Dinamis".
- Endpoint: `/api/admin/columns`.

## Tahun aktif (report_years)

- Tabel `report_years(tahun, is_active)` — daftar tahun yang tampil di semua dropdown UI.
- Admin UI: tab **"Tahun"** di `/dashboard/admin`.
- Endpoint:
  - `GET /api/years` (user login) — daftar tahun aktif dengan fallback otomatis ke current year ±2 saat tabel kosong.
  - `GET/POST/PATCH/DELETE /api/admin/years` — admin CRUD.
- Hook client: `useYears()` di `lib/useYears.js` — dipakai di `DashboardPage`, `DataStatsPage`, `PokjaDataPage`, `BumilDataPage`, `ImportTab`, `AiChatBubble`. Setiap dropdown tahun otomatis menyesuaikan kalau tahun baru ditambah oleh admin.
- Menghapus tahun dari daftar TIDAK menghapus data yang sudah tersimpan di `data_umum`, `data_pokja*`, dll. — hanya menyembunyikan dari dropdown.

## AI / Gemini

- Model default: `gemini-flash-latest` (alias ke flash terbaru). Override via `GEMINI_MODEL` env.
- Sebelumnya memakai `gemini-1.5-flash` yang sudah deprecated → menyebabkan 404.
- Konteks DB yang dikirim ke Gemini dibatasi ke tahun aktif ±1 untuk menghemat token dan membatasi exposure data.
- Chat history dibatasi 12 pesan terakhir.
- Function call `update_desa_data` divalidasi server-side terhadap `VALID_TABLES` + `VALID_COLUMNS`, role dari JWT, dan integer sanitization.
- File upload (.xlsx): validasi ekstensi + magic bytes ZIP (PK header).

## Completeness logic

- `lib/dataQuality.js` `evaluateRecordCompleteness`:
  - Tidak ada data sama sekali → `INCOMPLETE`.
  - Ada error/warning validasi → `NEEDS_CHECK`.
  - Selain itu → `COMPLETE` (kolom kosong "info" tidak lagi otomatis menjadikan record incomplete).
- Kolom hidden otomatis dihapus dari perhitungan completeness via `/api/rekap` (join dengan `table_column_overrides`).

## UI / UX

- Halaman `/dashboard/profile` (baru): info akun + ganti password.
- `Topbar` dropdown profil sekarang aktif: Profil Saya, Ganti Password, Keluar.
- `Sidebar` masih punya tombol ganti password sendiri (pakai `/api/auth/password` dengan `currentPassword` + `newPassword`).
- Logo fallback ke `/map-baturetno.svg` via `onError` jika `/logo.png` tidak ada.
- Admin panel: tab lama "Database" (backup SQLite) diganti tab "Import Excel" + tombol unduh template.
- Bumil & Pokja tabel sudah responsif: desktop = tabel, mobile = card per desa. DataStatsPage belum punya mobile card khusus (masih memadai karena hanya chart/summary).

## Testing

- `npm test` → 5 suites, 35 tests passing.
- `npm run build` → lulus di Next.js 16.2.5 (Turbopack).

# Panduan modifikasi

- Sebelum menambah kolom baru ke salah satu `data_*` tabel: update `DATA_PAGES` di `lib/dataPages.js`, `SHEET_MAP` di `lib/excel/sheetMap.js`, `VALID_COLUMNS` di `app/api/chat/route.js`, `TABLE_COLUMNS` di `app/api/export/template/route.js`, dan skema SQL di Supabase. Kolom akan otomatis muncul di UI input.
- Sebelum membiarkan AI memutasi tabel baru: tambahkan ke `VALID_TABLES` + `VALID_COLUMNS` di `app/api/chat/route.js` DAN `ROLE_PERMISSIONS` di `lib/auth.js`.
- Jangan menaruh password/rahasia di log. Audit log menyimpan detail aksi dan opsional JSON before/after.
- Default admin `admin/admin123`: ganti di produksi. Belum ada paksa ganti di first-login; lakukan manual.
