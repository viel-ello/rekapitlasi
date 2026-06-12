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
- Catatan: sempat bereksperimen pindah ke Claude Sonnet 4.5 via `@anthropic-ai/sdk` tapi di-rollback. Kalau suatu saat mau pindah lagi, pattern integrasi sudah pernah dibangun dan bisa ditemukan di history git.
- Konteks DB yang dikirim ke Gemini dibatasi ke tahun aktif ±1 untuk menghemat token dan membatasi exposure data.
- Chat history dibatasi 12 pesan terakhir.
- Function call `update_desa_data` divalidasi server-side terhadap `VALID_TABLES` + `VALID_COLUMNS` (di `lib/aiMutation.js`), role dari JWT, dan integer sanitization.
- Mutasi AI pakai pola dry-run: `/api/chat` mengembalikan `mutation_preview` (before/after), eksekusi baru terjadi setelah user klik "Terapkan" → `/api/chat/confirm-mutation` (re-validasi penuh server-side + period lock + audit `ai_update`).
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
- Sebelum membiarkan AI memutasi tabel baru: tambahkan ke `VALID_TABLES` + `VALID_COLUMNS` di `lib/aiMutation.js` DAN `ROLE_PERMISSIONS` di `lib/auth.js`.
- Jangan menaruh password/rahasia di log. Audit log menyimpan detail aksi dan opsional JSON before/after.
- Default admin `admin/admin123`: ganti di produksi. Belum ada paksa ganti di first-login; lakukan manual.


# Migrasi v5 — Level Kecamatan → Level Desa Belikurip (9 dusun)

Spec lengkap: `.kiro/specs/migrasi-level-desa/{requirements,design,tasks}.md`.

## Cakupan

Aplikasi pindah dari scope **TP PKK Kecamatan Baturetno (13 desa)** ke **TP PKK Desa Belikurip (9 dusun)**:
Soko, Melikan, Jamprit Wetan, Jamprit Kulon, Belikurip, Pagersari, Klerong, Tanjung, Banyuripan.

## Schema baru

Migration script: `supabase_schema_updates_v5.sql` (jalankan setelah v1-v4).

- Tabel **`dusun`** baru (id, nama, nomor_urut, is_active) dengan seed 9 dusun.
- Semua tabel data dapat kolom **`dusun_id`** (canonical) ber-FK ke `dusun(id)`. Kolom lama `desa_id` dipertahankan sementara untuk safe rollback.
- Tabel `data_kegiatan_warga` di-rename → **`data_rekap_dawis`** (idempotent). Sheet Excel "KEGIATAN WARGA" tetap diterima sebagai alias.
- Tabel `audit_logs` dapat kolom `dusun_nama` (kolom lama `desa_nama` dipertahankan untuk history).
- Tabel `users` dapat kolom `dusun_id` + extended CHECK constraint role untuk include 9 role kader-dusun (`dusun_soko`..`dusun_banyuripan`).
- Pokja II dapat 13 kolom baru sesuai laporan resmi: `jml_warga_3_buta`, `kf_klp`/`kf_wrg`, `paud_sejenis`, `bkb_klp`, `bkb_ape_set_a`/`b`, `kader_tutor_kf`/`paud`, `kader_bkb`, `yg_dilatih_lp3pkk`/`tp3pkk`/`damaspkk`, `keterangan`. Sekaligus drop 6 kolom legacy: `rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`. **Hard delete — pastikan backup Supabase dulu.**
- Pokja I/III/IV dapat kolom `keterangan TEXT`.
- Bumil dapat `akte_l`, `akte_p`, `keterangan` (kolom `akte_ada`/`akte_tidak` lama tetap di DB tapi tidak di-render di UI/export).
- Rekap Dawis: drop `jml_dusun`/`tiga_buta_l`/`tiga_buta_p`/`ikut_industri`. Tambah `tiga_buta`, `berkebutuhan_khusus`.

Data lama 13 desa di production: SQL block opsional A (archive) atau B (drop dengan `pg_dump`) di-comment dalam v5. Jalankan manual sesuai pilihan.

## Role permission row-level

`lib/auth.js`:
- `ROLE_PERMISSIONS` extended dengan 9 role kader-dusun (`dusun_*`), masing-masing scope `data_rekap_dawis` saja.
- `ROLE_SCOPE`: `'all'` untuk admin/pokja/sekretaris, `'own_dusun'` untuk kader-dusun, `'none'` untuk user.
- Helper baru `canWriteRow(user, table, row)` — table-level + row-level check. Dipakai di `lib/api-handler.js`.
- JWT payload include `dusun_id` (set saat login dari `users.dusun_id`).
- API handler otomatis paksa `payload.dusun_id = user.dusun_id` untuk role kader-dusun (anti-tamper). Reject 403 + audit log "permission_denied" kalau coba edit dusun lain.
- AI chat (`/api/chat`) juga enforce row-level untuk kader-dusun di function call `update_dusun_data` (alias `update_desa_data` masih diterima).

## Helper baru

- `lib/dusun.js` — `DUSUN_LIST` (9 nama statis), `getDusunList()`, `ROLE_TO_DUSUN_NAME`, `DUSUN_ROLES`.
- `lib/branding.js` — `BRAND` object: `organization`, `region`, `regency`, `fullTitle`, `unit`, `unitPlural`, `unitCount`. Single source of truth untuk identitas aplikasi.
- `lib/auth.normalizeTableName(t)` — normalize alias `data_kegiatan_warga` → `data_rekap_dawis`.

## API endpoint

- `/api/dusun` (canonical) menggantikan `/api/desa` (sekarang alias dengan deprecation header, masih jalan).
- `/api/admin/dusun` (canonical) menggantikan `/api/admin/desa`.
- `/api/rekap-dawis` (canonical) menggantikan `/api/kegiatan-warga`.
- Body POST/PATCH terima `dusun_id` (canonical) ATAU `desa_id` (legacy alias) selama 1 release transisi.
- Query param `dusun_ids` di `/api/rekap/trend` (alias `desa_ids`).
- Response shape backward-compat: field `desa_*` tetap ada sebagai alias dari `dusun_*`.

## UI

- Sidebar nav: "Kegiatan Warga" → "Rekapitulasi Dawis" (`/dashboard/rekap-dawis`).
- Route lama `/dashboard/kegiatan-warga[/edit]` di-redirect ke canonical.
- Komponen `PokjaDataPage`/`BumilDataPage`: rename internal var `desa` → `dusun`, label "Nama Desa" → "Nama Dusun", endpoint `/api/dusun`, scope row-level visual indicator untuk role kader-dusun.
- Komponen `DataStatsPage`: rename `desa` → `dusunList`, KPI label "Desa Aktif" → "Dusun Aktif".
- Welcome page (`/`), login page, footer, header, layout metadata: ganti "Kecamatan Baturetno" → "Desa Belikurip" (kecamatan tetap muncul sebagai konteks geografis).

## Export pixel-perfect

`/api/export/excel` di-rewrite untuk implement Annex A-F dari `design.md`:
- **Annex A (Bumil)**: header 3-row title + BULAN/TAHUN, multi-row header 18 kolom, RT/RW/Dawis derive dari `data_rekap_dawis`, A4 landscape.
- **Annex B (Pokja I)**: latar header **hijau muda** `#D4EDDA`, 19 kolom 3-level header.
- **Annex C (Pokja II)**: 36 kolom 4-level header (dengan TUTOR sub-sub-grup), A3 landscape.
- **Annex D (Pokja III)**: latar header **biru muda** `#CCE5FF`, 19 kolom.
- **Annex E (Pokja IV)**: latar header **kuning muda** `#FFFF99`, 26 kolom 4-level header.
- **Annex F (Rekap Dawis)**: 34 kolom 4-level header dengan vertical text untuk label panjang, A3 landscape.
- Data Umum: layout single-row header dengan branding "TP PKK Desa Belikurip".

`/api/export/word` & `/api/export/template`: branding di-update ke "TP PKK Desa Belikurip · Kecamatan Baturetno".

## Testing

`npm test` → **9 suites, 73 tests passing** (sebelumnya 7 suites, 49 tests):
- `__tests__/server/dusun-permissions.test.js` — 14 tests untuk row-level permission (canWriteRow + scope `own_dusun` + ROLE_TO_DUSUN_NAME mapping).
- `__tests__/server/schema-mapping.test.js` — 10 tests untuk DATA_PAGES & SHEET_MAP konsistensi (kolom baru hadir, legacy hilang, alias non-enumerable).

`npm run build` → clean di Next.js 16.2.5 (Turbopack).

## Backward compatibility

Selama 1 release transition, semua aliasing dipertahankan:
- API: `desa_id` ↔ `dusun_id`, `desa_nama` ↔ `dusun_nama`, `data_kegiatan_warga` ↔ `data_rekap_dawis`.
- URL: `/api/desa` deprecated, redirect-equivalent ke `/api/dusun`. `/dashboard/kegiatan-warga` redirect ke `/dashboard/rekap-dawis`.
- Function call AI: `update_desa_data` accepted sebagai alias dari `update_dusun_data`.

Setelah confirm production stable, jalankan migration v6 (deferred) untuk drop kolom `desa_id` dan hapus alias.
