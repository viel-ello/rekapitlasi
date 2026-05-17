# Design Document

## Overview

Dokumen ini menjelaskan desain teknis migrasi aplikasi PKK Rekapitulasi dari level **Kecamatan Baturetno (13 desa)** menjadi level **Desa Belikurip (9 dusun)**, sesuai requirements di `requirements.md`.

Strategi inti:

- Tabel `desa` digantikan oleh tabel `dusun` (bukan rename in-place; dibuat baru supaya foreign key & data lama bisa di-archive).
- Semua tabel data (`data_umum`, `data_pokja1-4`, `data_kegiatan_warga`, `data_bumil`) dapat kolom baru `dusun_id`. Kolom `desa_id` lama dipertahankan sementara untuk backward-compat lalu di-drop di langkah akhir.
- Refactor kode dilakukan secara modular: ada helper baru `lib/dusun.js` (mirror dari pola lama `desa`), API legacy `/api/desa` masih jalan tapi sekarang me-redirect / mem-proxy ke `/api/dusun`. Setelah semua page hijrah, `/api/desa` di-remove.
- UI tetap pakai komponen existing (`PokjaDataPage`, `BumilDataPage`, `DataStatsPage`); refactor cukup mengganti referensi `desa` → `dusun`.
- Branding & copy diubah sentral: `lib/branding.js` (baru) sebagai single source of truth untuk string "TP PKK Desa Belikurip", "Kecamatan Baturetno", "Kabupaten Wonogiri".
- Public portal `/publik/desa/[id]` di-redirect 301 ke `/publik/dusun/[id]`. Internal `/dashboard/desa/[id]` di-rename menjadi `/dashboard/dusun/[id]` dengan redirect.

## Architecture

### High-level flow

```
┌────────────────────┐       ┌────────────────────┐
│  Browser (UI)      │──────▶│  Next.js App       │
│  /dashboard/*      │       │  Router Handlers   │
│  /publik/*         │       │  /api/*            │
└────────────────────┘       └─────────┬──────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │  Supabase Postgres │
                             │  Tables:           │
                             │  • dusun (NEW)     │
                             │  • data_*          │
                             │  • desa_archive_*  │
                             │    (post-migrate)  │
                             └────────────────────┘
```

### Migration phases

| Fase | Output | Dependencies |
|------|--------|--------------|
| 1. Schema (v5 SQL) | Tabel `dusun`, kolom `dusun_id` di semua tabel data, archive tabel `desa_*` lama | v1-v4 sudah jalan |
| 2. Backend helpers | `lib/dusun.js`, update `lib/api-handler.js`, `lib/audit.js` | Fase 1 |
| 3. API routes | `/api/dusun`, update `/api/data-umum`, `/api/pokja*`, `/api/bumil`, `/api/kegiatan-warga`, `/api/rekap*`, `/api/import/excel`, `/api/export/excel` | Fase 2 |
| 4. UI components | `components/PokjaDataPage`, `BumilDataPage`, `DataStatsPage`, `dashboard/page.js`, `dashboard/reports/page.js` | Fase 3 |
| 5. Public portal & drill-down | `/publik`, `/publik/dusun/[id]`, `/dashboard/dusun/[id]`, redirect dari `/publik/desa/[id]` & `/dashboard/desa/[id]` | Fase 4 |
| 6. Branding & copy | `lib/branding.js`, sweep semua string "Kecamatan Baturetno" → "Desa Belikurip" | Fase 5 |
| 7. AI assistant | Update system prompt + `VALID_TABLES` di `app/api/chat/route.js` | Fase 6 |
| 8. Tests & docs | Update jest tests, AGENTS.md, PROJECT_REVIEW.md | Fase 7 |

Fase 1-3 zero-downtime saat migrasi: kolom `desa_id` & `dusun_id` ko-eksis sementara, sehingga deploy bertahap aman.

## Components and Interfaces

### 1. Schema migration (`supabase_schema_updates_v5.sql`)

Idempotent SQL script baru. Tidak mengoverwrite v1-v4. Struktur:

```sql
-- ===========================================================
-- v5: Migrate from desa-level (13) to dusun-level (9 Belikurip)
-- ===========================================================
-- Prerequisite: v1-v4 sudah dijalankan.
-- Verifikasi: SELECT 1 FROM report_periods LIMIT 1; (akan error kalau v4 belum jalan)

-- 1. Buat tabel dusun
CREATE TABLE IF NOT EXISTS dusun (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  nomor_urut INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed 9 dusun Belikurip (urutan harus dipertahankan)
INSERT INTO dusun (nama, nomor_urut, is_active) VALUES
  ('Soko', 1, 1),
  ('Melikan', 2, 1),
  ('Jamprit Wetan', 3, 1),
  ('Jamprit Kulon', 4, 1),
  ('Belikurip', 5, 1),
  ('Pagersari', 6, 1),
  ('Klerong', 7, 1),
  ('Tanjung', 8, 1),
  ('Banyuripan', 9, 1)
ON CONFLICT (nama) DO NOTHING;

-- 3. Tambahkan kolom dusun_id ke semua tabel data (nullable dulu)
ALTER TABLE data_umum            ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja1          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja2          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja3          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_pokja4          ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_kegiatan_warga  ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);
ALTER TABLE data_bumil           ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);

-- 4. Audit log: tambahkan kolom dusun_nama (kolom desa_nama dipertahankan untuk history)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS dusun_nama TEXT;

-- 5. (Opsional) Archive data lama 13 desa
-- Defaultnya: kita TIDAK drop. Admin pilih sendiri opsi A atau B.
-- Opsi A — Archive (recommended):
--   ALTER TABLE data_umum            RENAME TO data_umum_archive_kecamatan;
--   ALTER TABLE data_pokja1          RENAME TO data_pokja1_archive_kecamatan;
--   ... dst untuk pokja2, pokja3, pokja4, kegiatan_warga, bumil
--   ALTER TABLE desa                 RENAME TO desa_archive_kecamatan;
--   Lalu jalankan ulang skema v1 untuk membuat tabel data_* baru yang kosong.
--
-- Opsi B — Drop dengan backup:
--   1. pg_dump ... > backup_kecamatan_2026.sql (jalankan di terminal lokal)
--   2. TRUNCATE TABLE data_umum, data_pokja1, ..., data_bumil RESTART IDENTITY CASCADE;
--   3. DROP TABLE desa CASCADE; (HATI-HATI: hapus permanen)
-- 
-- Catatan: kalau env baru (belum ada data lama), skip langkah 5.
```

Strategi `dusun_id NULL`: kolom dibuat NULL dulu agar baris lama tidak break. Setelah v5 dijalankan dan data baru mulai masuk, tambah constraint NOT NULL via migration v6 (deferred — tidak perlu sekarang).

### 2. Helper baru: `lib/dusun.js`

```js
// lib/dusun.js
import supabase from '@/lib/supabase';

export async function getDusunList({ activeOnly = true } = {}) {
  let q = supabase.from('dusun').select('id, nama, nomor_urut, is_active').order('nomor_urut');
  if (activeOnly) q = q.eq('is_active', 1);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export const DUSUN_LIST = [
  'Soko', 'Melikan', 'Jamprit Wetan', 'Jamprit Kulon',
  'Belikurip', 'Pagersari', 'Klerong', 'Tanjung', 'Banyuripan',
]; // fallback statis untuk seed/test
```

### 3. Update `lib/api-handler.js`

Ganti semua `desa_id` → `dusun_id`, query `from('desa')` → `from('dusun')`. Pertahankan signature & tambahkan opsi `legacyDesaIdAccepted: false` (default false) — kalau true, handler akan menerima `desa_id` di body dan reject dengan 400 di response.

```js
// onConflict berubah dari 'desa_id,tahun' menjadi 'dusun_id,tahun'
// (atau 'dusun_id,tahun,bulan' untuk bumil)
```

### 4. API routes baru

- `/api/dusun` — pengganti `/api/desa`. GET = list aktif. (Admin POST/PATCH/DELETE deferred — manage manual via SQL untuk sekarang.)
- `/api/desa` — dipertahankan **sebagai redirect/proxy** selama 1 release: handler langsung `redirect('/api/dusun')` (308). Setelah verify tidak ada caller frontend yang masih pakai, di-remove.

### 5. UI components

- `PokjaDataPage.js`, `BumilDataPage.js`, `DataStatsPage.js`: rename semua var `desa`/`desaList` → `dusun`/`dusunList`, kolom header tabel "Desa" → "Dusun", endpoint fetch ke `/api/dusun`.
- Mobile card existing tetap dipakai, hanya label "Desa" → "Dusun".
- `app/dashboard/page.js`: matrix kelengkapan label kolom & tooltip diganti, link click → `/dashboard/dusun/[id]`.
- `app/dashboard/reports/page.js`: filter "Desa" → "Dusun".

### 6. Public portal

```
/publik                   ← list 9 dusun + agregat desa Belikurip
/publik/dusun/[id]        ← detail per dusun (allowlist field tetap)
/publik/desa/[id]         ← redirect 301 ke /publik/dusun/[id]
```

`app/publik/desa/[id]/page.js` di-rename `move` ke `app/publik/dusun/[id]/page.js` (gunakan `smartRelocate` agar import otomatis update). Lalu buat `app/publik/desa/[id]/page.js` baru yang return `redirect()`.

Hal serupa untuk `/dashboard/desa/[id]` → `/dashboard/dusun/[id]`.

### 1a. Schema migration tambahan (extend `supabase_schema_updates_v5.sql`)

Selain pembuatan tabel `dusun` & kolom `dusun_id`, v5 juga harus:

```sql
-- 6. Rename tabel data_kegiatan_warga → data_rekap_dawis (terminologi baru)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_kegiatan_warga')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_rekap_dawis')
  THEN
    EXECUTE 'ALTER TABLE data_kegiatan_warga RENAME TO data_rekap_dawis';
  END IF;
END $$;

-- 7. Tambah kolom dusun_id di users (untuk link role kader-dusun ke dusun spesifik)
ALTER TABLE users ADD COLUMN IF NOT EXISTS dusun_id INTEGER REFERENCES dusun(id);

-- 8. Update CHECK constraint role di users untuk include 9 role baru
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'admin','pokja1','pokja2','pokja3','pokja4','sekretaris','user',
  'dusun_soko','dusun_melikan','dusun_jamprit_wetan','dusun_jamprit_kulon',
  'dusun_belikurip','dusun_pagersari','dusun_klerong','dusun_tanjung','dusun_banyuripan'
));

-- 9. Tambah kolom Pokja I yang sesuai layout Annex B
-- Schema existing sudah punya semua kolom kecuali tidak ada yang baru — tapi pastikan jumlah kelompok terpisah:
-- Lihat Annex B mapping. Kolom existing: pkbn_jml_klp_simulasi, pkbn_jml_anggota,
-- pkdrt_jml_klp_simulasi, pkdrt_jml_anggota, pola_asuh_jml_klp, pola_asuh_jml_anggota,
-- lansia_jml_klp, lansia_jml_anggota, gr_kerja_bakti, gr_rukun_kematian, gr_keagamaan,
-- gr_jimpitan, gr_arisan — semua sudah cocok.
```

### 6a. Role kader-dusun: row-level permission

Karena Supabase service role bypass RLS, dan repo ini pakai service role di server, **enforcement permission dilakukan di application layer** (di `lib/auth.js` + di handler `/api/rekap-dawis`), bukan di Postgres RLS.

Update `lib/auth.js`:

```js
// lib/auth.js — extend ROLE_PERMISSIONS
export const ROLE_PERMISSIONS = {
  admin: { tables: ['*'], scope: 'all' },
  pokja1: { tables: ['data_pokja1'], scope: 'all' },
  pokja2: { tables: ['data_pokja2'], scope: 'all' },
  pokja3: { tables: ['data_pokja3'], scope: 'all' },
  pokja4: { tables: ['data_pokja4'], scope: 'all' },
  sekretaris: { tables: ['data_umum', 'data_rekap_dawis', 'data_bumil'], scope: 'all' },
  user: { tables: [], scope: 'none' },
  // 9 role kader-dusun: scope row-level ke dusun mereka
  dusun_soko:          { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_melikan:       { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_jamprit_wetan: { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_jamprit_kulon: { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_belikurip:     { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_pagersari:     { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_klerong:       { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_tanjung:       { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
  dusun_banyuripan:    { tables: ['data_rekap_dawis'], scope: 'own_dusun' },
};

// Helper: cek apakah user boleh write ke baris tertentu
export function canWriteRow(user, tableName, row) {
  const perm = ROLE_PERMISSIONS[user.role];
  if (!perm) return false;
  if (perm.tables[0] === '*' || perm.tables.includes(tableName)) {
    if (perm.scope === 'all') return true;
    if (perm.scope === 'own_dusun') {
      // user.dusun_id harus terisi (di-set saat admin assign role kader-dusun)
      return user.dusun_id != null && row.dusun_id === user.dusun_id;
    }
  }
  return false;
}

// Mapping role → dusun nama (untuk auto-assign user.dusun_id saat admin pilih role kader-dusun)
export const ROLE_TO_DUSUN_NAME = {
  dusun_soko: 'Soko',
  dusun_melikan: 'Melikan',
  dusun_jamprit_wetan: 'Jamprit Wetan',
  dusun_jamprit_kulon: 'Jamprit Kulon',
  dusun_belikurip: 'Belikurip',
  dusun_pagersari: 'Pagersari',
  dusun_klerong: 'Klerong',
  dusun_tanjung: 'Tanjung',
  dusun_banyuripan: 'Banyuripan',
};
```

Update handler `/api/rekap-dawis/route.js` (atau `/api/kegiatan-warga` lama selama transisi):

```js
// PATCH/POST handler
const user = await requireAuth(request);
const body = await request.json();

// Untuk role kader-dusun, paksa dusun_id ke milik user, abaikan body.dusun_id
if (ROLE_PERMISSIONS[user.role].scope === 'own_dusun') {
  body.dusun_id = user.dusun_id;
}

if (!canWriteRow(user, 'data_rekap_dawis', body)) {
  await writeLog({ userId: user.userId, action: 'permission_denied', tableName: 'data_rekap_dawis', detail: `attempted to write dusun_id=${body.dusun_id}` });
  return NextResponse.json({ error: 'Tidak boleh edit dusun lain' }, { status: 403 });
}

// ... lanjutkan upsert
```

UI behavior untuk role kader-dusun:
- `RekapDawisPage` (rename dari `KegiatanWargaPage`): hanya render baris dusun mereka sendiri (filter di client). Server-side pasti reject baris lain juga (defense in depth).
- Header tabel tampilkan label "Dusun: {namaDusun}" sebagai konfirmasi visual.
- Tabel lain (`/dashboard/data-umum`, `/dashboard/pokja1` dst): role kader-dusun lihat read-only mode (mode "Hanya Lihat").

```js
export const BRAND = {
  organization: 'TP PKK Desa Belikurip',
  region: 'Kecamatan Baturetno',
  regency: 'Kabupaten Wonogiri',
  fullTitle: 'TP PKK Desa Belikurip · Kecamatan Baturetno · Kabupaten Wonogiri',
  unit: 'dusun',
  unitPlural: 'Dusun',
  unitCount: 9,
};
```

Pakai `BRAND.fullTitle` di footer/login/welcome. Ganti hard-coded "Kecamatan Baturetno" yang relevan (kecuali yang memang nama kecamatan, seperti di alamat).

### 8. AI assistant (`app/api/chat/route.js`)

Update `VALID_TABLES` whitelist (tetap) tapi ganti context system prompt:

```
Kamu adalah asisten data PKK Desa Belikurip, Kecamatan Baturetno, Kabupaten Wonogiri.
Unit data adalah 9 dusun: Soko, Melikan, Jamprit Wetan, Jamprit Kulon, Belikurip,
Pagersari, Klerong, Tanjung, Banyuripan.
```

`update_desa_data` function rename → `update_dusun_data` (parameter `dusun_nama` & `dusun_id`). Backward-compat: terima alias `desa_nama`/`desa_id` di handler & translate.

### 9. Excel import/export

- `lib/excel/sheetMap.js`: SHEET_MAP tetap (kolom tidak berubah). Helper `importToSupabase.js` resolve `dusunName → dusun_id`.
- `app/api/export/excel/route.js`: header "TP PKK Desa Belikurip"; kolom `desa_id` di query ganti `dusun_id`; label kolom pertama "DUSUN".
- Template Excel yang di-download admin: row contoh sekarang 9 dusun Belikurip, bukan 13 desa.

## Data Models

### Tabel `dusun` (baru)

| Kolom | Tipe | Notes |
|-------|------|-------|
| id | SERIAL PK | |
| nama | TEXT UNIQUE | tidak boleh duplikat |
| nomor_urut | INTEGER | 1..9, basis order |
| is_active | INTEGER | soft delete |
| created_at | TIMESTAMPTZ | default NOW |

### Tabel data_* (perubahan)

Tambah kolom `dusun_id INTEGER REFERENCES dusun(id)`. Existing `desa_id` dipertahankan **sampai release berikutnya**, lalu di-drop via migration v6.

UNIQUE constraint baru:
- `data_umum`, `data_pokja1-4`, `data_kegiatan_warga`: `UNIQUE(dusun_id, tahun)` — perlu ALTER constraint.
- `data_bumil`: `UNIQUE(dusun_id, tahun, bulan)`.

Karena PostgreSQL tidak bisa rename UNIQUE constraint dengan cara sederhana, kita tambah constraint baru lalu drop yang lama:

```sql
-- Contoh untuk data_umum:
ALTER TABLE data_umum DROP CONSTRAINT IF EXISTS data_umum_desa_id_tahun_key;
ALTER TABLE data_umum ADD CONSTRAINT data_umum_dusun_id_tahun_key UNIQUE (dusun_id, tahun);
```

Diasumsikan data lama 13 desa sudah di-archive/drop saat constraint dipindah, sehingga tidak ada konflik unique.

### Tabel `audit_logs`

Tambah kolom `dusun_nama TEXT`. Kolom lama `desa_nama` dipertahankan untuk membaca history audit.

### Tabel `report_periods` (v4)

Tidak berubah — workflow tetap per `(table_name, tahun, bulan)`. Yang berubah cuma scope unit di tabel `data_*`.

## Error Handling

| Skenario | Behavior |
|----------|----------|
| Client kirim `desa_id` ke API baru | API tetap terima sebagai alias `dusun_id` selama 1 release (logged warning), lalu reject 400 setelah deprecation |
| `/api/desa` dipanggil setelah deprecation | Return 410 Gone dengan body `{ error: 'gunakan /api/dusun' }` |
| `dusun_id` tidak ada di tabel `dusun` | Return 400 "dusun tidak ditemukan" |
| Migrasi dijalankan di env tanpa v4 | Script gagal di langkah verifikasi awal dengan pesan "jalankan v1-v4 dulu" |
| AI assistant kirim function call dengan `desa_nama` | Translate alias ke `dusun_nama`, log warning |
| Public portal akses `/publik/desa/[id]` | Server redirect 301 ke `/publik/dusun/[id]` |
| Mismatch jumlah dusun di seed (mis. user manual hapus dusun) | UI tampilkan empty state, render baris yang tersisa |

## Testing Strategy

### Unit / integration

- `lib/dusun.js` — list & cache (tambah test baru di `__tests__/dusun.test.js`).
- `lib/api-handler.js` — adjust existing test untuk pakai `dusun_id`.
- `lib/excel/importToSupabase.js` — resolve dusun by name.
- `lib/audit.js` — tetap.

### End-to-end (manual checklist)

- [ ] Jalankan v5 di Supabase staging, verify 9 dusun masuk.
- [ ] Login admin, buka `/dashboard/pokja1/edit`, lihat 9 baris dusun.
- [ ] Edit nilai, autosave berfungsi.
- [ ] Export Excel → verify header "TP PKK Desa Belikurip" & 9 baris.
- [ ] Buka `/publik` (logout), lihat agregat desa + tabel per dusun.
- [ ] Klik dusun → masuk `/publik/dusun/[id]` (allowlist field).
- [ ] AI chat: tanya "tampilkan data Soko 2026" → response benar.
- [ ] Akses URL legacy `/publik/desa/9` → redirect ke `/publik/dusun/9`.
- [ ] `npm test` — semua suite hijau.
- [ ] `npm run build` — clean.

### Tests yang perlu di-update

- `__tests__/api-handler.test.js`: ganti `desa_id` → `dusun_id`.
- `__tests__/dataQuality.test.js`: kalau pakai `desa` di fixture, ganti.
- `__tests__/excel-import.test.js`: ganti expected sheet row.

## Rollback Plan

1. **Sebelum drop kolom `desa_id`** (yang dilakukan di migration v6, tidak di v5): aplikasi masih bisa di-rollback ke versi sebelum v5 dengan `git revert` + `vercel rollback` karena schema masih backward-compat.
2. **Setelah v5 dijalankan dan data dusun masuk**: rollback aplikasi tetap bisa, tapi data dusun yang sudah masuk akan invisible di app lama (karena app lama join via `desa_id`). Solusi: simpan dump pre-v5.
3. **Jika v5 gagal di tengah**: script idempotent, rerun aman. Untuk kembali ke state pre-v5, drop tabel `dusun` dan kolom `dusun_id` baru:

```sql
-- Rollback v5 (jalankan manual kalau perlu)
ALTER TABLE data_umum            DROP COLUMN IF EXISTS dusun_id;
-- ... ulangi untuk semua tabel data
ALTER TABLE audit_logs           DROP COLUMN IF EXISTS dusun_nama;
DROP TABLE IF EXISTS dusun;
```

## Deployment Checklist

1. Backup Supabase (Dashboard → Database → Backups).
2. Jalankan `supabase_schema_updates_v5.sql` di SQL Editor.
3. Verify: `SELECT * FROM dusun;` returns 9 rows.
4. Pilih opsi A (archive) atau opsi B (drop) untuk data lama.
5. Deploy aplikasi versi baru ke Vercel.
6. Smoke test: `/`, `/login`, `/dashboard`, `/publik`.
7. Set up monitoring untuk error rate selama 24 jam.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Drop kolom `desa_id` terlalu cepat → app crash di production | Tunda drop ke v6 (release berikutnya) setelah confirm tidak ada caller |
| User input value pakai nama dusun typo | Server-side validate via `dusun.nama` UNIQUE constraint |
| Public portal expose data sensitif | Allowlist tetap dipakai; tambah test integrasi `__tests__/publik-allowlist.test.js` |
| AI assistant masih reference "13 desa" karena cache | Cache di Gemini side tidak persist; system prompt baru langsung berlaku |
| Translation "Desa Belikurip" kena di tempat yang seharusnya tetap "Kecamatan Baturetno" (alamat) | Branding di pusat di `lib/branding.js`; sweep manual via grep "Kecamatan Baturetno" |
| Test integrasi import Excel butuh fixture baru | Update fixture sekali, masuk repo |

## Open Questions Reference

Lihat `requirements.md` bagian "Pertanyaan terbuka". Default jawaban di-encode di design ini:

1. Data lama 13 desa: **archive** (opsi A) di SQL script, dengan instruksi di komentar.
2. Role `sekretaris`: **tetap ada**.
3. Role baru "kepala dusun": **tidak**.
4. URL `/publik/desa/[id]`: **redirect 301** ke `/publik/dusun/[id]`.
5. Kolom RT/RW/Dawis di Bumil: **derived** dari `data_kegiatan_warga` saat render report (tidak duplikasi di `data_bumil`). Schema `data_bumil` saat ini sudah punya `jml_rt/jml_rw/jml_dasa_wisma` — boleh tetap diisi manual sebagai snapshot bulanan, tapi laporan default ambil dari `data_kegiatan_warga` kalau ada, fallback ke value bumil.

Setiap default ini bisa dibuka kembali sebelum implementasi kalau user mau.


## Correctness Properties

Properti invarian yang harus tetap benar setelah migrasi selesai.

### Property 1: Konsistensi unit data

Untuk setiap baris di `data_umum`, `data_pokja1-4`, `data_kegiatan_warga`, dan `data_bumil`, kolom `dusun_id` SHALL me-refer ke baris valid di tabel `dusun` (FK terjamin oleh constraint).

**Validates: Requirements 1.2**

### Property 2: Unique per periode

Tidak ada dua baris di tabel non-bumil dengan kombinasi `(dusun_id, tahun)` yang sama. Untuk `data_bumil`, tidak ada dua baris dengan kombinasi `(dusun_id, tahun, bulan)` yang sama.

**Validates: Requirements 1.2, 2.2**

### Property 3: Seed lengkap

Setelah migration v5 sukses, `SELECT COUNT(*) FROM dusun WHERE is_active = 1` SHALL mengembalikan tepat 9, dengan `nomor_urut` 1..9 unik dan nama tepat sesuai daftar (Soko, Melikan, Jamprit Wetan, Jamprit Kulon, Belikurip, Pagersari, Klerong, Tanjung, Banyuripan).

**Validates: Requirements 1.1, 2.1, 3.3**

### Property 4: Audit log lengkap

Setiap mutasi data via API SHALL menulis baris ke `audit_logs` dengan `dusun_nama` terisi (kolom lama `desa_nama` boleh NULL untuk entry baru).

**Validates: Requirements 1.6**

### Property 5: Public allowlist

Endpoint `/api/public/*` dan halaman `/publik/*` SHALL hanya mengembalikan kolom yang ada di allowlist; tidak ada kolom user/email/password/audit_logs yang ter-expose.

**Validates: Requirements 4.3**

### Property 6: Role permission

User dengan role `pokja{n}` SHALL hanya bisa write ke `data_pokja{n}`. User `sekretaris` SHALL hanya bisa write ke `data_umum`, `data_kegiatan_warga`, `data_bumil`. User `user` SHALL read-only di semua tabel.

**Validates: Requirements 5.1, 5.4**

### Property 7: Backward redirect

GET `/publik/desa/[id]` SHALL respond dengan redirect 301 ke `/publik/dusun/[id]` selama minimum 1 release.

**Validates: Requirements 4.4, 8.3**

### Property 8: Idempotency migration

Menjalankan `supabase_schema_updates_v5.sql` dua kali berturut-turut SHALL menghasilkan state DB yang sama dengan menjalankannya sekali (tidak ada error duplicate, tidak ada data hilang).

**Validates: Requirements 8.1**

### Property 9: No data leak from archive

Tabel `*_archive_kecamatan` (kalau opsi A dipilih) SHALL tidak diakses oleh aplikasi runtime. Hanya admin via SQL Editor Supabase yang boleh membacanya.

**Validates: Requirements 7.1, 8.3**

### Property 10: AI assistant scope

Function call `update_dusun_data` SHALL hanya dieksekusi untuk role yang punya permission tabel target (validasi server-side, role diambil dari JWT, bukan body request).

**Validates: Requirements 5.1, 6.3**


## Annex A — Bumil Report Template (pixel-perfect spec)

Layout berikut harus di-replicate persis di Excel, Word, dan PDF. Sumber: foto laporan resmi yang dikirim user.

### Header (tiga baris, center-aligned, di atas tabel)

```
                       REKAPITULASI DATA/BUKU CATATAN
IBU HAMIL,MELAHIRKAN,NIFAS,IBU MENINGGAL,KELAHIRAN BAYI,BAYI MENINGGAL DAN KEMATIAN BALITA
                            TP PKK DESA BELIKURIP
```

Catatan ortografi yang harus dipertahankan:
- "DATA/BUKU CATATAN" — pakai `/` tanpa spasi.
- Tanda koma TANPA spasi setelahnya: `HAMIL,MELAHIRKAN,NIFAS,IBU MENINGGAL,KELAHIRAN BAYI,BAYI MENINGGAL`.
- Kata penghubung "DAN" pakai spasi normal.
- Semua huruf KAPITAL. Bold. Center horizontal.

### Label periode (kiri atas, di atas tabel)

Dua baris label sejajar kiri, di atas baris ke-1 tabel (sebaris dengan title block secara vertikal kira-kira di tengah tinggi title):

```
BULAN  : <nama bulan>
TAHUN  : <tahun>
```

Format value:
- `<nama bulan>` = nama bulan Indonesia (Januari, Februari, ..., Desember). Kosong saat template kosong.
- `<tahun>` = 4 digit (2026). Kosong saat template kosong.
- Spasi sebelum `:` dipertahankan untuk alignment kolon vertikal.

### Tabel — struktur kolom (18 kolom logis)

Tiga baris header bertingkat (multi-row header), lalu satu baris nomor urut kolom (1..18) sebagai referensi, lalu 9 baris data + 1 baris "Jumlah".

#### Baris header 1 (top group)

| Span | Label |
|------|-------|
| col 1 (rowspan=3) | NO |
| col 2 (rowspan=3) | Nama Dusun |
| col 3-5 (colspan=3) | JUMLAH |
| col 6-9 (colspan=4) | JUMLAH IBU |
| col 10-15 (colspan=6) | JUMLAH BAYI |
| col 16-17 (colspan=2) | Jml Balita Meninggal |
| col 18 (rowspan=3) | Keterangan |

#### Baris header 2 (sub-group untuk JUMLAH BAYI)

Hanya kolom 10-15 di JUMLAH BAYI yang punya sub-group:

| Span | Label |
|------|-------|
| col 3 (rowspan=2 dari header 2) | RT |
| col 4 (rowspan=2 dari header 2) | RW |
| col 5 (rowspan=2 dari header 2) | Dawis |
| col 6 (rowspan=2 dari header 2) | Hamil |
| col 7 (rowspan=2 dari header 2) | Melahirkan |
| col 8 (rowspan=2 dari header 2) | Nifas |
| col 9 (rowspan=2 dari header 2) | Meninggal |
| col 10-11 (colspan=2) | Lahir |
| col 12-13 (colspan=2) | Akte Kelahiran |
| col 14-15 (colspan=2) | Meninggal |
| col 16 (rowspan=2 dari header 2) | L |
| col 17 (rowspan=2 dari header 2) | P |

Catatan: kolom 16-17 (Balita Meninggal L/P) labelnya cuma "L" dan "P" di baris header 2 karena parent group "Jml Balita Meninggal" (di header 1) sudah colspan=2 mencakup keduanya.

#### Baris header 3 (level paling bawah, hanya untuk JUMLAH BAYI sub-group)

| Col | Label |
|-----|-------|
| 10 | L |
| 11 | P |
| 12 | L |
| 13 | P |
| 14 | L |
| 15 | P |

Header label "Meninggal" untuk kolom 9 (ibu) di gambar tertulis pecah dua baris: "Mening" / "gal" — ini WORD WRAP otomatis karena lebar kolom sempit, BUKAN dua sel terpisah. Render sebagai satu kata "Meninggal" dengan word-wrap enabled.

#### Baris nomor urut kolom (di bawah header)

Baris ini opsional di laporan, tapi WAJIB di template kosong (sesuai gambar). Isi: angka 1..18 di setiap kolom data, alignment center.

| col | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
|-----|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|----|----|----|

#### Baris data (9 dusun)

Urutan absolut, harus di-hardcode `nomor_urut` 1..9:

| NO | Nama Dusun |
|----|------------|
| 1 | Soko |
| 2 | Melikan |
| 3 | Jamprit Wetan |
| 4 | Jamprit Kulon |
| 5 | Belikurip |
| 6 | Pagersari |
| 7 | Klerong |
| 8 | Tanjung |
| 9 | Banyuripan |

Sel data (kolom 3-17): nilai integer; kalau data tidak ada di DB, render `0` (NOT empty string). Kolom 18 (Keterangan): kosong by default; user boleh isi via UI nanti (deferred — schema saat ini tidak punya kolom keterangan; tambahkan `keterangan TEXT` di `data_bumil` di v5 atau v6).

#### Baris "Jumlah" (footer total)

| Col 1 | Col 2 | Col 3-17 | Col 18 |
|-------|-------|----------|--------|
| (kosong) | "Jumlah" | sum vertikal dari 9 baris dusun | (kosong) |

Label "Jumlah" merge dengan kolom 1 (NO kosong) — di gambar terlihat "Jumlah" mulai dari kolom Nama Dusun, kolom NO blank.

### Lebar kolom (rekomendasi Excel, untuk approximate match)

| Kolom | Konten | Lebar (chars) |
|-------|--------|---------------|
| 1 | NO | 4 |
| 2 | Nama Dusun | 16 |
| 3-5 | RT/RW/Dawis | 6 |
| 6 | Hamil | 8 |
| 7 | Melahirkan | 11 |
| 8 | Nifas | 7 |
| 9 | Meninggal | 9 |
| 10-15 | Bayi sub-cells | 5 |
| 16-17 | Balita L/P | 5 |
| 18 | Keterangan | 14 |

Semua border: 1px solid black (Excel `BORDER_THIN`). Header rows: bold. Tinggi baris header: auto-fit (wrap text enabled).

### Mapping kolom logis → DB field

| Col | Header | DB field source |
|-----|--------|-----------------|
| 1 | NO | `dusun.nomor_urut` |
| 2 | Nama Dusun | `dusun.nama` |
| 3 | RT | `data_kegiatan_warga.jml_rt` (fallback `data_bumil.jml_rt`) |
| 4 | RW | `data_kegiatan_warga.jml_rw` (fallback `data_bumil.jml_rw`) |
| 5 | Dawis | `data_kegiatan_warga.jml_dawis` (fallback `data_bumil.jml_dasa_wisma`) |
| 6 | Hamil | `data_bumil.ibu_hamil` |
| 7 | Melahirkan | `data_bumil.ibu_melahirkan` |
| 8 | Nifas | `data_bumil.ibu_nifas` |
| 9 | Meninggal | `data_bumil.ibu_meninggal` |
| 10 | Lahir L | `data_bumil.bayi_lahir_l` |
| 11 | Lahir P | `data_bumil.bayi_lahir_p` |
| 12 | Akte L | `data_bumil.akte_ada` (laki-laki, derived — saat ini single field; perlu split atau dijabarkan di v5/v6 — lihat catatan) |
| 13 | Akte P | `data_bumil.akte_ada` (perempuan, derived) |
| 14 | Meninggal L | `data_bumil.bayi_meninggal_l` |
| 15 | Meninggal P | `data_bumil.bayi_meninggal_p` |
| 16 | Balita Meninggal L | `data_bumil.balita_meninggal_l` |
| 17 | Balita Meninggal P | `data_bumil.balita_meninggal_p` |
| 18 | Keterangan | `data_bumil.keterangan` (kolom baru, tambah di v5) |

#### Catatan tentang kolom Akte (col 12-13)

Schema saat ini punya `akte_ada` (single integer) dan `akte_tidak`. Laporan resmi memisah Akte per gender (L/P). Untuk match 100%, schema `data_bumil` perlu kolom baru:

```sql
-- Tambah di supabase_schema_updates_v5.sql
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS akte_l INTEGER DEFAULT 0;
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS akte_p INTEGER DEFAULT 0;
ALTER TABLE data_bumil ADD COLUMN IF NOT EXISTS keterangan TEXT;
-- Migrate data lama: kalau akte_ada terisi, split 50/50 ke akte_l & akte_p sebagai default approximation:
-- (admin bisa adjust manual via UI)
```

Update juga `lib/dataPages.js` `bumil.columns` untuk tambah `akte_l`, `akte_p`, dan ganti tampilan label:

| key | label baru |
|-----|-----------|
| `akte_l` | Akte (L) |
| `akte_p` | Akte (P) |
| `keterangan` | Keterangan |

Hapus `akte_ada` & `akte_tidak` dari UI display (data DB tetap untuk backward-compat).

### Excel render — implementasi (`exceljs`)

Library `exceljs` sudah terpasang. Ringkasan:

```js
// app/api/export/excel/route.js — pseudocode untuk Bumil
const ws = wb.addWorksheet('Bumil', { properties: { defaultRowHeight: 18 } });

// 1. Title block (rows 1-3, merge across cols A:R)
ws.mergeCells('A1:R1'); ws.getCell('A1').value = 'REKAPITULASI DATA/BUKU CATATAN';
ws.mergeCells('A2:R2'); ws.getCell('A2').value = 'IBU HAMIL,MELAHIRKAN,NIFAS,IBU MENINGGAL,KELAHIRAN BAYI,BAYI MENINGGAL DAN KEMATIAN BALITA';
ws.mergeCells('A3:R3'); ws.getCell('A3').value = 'TP PKK DESA BELIKURIP';
[1,2,3].forEach(r => {
  const c = ws.getCell(`A${r}`);
  c.font = { bold: true }; c.alignment = { horizontal: 'center' };
});

// 2. Period labels (rows 4-5, kolom A-B)
ws.getCell('A4').value = 'BULAN'; ws.getCell('B4').value = `: ${namaBulan}`;
ws.getCell('A5').value = 'TAHUN'; ws.getCell('B5').value = `: ${tahun}`;

// 3. Header table (rows 6-8)
//    Row 6: NO | Nama Dusun | JUMLAH (3) | JUMLAH IBU (4) | JUMLAH BAYI (6) | Jml Balita Meninggal (2) | Keterangan
ws.mergeCells('A6:A8'); ws.getCell('A6').value = 'NO';
ws.mergeCells('B6:B8'); ws.getCell('B6').value = 'Nama Dusun';
ws.mergeCells('C6:E6'); ws.getCell('C6').value = 'JUMLAH';
ws.mergeCells('F6:I6'); ws.getCell('F6').value = 'JUMLAH IBU';
ws.mergeCells('J6:O6'); ws.getCell('J6').value = 'JUMLAH BAYI';
ws.mergeCells('P6:Q6'); ws.getCell('P6').value = 'Jml Balita Meninggal';
ws.mergeCells('R6:R8'); ws.getCell('R6').value = 'Keterangan';

//    Row 7: sub-headers
ws.mergeCells('C7:C8'); ws.getCell('C7').value = 'RT';
ws.mergeCells('D7:D8'); ws.getCell('D7').value = 'RW';
ws.mergeCells('E7:E8'); ws.getCell('E7').value = 'Dawis';
ws.mergeCells('F7:F8'); ws.getCell('F7').value = 'Hamil';
ws.mergeCells('G7:G8'); ws.getCell('G7').value = 'Melahirkan';
ws.mergeCells('H7:H8'); ws.getCell('H7').value = 'Nifas';
ws.mergeCells('I7:I8'); ws.getCell('I7').value = 'Meninggal';
ws.mergeCells('J7:K7'); ws.getCell('J7').value = 'Lahir';
ws.mergeCells('L7:M7'); ws.getCell('L7').value = 'Akte Kelahiran';
ws.mergeCells('N7:O7'); ws.getCell('N7').value = 'Meninggal';
ws.mergeCells('P7:P8'); ws.getCell('P7').value = 'L';
ws.mergeCells('Q7:Q8'); ws.getCell('Q7').value = 'P';

//    Row 8: leaf labels untuk JUMLAH BAYI
ws.getCell('J8').value = 'L'; ws.getCell('K8').value = 'P';
ws.getCell('L8').value = 'L'; ws.getCell('M8').value = 'P';
ws.getCell('N8').value = 'L'; ws.getCell('O8').value = 'P';

// 4. Column number reference row (row 9): 1..18
['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18']
  .forEach((n, i) => { ws.getCell(9, i + 1).value = n; });

// 5. Data rows (rows 10-18) — 9 dusun
DUSUN_LIST.forEach((dusunNama, idx) => {
  const r = 10 + idx;
  const data = bumilDataMap[dusunNama] || {};
  const kw = kegiatanWargaMap[dusunNama] || {};
  ws.getCell(r, 1).value = idx + 1;
  ws.getCell(r, 2).value = dusunNama;
  ws.getCell(r, 3).value = kw.jml_rt ?? data.jml_rt ?? 0;
  ws.getCell(r, 4).value = kw.jml_rw ?? data.jml_rw ?? 0;
  ws.getCell(r, 5).value = kw.jml_dawis ?? data.jml_dasa_wisma ?? 0;
  ws.getCell(r, 6).value = data.ibu_hamil ?? 0;
  ws.getCell(r, 7).value = data.ibu_melahirkan ?? 0;
  ws.getCell(r, 8).value = data.ibu_nifas ?? 0;
  ws.getCell(r, 9).value = data.ibu_meninggal ?? 0;
  ws.getCell(r, 10).value = data.bayi_lahir_l ?? 0;
  ws.getCell(r, 11).value = data.bayi_lahir_p ?? 0;
  ws.getCell(r, 12).value = data.akte_l ?? 0;
  ws.getCell(r, 13).value = data.akte_p ?? 0;
  ws.getCell(r, 14).value = data.bayi_meninggal_l ?? 0;
  ws.getCell(r, 15).value = data.bayi_meninggal_p ?? 0;
  ws.getCell(r, 16).value = data.balita_meninggal_l ?? 0;
  ws.getCell(r, 17).value = data.balita_meninggal_p ?? 0;
  ws.getCell(r, 18).value = data.keterangan ?? '';
});

// 6. Total row (row 19)
ws.getCell(19, 2).value = 'Jumlah';
for (let col = 3; col <= 17; col++) {
  ws.getCell(19, col).value = { formula: `SUM(${ws.getColumn(col).letter}10:${ws.getColumn(col).letter}18)` };
}

// 7. Borders & alignment
const lastRow = 19, lastCol = 18;
for (let r = 6; r <= lastRow; r++) {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}
// Bold header rows
[6, 7, 8, 19].forEach(r => {
  for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).font = { bold: true };
});

// 8. Column widths
[4, 16, 6, 6, 6, 8, 11, 7, 9, 5, 5, 5, 5, 5, 5, 5, 5, 14].forEach((w, i) => {
  ws.getColumn(i + 1).width = w;
});
```

### Word render (`docx` library)

`docx` library tidak terpasang di repo saat ini (cek `package.json`). Pilihan:

1. **Gunakan exceljs untuk Excel + jsPDF/pdfkit untuk PDF**: tampilan PDF mimic gambar.
2. **Tambah `docx` package** kalau Word output diperlukan.

Default plan: support **Excel + PDF** untuk match gambar. Word di-defer.

### PDF render (`pdfkit`)

`pdfkit` sudah terpasang (dipakai di Report Builder PDF export). Render manual:

```js
// app/api/export/pdf/route.js — pseudocode
const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });

// 1. Title
doc.font('Helvetica-Bold').fontSize(11);
doc.text('REKAPITULASI DATA/BUKU CATATAN', { align: 'center' });
doc.text('IBU HAMIL,MELAHIRKAN,NIFAS,IBU MENINGGAL,KELAHIRAN BAYI,BAYI MENINGGAL DAN KEMATIAN BALITA', { align: 'center' });
doc.text('TP PKK DESA BELIKURIP', { align: 'center' });
doc.moveDown(0.5);

// 2. Period labels (left aligned)
doc.font('Helvetica').fontSize(10);
doc.text(`BULAN  : ${namaBulan}`);
doc.text(`TAHUN  : ${tahun}`);
doc.moveDown(0.3);

// 3. Table — pakai library pdfkit-table atau buat manual dengan doc.rect()
//    Strategi: buat utility renderMultiHeaderTable({ headers: [[...row1], [...row2], [...row3]], rows: dusunRows, totalsRow })
//    yang draw cell by cell dengan doc.rect() dan doc.text().
```

Karena pdfkit tidak punya native multi-row header support, kita buat helper `lib/pdfTable.js` baru yang menerima struktur header tree dan render manual.

### Validation checklist (post-implementation)

- [ ] Title block tepat 3 baris, center, bold, KAPITAL.
- [ ] BULAN & TAHUN label di kiri, posisi sama tinggi dengan title block.
- [ ] Header tabel tepat 3 baris (atau 2 baris kalau tanpa baris nomor urut kolom).
- [ ] Kolom NO tampil 1, 2, ..., 9 untuk dusun, kosong di baris Jumlah.
- [ ] Kolom Nama Dusun tampil persis 9 nama Belikurip + "Jumlah".
- [ ] Border tipis di semua sel tabel.
- [ ] Sel kosong di-render `0` (kecuali Keterangan boleh kosong).
- [ ] Baris Jumlah berisi sum vertikal kolom 3-17.
- [ ] Test fixture: data dummy untuk bulan tertentu → file output sesuai snapshot.
- [ ] Visual diff dengan gambar referensi: spacing, alignment, capitalization match.


## Annex B — Pokja I Report Template (pixel-perfect spec)

Layout berikut harus di-replicate persis di Excel & PDF. Sumber: foto laporan resmi Pokja I yang dikirim user.

### Header (tiga baris, center-aligned, di atas tabel)

```
                    DATA KEGIATAN PKK
                    DESA   : BELIKURIP
                       POKJA I
```

Catatan:
- Semua huruf KAPITAL. Bold. Center horizontal.
- Format "DESA   : BELIKURIP" — beberapa spasi sebelum titik dua untuk alignment visual.
- "POKJA I" pakai angka Romawi.

### Label periode (kiri atas, di atas tabel)

Satu baris label sejajar kiri:

```
TAHUN : <tahun>
```

Format: `<tahun>` = 4 digit (mis. 2025). Kosong saat template kosong.

### Tabel — struktur kolom (19 kolom logis)

Tiga baris header bertingkat (multi-row header), lalu satu baris nomor urut kolom (1..19), lalu 9 baris data + 1 baris "JUMLAH".

Latar belakang header: hijau muda (sesuai gambar). Border tipis hitam di semua sel.

#### Baris header 1 (top group)

| Span | Label |
|------|-------|
| col 1 (rowspan=3) | No |
| col 2 (rowspan=3) | NAMA DUSUN |
| col 3-5 (colspan=3) | JUMLAH KADER |
| col 6-13 (colspan=8) | PENGHAYATAN DAN PENGAMALAN PANCASILA |
| col 14-18 (colspan=5) | GOTONG ROYONG |
| col 19 (rowspan=3) | KET |

#### Baris header 2 (sub-group)

| Span | Label |
|------|-------|
| col 3 (rowspan=2 dari header 2) | PKBN |
| col 4 (rowspan=2 dari header 2) | PKDRT |
| col 5 (rowspan=2 dari header 2) | POLA ASUH |
| col 6-7 (colspan=2) | PKBN |
| col 8-9 (colspan=2) | PKDRT |
| col 10-11 (colspan=2) | POLA ASUH |
| col 12-13 (colspan=2) | LANSIA |
| col 14 (rowspan=2 dari header 2) | KERJA BAKTI |
| col 15 (rowspan=2 dari header 2) | RUKUN KEMATIAN |
| col 16-18 (colspan=3) | JUMLAH KELOMPOK |

Catatan: kolom 16-18 (KEAGAMAAN/JIMPITAN/ARISAN) parent group "JUMLAH KELOMPOK" colspan=3 di gambar.

#### Baris header 3 (level paling bawah)

| Col | Label |
|-----|-------|
| 6 | JML KLP SIMULASI |
| 7 | JML ANG |
| 8 | JML KLP SIMULASI |
| 9 | JML ANG |
| 10 | JML KLP SIMULASI |
| 11 | JML ANG |
| 12 | JML KLP SIMULASI |
| 13 | JML ANG |
| 16 | KEAGAMAAN |
| 17 | JIMPITAN |
| 18 | ARISAN |

#### Baris nomor urut kolom (di bawah header)

Angka 1..19 di setiap kolom, alignment center. Latar hijau muda.

#### Baris data (9 dusun)

Urutan absolut, sama dengan Bumil (`nomor_urut` 1..9):

| No | NAMA DUSUN |
|----|------------|
| 1 | SOKO |
| 2 | MELIKAN |
| 3 | JAMPRIT WETAN |
| 4 | JAMPRIT KULON |
| 5 | BELIKURIP |
| 6 | PAGERSARI |
| 7 | KLERONG |
| 8 | TANJUNG |
| 9 | BANYURIPAN |

Nama dusun di Pokja I template ditulis KAPITAL semua (sesuai gambar).

Sel data (kolom 3-18): nilai integer; kalau data tidak ada di DB, render `0`. Kolom 19 (KET): kosong by default.

#### Baris "JUMLAH" (footer total)

| Col 1 | Col 2 | Col 3-18 | Col 19 |
|-------|-------|----------|--------|
| (kosong) | "JUMLAH" | sum vertikal dari 9 baris dusun | (kosong) |

Label "JUMLAH" KAPITAL, bold.

### Mapping kolom logis → DB field (`data_pokja1`)

| Col | Header path | DB field |
|-----|-------------|----------|
| 1 | No | `dusun.nomor_urut` |
| 2 | NAMA DUSUN | `dusun.nama` (uppercase) |
| 3 | JUMLAH KADER → PKBN | `kader_pkbn` |
| 4 | JUMLAH KADER → PKDRT | `kader_pkdrt` |
| 5 | JUMLAH KADER → POLA ASUH | `kader_pola_asuh` |
| 6 | PENGHAYATAN → PKBN → JML KLP SIMULASI | `pkbn_jml_klp_simulasi` |
| 7 | PENGHAYATAN → PKBN → JML ANG | `pkbn_jml_anggota` |
| 8 | PENGHAYATAN → PKDRT → JML KLP SIMULASI | `pkdrt_jml_klp_simulasi` |
| 9 | PENGHAYATAN → PKDRT → JML ANG | `pkdrt_jml_anggota` |
| 10 | PENGHAYATAN → POLA ASUH → JML KLP SIMULASI | `pola_asuh_jml_klp` |
| 11 | PENGHAYATAN → POLA ASUH → JML ANG | `pola_asuh_jml_anggota` |
| 12 | PENGHAYATAN → LANSIA → JML KLP SIMULASI | `lansia_jml_klp` |
| 13 | PENGHAYATAN → LANSIA → JML ANG | `lansia_jml_anggota` |
| 14 | GOTONG ROYONG → KERJA BAKTI | `gr_kerja_bakti` |
| 15 | GOTONG ROYONG → RUKUN KEMATIAN | `gr_rukun_kematian` |
| 16 | GOTONG ROYONG → JML KELOMPOK → KEAGAMAAN | `gr_keagamaan` |
| 17 | GOTONG ROYONG → JML KELOMPOK → JIMPITAN | `gr_jimpitan` |
| 18 | GOTONG ROYONG → JML KELOMPOK → ARISAN | `gr_arisan` |
| 19 | KET | `keterangan` (kolom baru, tambah di v5) |

#### Catatan tentang label "POLA ASUH" di JUMLAH KADER (col 5)

Di gambar terlihat label "POLA ASUH" pecah dua baris ("POLA" / "ASUH") karena lebar kolom sempit. Render sebagai single label "POLA ASUH" dengan word-wrap enabled.

### Lebar kolom (rekomendasi Excel)

| Kolom | Konten | Lebar (chars) |
|-------|--------|---------------|
| 1 | No | 4 |
| 2 | NAMA DUSUN | 16 |
| 3-5 | JUMLAH KADER | 7 |
| 6-13 | PENGHAYATAN sub-cells | 9 |
| 14-15 | KERJA BAKTI / RUKUN KEMATIAN | 9 |
| 16-18 | JUMLAH KELOMPOK | 10 |
| 19 | KET | 6 |

Tinggi baris header: auto-fit (wrap text). Latar belakang baris header & baris nomor urut kolom: hijau muda (`FFD4EDDA` atau Tailwind `green-100` equivalent).

### Excel render — implementasi (`exceljs`)

```js
// app/api/export/excel/route.js — Pokja I pseudocode
const ws = wb.addWorksheet('Pokja I');

// 1. Title block (rows 1-3, merge across cols A:S — 19 kolom)
ws.mergeCells('A1:S1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
ws.mergeCells('A2:S2'); ws.getCell('A2').value = `DESA   : BELIKURIP`;
ws.mergeCells('A3:S3'); ws.getCell('A3').value = 'POKJA I';

// 2. Period label (row 5)
ws.getCell('A5').value = `TAHUN : ${tahun}`;

// 3. Header table (rows 7-9)
//    Row 7: top groups
ws.mergeCells('A7:A9'); ws.getCell('A7').value = 'No';
ws.mergeCells('B7:B9'); ws.getCell('B7').value = 'NAMA DUSUN';
ws.mergeCells('C7:E7'); ws.getCell('C7').value = 'JUMLAH KADER';
ws.mergeCells('F7:M7'); ws.getCell('F7').value = 'PENGHAYATAN DAN PENGAMALAN PANCASILA';
ws.mergeCells('N7:R7'); ws.getCell('N7').value = 'GOTONG ROYONG';
ws.mergeCells('S7:S9'); ws.getCell('S7').value = 'KET';

//    Row 8: mid sub-groups
ws.mergeCells('C8:C9'); ws.getCell('C8').value = 'PKBN';
ws.mergeCells('D8:D9'); ws.getCell('D8').value = 'PKDRT';
ws.mergeCells('E8:E9'); ws.getCell('E8').value = 'POLA ASUH';
ws.mergeCells('F8:G8'); ws.getCell('F8').value = 'PKBN';
ws.mergeCells('H8:I8'); ws.getCell('H8').value = 'PKDRT';
ws.mergeCells('J8:K8'); ws.getCell('J8').value = 'POLA ASUH';
ws.mergeCells('L8:M8'); ws.getCell('L8').value = 'LANSIA';
ws.mergeCells('N8:N9'); ws.getCell('N8').value = 'KERJA BAKTI';
ws.mergeCells('O8:O9'); ws.getCell('O8').value = 'RUKUN KEMATIAN';
ws.mergeCells('P8:R8'); ws.getCell('P8').value = 'JUMLAH KELOMPOK';

//    Row 9: leaf labels
['JML KLP SIMULASI', 'JML ANG', 'JML KLP SIMULASI', 'JML ANG',
 'JML KLP SIMULASI', 'JML ANG', 'JML KLP SIMULASI', 'JML ANG']
  .forEach((label, i) => { ws.getCell(9, 6 + i).value = label; });
ws.getCell('P9').value = 'KEAGAMAAN';
ws.getCell('Q9').value = 'JIMPITAN';
ws.getCell('R9').value = 'ARISAN';

// 4. Column number reference (row 10): 1..19
for (let i = 1; i <= 19; i++) ws.getCell(10, i).value = i;

// 5. Data rows (rows 11-19) — 9 dusun
DUSUN_LIST.forEach((dusunNama, idx) => {
  const r = 11 + idx;
  const data = pokja1Map[dusunNama] || {};
  ws.getCell(r, 1).value = idx + 1;
  ws.getCell(r, 2).value = dusunNama.toUpperCase();
  ws.getCell(r, 3).value = data.kader_pkbn ?? 0;
  ws.getCell(r, 4).value = data.kader_pkdrt ?? 0;
  ws.getCell(r, 5).value = data.kader_pola_asuh ?? 0;
  ws.getCell(r, 6).value = data.pkbn_jml_klp_simulasi ?? 0;
  ws.getCell(r, 7).value = data.pkbn_jml_anggota ?? 0;
  ws.getCell(r, 8).value = data.pkdrt_jml_klp_simulasi ?? 0;
  ws.getCell(r, 9).value = data.pkdrt_jml_anggota ?? 0;
  ws.getCell(r, 10).value = data.pola_asuh_jml_klp ?? 0;
  ws.getCell(r, 11).value = data.pola_asuh_jml_anggota ?? 0;
  ws.getCell(r, 12).value = data.lansia_jml_klp ?? 0;
  ws.getCell(r, 13).value = data.lansia_jml_anggota ?? 0;
  ws.getCell(r, 14).value = data.gr_kerja_bakti ?? 0;
  ws.getCell(r, 15).value = data.gr_rukun_kematian ?? 0;
  ws.getCell(r, 16).value = data.gr_keagamaan ?? 0;
  ws.getCell(r, 17).value = data.gr_jimpitan ?? 0;
  ws.getCell(r, 18).value = data.gr_arisan ?? 0;
  ws.getCell(r, 19).value = data.keterangan ?? '';
});

// 6. Total row (row 20)
ws.getCell(20, 2).value = 'JUMLAH';
for (let col = 3; col <= 18; col++) {
  const letter = ws.getColumn(col).letter;
  ws.getCell(20, col).value = { formula: `SUM(${letter}11:${letter}19)` };
}

// 7. Borders & alignment for header & data area
const lastRow = 20, lastCol = 19;
for (let r = 7; r <= lastRow; r++) {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

// 8. Header background green + bold
[7, 8, 9, 10].forEach(r => {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).font = { bold: true };
    ws.getCell(r, c).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' },
    };
  }
});

// 9. Column widths
[4, 16, 7, 7, 7, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 6]
  .forEach((w, i) => { ws.getColumn(i + 1).width = w; });
```

### Validation checklist (post-implementation)

- [ ] Title block tepat 3 baris, center, bold, KAPITAL: "DATA KEGIATAN PKK / DESA   : BELIKURIP / POKJA I".
- [ ] TAHUN label di kiri.
- [ ] Header tabel 3 baris bertingkat dengan latar hijau muda.
- [ ] Baris nomor urut kolom 1..19 hadir.
- [ ] Kolom NO tampil 1..9 untuk dusun, kosong di baris JUMLAH.
- [ ] NAMA DUSUN tampil 9 nama Belikurip uppercase + "JUMLAH".
- [ ] Border tipis di semua sel tabel.
- [ ] Sel kosong → 0.
- [ ] Baris JUMLAH = sum vertikal kolom 3-18.
- [ ] Test fixture data dummy → file output match snapshot.
- [ ] Visual diff dengan gambar referensi.


## Annex C — Pokja II Report Template (pixel-perfect spec)

Layout berikut harus di-replicate persis di Excel & PDF. Sumber: foto laporan resmi Pokja II yang dikirim user.

> **Catatan penting**: Gambar referensi memuat 36 kolom dengan sub-header bertingkat 3 level. Beberapa kolom **belum ada di schema** `data_pokja2` saat ini dan WAJIB ditambah di migration v5 (lihat sub-bagian "Schema gap" di bawah). Kolom yang labelnya tidak terbaca jelas di foto ditandai `[KONFIRMASI]` dan perlu di-validasi sebelum implementasi.

### Header (di atas tabel)

```
                    DATA KEGIATAN PKK
                    DESA   : BELIKURIP
                       POKJA II

TAHUN : <tahun>
```

Sama style dengan Pokja I (Annex B): bold, KAPITAL, center, "POKJA II" angka Romawi.

### Tabel — struktur kolom (36 kolom logis)

Tiga baris header bertingkat (multi-row header), lalu satu baris nomor urut kolom (1..36), lalu 9 baris data + 1 baris "JUMLAH".

#### Baris header 1 (top group)

| Span | Label |
|------|-------|
| col 1 (rowspan=3) | No |
| col 2 (rowspan=3) | Nama Dusun |
| col 3-25 (colspan=23) | PENDIDIKAN DAN KETRAMPILAN |
| col 26-35 (colspan=10) | PENGEMBANGAN KEH BERKOPERASI |
| col 36 (rowspan=3) | KET |

#### Baris header 2 (sub-group)

Di bawah PENDIDIKAN DAN KETRAMPILAN (cols 3-25):

| Span | Label |
|------|-------|
| col 3 (rowspan=2) | Jml Wrg yg Masih 3 Buta |
| col 4-5 (colspan=2) | PAKET A |
| col 6-7 (colspan=2) | PAKET B |
| col 8-9 (colspan=2) | PAKET C |
| col 10-11 (colspan=2) | KF |
| col 12 (rowspan=2) | PAUD SEJENIS |
| col 13 (rowspan=2) | JML TAMAN BACAAN |
| col 14 (rowspan=2) | JML KLP PEMBACA |
| col 15-17 (colspan=3) | BKB |
| col 18-22 (colspan=5) | KADER KHUSUS |
| col 23-25 (colspan=3) | YG SDH DI LATIH |

Di bawah PENGEMBANGAN KEH BERKOPERASI (cols 26-35):

| Span | Label |
|------|-------|
| col 26-33 (colspan=8) | PRA KOPERASI/USAHA BERSAMA/UP2K |
| col 34-35 (colspan=2) | KOPERASI HUKUM |

#### Baris header 3 (level paling bawah)

Untuk PAKET A/B/C/KF (cols 4-11) — masing-masing 2 leaf:

| Col | Label |
|-----|-------|
| 4 | JML KLP |
| 5 | JML WRG |
| 6 | JML KLP |
| 7 | JML WRG |
| 8 | JML KLP |
| 9 | JML WRG |
| 10 | JML KLP |
| 11 | JML WRG |

Untuk BKB (cols 15-17):

| Col | Label |
|-----|-------|
| 15 | JML KLP |
| 16 | Jml APE Set |
| 17 | Jml APE Set |

Untuk KADER KHUSUS (cols 18-22):

| Col | Label | Catatan |
|-----|-------|---------|
| 18 | KF | sub-grup TUTOR (header 2.5 colspan=2 over cols 18-19) |
| 19 | PAUD Sejenis | sub-grup TUTOR |
| 20 | BKB | (sibling tanpa parent TUTOR) |
| 21 | KOPERASI | |
| 22 | KETRAMPILAN | |

Catatan: di gambar, header "TUTOR" muncul sebagai sub-header 2-level di atas kolom 18-19 saja. Render dengan struktur 3-level di bagian KADER KHUSUS:
- Level 1: KADER KHUSUS (cols 18-22)
- Level 2: TUTOR (cols 18-19, colspan=2) | BKB (col 20, rowspan=1) | KOPERASI (col 21, rowspan=1) | KETRAMPILAN (col 22, rowspan=1)
- Level 3: KF | PAUD Sejenis | (BKB/KOPERASI/KETRAMPILAN sudah di level 2)

Untuk YG SDH DI LATIH (cols 23-25):

| Col | Label |
|-----|-------|
| 23 | LP3PKK |
| 24 | TP3 PKK `[KONFIRMASI]` |
| 25 | DAMAS PKK |

Untuk PRA KOPERASI/USAHA BERSAMA/UP2K (cols 26-33) — sub-sub-grup PEMULA/MADYA/UTAMA/MANDIRI:

| Span | Sub-label |
|------|-----------|
| col 26-27 (colspan=2) | PEMULA |
| col 28-29 (colspan=2) | MADYA |
| col 30-31 (colspan=2) | UTAMA |
| col 32-33 (colspan=2) | MANDIRI |

Lalu leaf (header 3) untuk masing-masing:

| Col | Label |
|-----|-------|
| 26 | JML KLP |
| 27 | JML PSRTA |
| 28 | JML KLP |
| 29 | JML PSRTA |
| 30 | JML KLP |
| 31 | JML PSRTA |
| 32 | JML KLP |
| 33 | JML PSRTA |

Untuk KOPERASI HUKUM (cols 34-35):

| Col | Label |
|-----|-------|
| 34 | JML KLP |
| 35 | JML PSRTA |

#### Baris nomor urut kolom (di bawah header)

Angka 1..36 di setiap kolom, alignment center.

#### Baris data (9 dusun)

Sama dengan Pokja I: 9 dusun urutan SOKO..BANYURIPAN, label uppercase. Sel kosong → 0.

#### Baris "JUMLAH" (footer total)

Sum vertikal kolom 3-35. Kol 1, 2 (NO/Nama dst), 36 (KET) kosong/label saja.

### Schema gap — kolom baru yang harus ditambah ke `data_pokja2`

Kolom existing di `data_pokja2`:
- `paket_a_klp`, `paket_a_wrg`, `paket_b_klp`, `paket_b_wrg`, `paket_c_klp`, `paket_c_wrg`
- `taman_bacaan`, `klp_pembaca`, `rumah_dilan`, `kampung_mandiri`
- `kader_khusus_koperasi`, `kader_khusus_keterampilan`
- `usaha_mikro`
- `up2k_pemula_klp`, `up2k_pemula_psrt`, `up2k_madya_klp`, `up2k_madya_psrt`, `up2k_utama_klp`, `up2k_utama_psrt`, `up2k_mandiri_klp`, `up2k_mandiri_psrt`
- `toko_pkk`
- `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`, `koperasi_berbadan_hukum_kop`, `koperasi_berbadan_hukum_angg`

Kolom yang sudah cocok dengan gambar:
- `paket_a_klp`/`paket_a_wrg` → cols 4-5
- `paket_b_klp`/`paket_b_wrg` → cols 6-7
- `paket_c_klp`/`paket_c_wrg` → cols 8-9
- `taman_bacaan` → col 13
- `klp_pembaca` → col 14
- `kader_khusus_koperasi` → col 21
- `kader_khusus_keterampilan` → col 22
- `up2k_pemula_klp`/`up2k_pemula_psrt` → cols 26-27
- `up2k_madya_klp`/`up2k_madya_psrt` → cols 28-29
- `up2k_utama_klp`/`up2k_utama_psrt` → cols 30-31
- `up2k_mandiri_klp`/`up2k_mandiri_psrt` → cols 32-33
- `koperasi_berbadan_hukum_kop`/`koperasi_berbadan_hukum_angg` → cols 34-35

Kolom BARU yang HARUS ditambah di `supabase_schema_updates_v5.sql`:

```sql
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS jml_warga_3_buta    INTEGER DEFAULT 0;  -- col 3 (warga yang masih 3 buta: buta huruf/angka/bhs)
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kf_klp              INTEGER DEFAULT 0;  -- col 10
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kf_wrg              INTEGER DEFAULT 0;  -- col 11
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS paud_sejenis        INTEGER DEFAULT 0;  -- col 12
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_klp             INTEGER DEFAULT 0;  -- col 15
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_ape_set_a       INTEGER DEFAULT 0;  -- col 16 (Jml APE Set, slot A)
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS bkb_ape_set_b       INTEGER DEFAULT 0;  -- col 17 (Jml APE Set, slot B)
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kader_tutor_kf      INTEGER DEFAULT 0;  -- col 18
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kader_tutor_paud    INTEGER DEFAULT 0;  -- col 19
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS kader_bkb           INTEGER DEFAULT 0;  -- col 20
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS yg_dilatih_lp3pkk   INTEGER DEFAULT 0;  -- col 23
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS yg_dilatih_tp3pkk   INTEGER DEFAULT 0;  -- col 24 (TP3PKK tanpa spasi)
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS yg_dilatih_damaspkk INTEGER DEFAULT 0;  -- col 25
ALTER TABLE data_pokja2 ADD COLUMN IF NOT EXISTS keterangan          TEXT;               -- col 36
```

Catatan: kolom 16 & 17 sama-sama berlabel "Jml APE Set" sesuai konfirmasi user. Schema pakai suffix `_a`/`_b` supaya unik di DB. UI render keduanya dengan label identik "Jml APE Set" (tanpa _a/_b di label tampilan).

Kolom existing yang **tidak terlihat di gambar** akan **DI-DROP PERMANEN** di v5 (sesuai konfirmasi user):
- `rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`
- `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`

```sql
-- Drop legacy Pokja II columns (di v5, setelah backup)
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS rumah_dilan;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS kampung_mandiri;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS usaha_mikro;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS toko_pkk;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS koperasi_belum_bh_kop;
ALTER TABLE data_pokja2 DROP COLUMN IF EXISTS koperasi_belum_bh_angg;
```

⚠️ **HARD DELETE — tidak reversible tanpa restore backup**. Pastikan dump Supabase sudah di-backup sebelum jalankan v5. Update juga `lib/dataPages.js` `pokja2.columns` (hapus key tersebut) dan `lib/excel/sheetMap.js` `'POKJA II'.keys` agar tidak ada referensi yang menyebabkan error setelah drop.

### Mapping kolom logis → DB field

| Col | Header path | DB field |
|-----|-------------|----------|
| 1 | No | `dusun.nomor_urut` |
| 2 | Nama Dusun | `dusun.nama` (uppercase) |
| 3 | PENDIDIKAN → Jml Wrg yg Masih 3 Buta | `jml_warga_3_buta` |
| 4 | PAKET A → JML KLP | `paket_a_klp` |
| 5 | PAKET A → JML WRG | `paket_a_wrg` |
| 6 | PAKET B → JML KLP | `paket_b_klp` |
| 7 | PAKET B → JML WRG | `paket_b_wrg` |
| 8 | PAKET C → JML KLP | `paket_c_klp` |
| 9 | PAKET C → JML WRG | `paket_c_wrg` |
| 10 | KF → JML KLP | `kf_klp` |
| 11 | KF → JML WRG | `kf_wrg` |
| 12 | PAUD SEJENIS | `paud_sejenis` |
| 13 | JML TAMAN BACAAN | `taman_bacaan` |
| 14 | JML KLP PEMBACA | `klp_pembaca` |
| 15 | BKB → JML KLP | `bkb_klp` |
| 16 | BKB → Jml APE Set | `bkb_ape_set_a` |
| 17 | BKB → Jml APE Set | `bkb_ape_set_b` |
| 18 | KADER KHUSUS → TUTOR → KF | `kader_tutor_kf` |
| 19 | KADER KHUSUS → TUTOR → PAUD Sejenis | `kader_tutor_paud` |
| 20 | KADER KHUSUS → BKB | `kader_bkb` |
| 21 | KADER KHUSUS → KOPERASI | `kader_khusus_koperasi` |
| 22 | KADER KHUSUS → KETRAMPILAN | `kader_khusus_keterampilan` |
| 23 | YG SDH DI LATIH → LP3PKK | `yg_dilatih_lp3pkk` |
| 24 | YG SDH DI LATIH → TP3PKK | `yg_dilatih_tp3pkk` |
| 25 | YG SDH DI LATIH → DAMAS PKK | `yg_dilatih_damaspkk` |
| 26 | PRA KOPERASI → PEMULA → JML KLP | `up2k_pemula_klp` |
| 27 | PRA KOPERASI → PEMULA → JML PSRTA | `up2k_pemula_psrt` |
| 28 | PRA KOPERASI → MADYA → JML KLP | `up2k_madya_klp` |
| 29 | PRA KOPERASI → MADYA → JML PSRTA | `up2k_madya_psrt` |
| 30 | PRA KOPERASI → UTAMA → JML KLP | `up2k_utama_klp` |
| 31 | PRA KOPERASI → UTAMA → JML PSRTA | `up2k_utama_psrt` |
| 32 | PRA KOPERASI → MANDIRI → JML KLP | `up2k_mandiri_klp` |
| 33 | PRA KOPERASI → MANDIRI → JML PSRTA | `up2k_mandiri_psrt` |
| 34 | KOPERASI HUKUM → JML KLP | `koperasi_berbadan_hukum_kop` |
| 35 | KOPERASI HUKUM → JML PSRTA | `koperasi_berbadan_hukum_angg` |
| 36 | KET | `keterangan` |

### Lebar kolom (rekomendasi Excel)

| Kolom | Konten | Lebar (chars) |
|-------|--------|---------------|
| 1 | No | 4 |
| 2 | Nama Dusun | 14 |
| 3 | Jml Sdh Baca Tulis | 7 |
| 4-11 | PAKET A/B/C/KF JML KLP/WRG | 6 |
| 12 | PAUD SEJENIS | 6 |
| 13 | JML TMN BACAAN | 6 |
| 14 | JML KLP PEMBACA | 6 |
| 15-17 | BKB sub-cells | 6 |
| 18-22 | KADER KHUSUS sub-cells | 6 |
| 23-25 | YG SDH DI LATIH | 7 |
| 26-33 | UP2K sub-cells | 7 |
| 34-35 | KOPERASI HUKUM | 7 |
| 36 | KET | 6 |

Karena 36 kolom sangat lebar, paper size **A3 landscape** atau **A4 landscape dengan scale 70%** untuk PDF. Excel: tidak masalah karena bisa scroll.

### Excel render — implementasi (`exceljs`)

```js
// app/api/export/excel/route.js — Pokja II pseudocode
const ws = wb.addWorksheet('Pokja II', { pageSetup: { orientation: 'landscape', paperSize: 8 /* A3 */ } });

// 1. Title block (rows 1-3, merge across cols A:AJ — 36 kolom)
ws.mergeCells('A1:AJ1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
ws.mergeCells('A2:AJ2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
ws.mergeCells('A3:AJ3'); ws.getCell('A3').value = 'POKJA II';

// 2. Period label (row 5)
ws.getCell('A5').value = `TAHUN : ${tahun}`;

// 3. Header table (rows 7-10 — 4 rows because of TUTOR sub-sub-group)
// Note: untuk simplicity di Excel, kita tetap pakai 3 baris header utama + manual handling TUTOR.

// Row 7: top groups
ws.mergeCells('A7:A10'); ws.getCell('A7').value = 'No';
ws.mergeCells('B7:B10'); ws.getCell('B7').value = 'Nama Dusun';
ws.mergeCells('C7:Y7'); ws.getCell('C7').value = 'PENDIDIKAN DAN KETRAMPILAN';
ws.mergeCells('Z7:AI7'); ws.getCell('Z7').value = 'PENGEMBANGAN KEH BERKOPERASI';
ws.mergeCells('AJ7:AJ10'); ws.getCell('AJ7').value = 'KET';

// Row 8: sub-groups level 2
ws.mergeCells('C8:C10'); ws.getCell('C8').value = 'Jml Wrg yg Masih 3 Buta';
ws.mergeCells('D8:E8'); ws.getCell('D8').value = 'PAKET A';
ws.mergeCells('F8:G8'); ws.getCell('F8').value = 'PAKET B';
ws.mergeCells('H8:I8'); ws.getCell('H8').value = 'PAKET C';
ws.mergeCells('J8:K8'); ws.getCell('J8').value = 'KF';
ws.mergeCells('L8:L10'); ws.getCell('L8').value = 'PAUD SEJENIS';
ws.mergeCells('M8:M10'); ws.getCell('M8').value = 'JML TAMAN BACAAN';
ws.mergeCells('N8:N10'); ws.getCell('N8').value = 'JML KLP PEMBACA';
ws.mergeCells('O8:Q8'); ws.getCell('O8').value = 'BKB';
ws.mergeCells('R8:V8'); ws.getCell('R8').value = 'KADER KHUSUS';
ws.mergeCells('W8:Y8'); ws.getCell('W8').value = 'YG SDH DI LATIH';
ws.mergeCells('Z8:AG8'); ws.getCell('Z8').value = 'PRA KOPERASI/USAHA BERSAMA/UP2K';
ws.mergeCells('AH8:AI8'); ws.getCell('AH8').value = 'KOPERASI HUKUM';

// Row 9: sub-sub-groups level 3 (TUTOR + PEMULA/MADYA/UTAMA/MANDIRI)
['JML KLP','JML WRG','JML KLP','JML WRG','JML KLP','JML WRG','JML KLP','JML WRG']
  .forEach((label, i) => {
    ws.mergeCells(9, 4 + i, 10, 4 + i);
    ws.getCell(9, 4 + i).value = label;
  });
['JML KLP','Jml APE Set','Jml APE Set'].forEach((label, i) => {
  ws.mergeCells(9, 15 + i, 10, 15 + i);
  ws.getCell(9, 15 + i).value = label;
});
ws.mergeCells('R9:S9'); ws.getCell('R9').value = 'TUTOR';
ws.mergeCells('T9:T10'); ws.getCell('T9').value = 'BKB';
ws.mergeCells('U9:U10'); ws.getCell('U9').value = 'KOPERASI';
ws.mergeCells('V9:V10'); ws.getCell('V9').value = 'KETRAMPILAN';
['LP3PKK','TP3PKK','DAMAS PKK'].forEach((label, i) => {
  ws.mergeCells(9, 23 + i, 10, 23 + i);
  ws.getCell(9, 23 + i).value = label;
});
ws.mergeCells('Z9:AA9'); ws.getCell('Z9').value = 'PEMULA';
ws.mergeCells('AB9:AC9'); ws.getCell('AB9').value = 'MADYA';
ws.mergeCells('AD9:AE9'); ws.getCell('AD9').value = 'UTAMA';
ws.mergeCells('AF9:AG9'); ws.getCell('AF9').value = 'MANDIRI';
ws.mergeCells('AH9:AH10'); ws.getCell('AH9').value = 'JML KLP';
ws.mergeCells('AI9:AI10'); ws.getCell('AI9').value = 'JML PSRTA';

// Row 10: leaf labels untuk TUTOR & PRA KOPERASI level 4
ws.getCell('R10').value = 'KF';
ws.getCell('S10').value = 'PAUD Sejenis';
['JML KLP','JML PSRTA','JML KLP','JML PSRTA','JML KLP','JML PSRTA','JML KLP','JML PSRTA']
  .forEach((label, i) => { ws.getCell(10, 26 + i).value = label; });

// Row 11: column number reference 1..36
for (let i = 1; i <= 36; i++) ws.getCell(11, i).value = i;

// Rows 12-20: data per dusun (9 baris)
DUSUN_LIST.forEach((dusunNama, idx) => {
  const r = 12 + idx;
  const data = pokja2Map[dusunNama] || {};
  ws.getCell(r, 1).value = idx + 1;
  ws.getCell(r, 2).value = dusunNama.toUpperCase();
  ws.getCell(r, 3).value = data.jml_warga_3_buta ?? 0;
  ws.getCell(r, 4).value = data.paket_a_klp ?? 0;
  ws.getCell(r, 5).value = data.paket_a_wrg ?? 0;
  ws.getCell(r, 6).value = data.paket_b_klp ?? 0;
  ws.getCell(r, 7).value = data.paket_b_wrg ?? 0;
  ws.getCell(r, 8).value = data.paket_c_klp ?? 0;
  ws.getCell(r, 9).value = data.paket_c_wrg ?? 0;
  ws.getCell(r, 10).value = data.kf_klp ?? 0;
  ws.getCell(r, 11).value = data.kf_wrg ?? 0;
  ws.getCell(r, 12).value = data.paud_sejenis ?? 0;
  ws.getCell(r, 13).value = data.taman_bacaan ?? 0;
  ws.getCell(r, 14).value = data.klp_pembaca ?? 0;
  ws.getCell(r, 15).value = data.bkb_klp ?? 0;
  ws.getCell(r, 16).value = data.bkb_ape_set_a ?? 0;
  ws.getCell(r, 17).value = data.bkb_ape_set_b ?? 0;
  ws.getCell(r, 18).value = data.kader_tutor_kf ?? 0;
  ws.getCell(r, 19).value = data.kader_tutor_paud ?? 0;
  ws.getCell(r, 20).value = data.kader_bkb ?? 0;
  ws.getCell(r, 21).value = data.kader_khusus_koperasi ?? 0;
  ws.getCell(r, 22).value = data.kader_khusus_keterampilan ?? 0;
  ws.getCell(r, 23).value = data.yg_dilatih_lp3pkk ?? 0;
  ws.getCell(r, 24).value = data.yg_dilatih_tp3pkk ?? 0;
  ws.getCell(r, 25).value = data.yg_dilatih_damaspkk ?? 0;
  ws.getCell(r, 26).value = data.up2k_pemula_klp ?? 0;
  ws.getCell(r, 27).value = data.up2k_pemula_psrt ?? 0;
  ws.getCell(r, 28).value = data.up2k_madya_klp ?? 0;
  ws.getCell(r, 29).value = data.up2k_madya_psrt ?? 0;
  ws.getCell(r, 30).value = data.up2k_utama_klp ?? 0;
  ws.getCell(r, 31).value = data.up2k_utama_psrt ?? 0;
  ws.getCell(r, 32).value = data.up2k_mandiri_klp ?? 0;
  ws.getCell(r, 33).value = data.up2k_mandiri_psrt ?? 0;
  ws.getCell(r, 34).value = data.koperasi_berbadan_hukum_kop ?? 0;
  ws.getCell(r, 35).value = data.koperasi_berbadan_hukum_angg ?? 0;
  ws.getCell(r, 36).value = data.keterangan ?? '';
});

// Row 21: total
ws.getCell(21, 2).value = 'JUMLAH';
for (let col = 3; col <= 35; col++) {
  const letter = ws.getColumn(col).letter;
  ws.getCell(21, col).value = { formula: `SUM(${letter}12:${letter}20)` };
}

// Borders + alignment + bold header (rows 7-11)
const lastRow = 21, lastCol = 36;
for (let r = 7; r <= lastRow; r++) {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}
[7, 8, 9, 10, 11].forEach(r => {
  for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).font = { bold: true };
});

// Column widths
const widths = [4, 14, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6];
widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
```

### Catatan implementasi penting

1. **Tinggi baris header row 7**: harus auto-fit karena teks "PRA KOPERASI/USAHA BERSAMA/UP2K" panjang.
2. **Rotasi teks**: kolom 3 di gambar memakai vertical text karena lebar kolom sempit. Set `alignment.textRotation = 90` jika perlu match visual.
3. **TUTOR sebagai 4-level header**: implementasi pakai 4 baris header (rows 7, 8, 9, 10) supaya struktur lengkap. Excel handle ini dengan `mergeCells` rowspan.
4. **Paper size**: Excel set ke A3 landscape via `pageSetup.paperSize: 8` agar print preview pas.
5. **Compatibility dengan column overrides**: kolom yang hidden via `table_column_overrides` tetap tidak di-render di laporan ini juga (perlu hook ke logic existing).

### Validation checklist (post-implementation)

- [ ] Title block 3 baris, KAPITAL, center, bold, "POKJA II" angka Romawi.
- [ ] TAHUN label kiri.
- [ ] Header tabel 4 baris bertingkat (atau 3 dengan TUTOR di-flatten).
- [ ] Baris nomor urut kolom 1..36.
- [ ] Kolom NO 1..9 + kosong di JUMLAH.
- [ ] Nama dusun uppercase + JUMLAH di footer.
- [ ] Border tipis di semua sel.
- [ ] Sel kosong → 0; KET kosong default.
- [ ] Baris JUMLAH = SUM kolom 3-35.
- [ ] Visual diff dengan gambar referensi.
- [ ] Test fixture data dummy → file output match snapshot.

### Pertanyaan terbuka — sudah dijawab user

1. ✅ **Kolom 3** = `Jml Wrg yg Masih 3 Buta` (jumlah warga yang masih 3 buta: huruf, angka, bahasa).
2. ✅ **Kolom 16-17 BKB** = label sama "Jml APE Set" untuk keduanya. Schema pakai suffix `_a`/`_b`.
3. ✅ **Kolom 24** = `TP3PKK` (tanpa spasi).
4. ✅ **Kolom legacy** = **DROP PERMANEN** di v5 (`rumah_dilan`, `kampung_mandiri`, `usaha_mikro`, `toko_pkk`, `koperasi_belum_bh_kop`, `koperasi_belum_bh_angg`).


## Annex D — Pokja III Report Template (pixel-perfect spec)

Layout berikut harus di-replicate persis di Excel & PDF. Sumber: foto laporan resmi Pokja III yang dikirim user.

### Header (di atas tabel)

```
                    DATA KEGIATAN PKK
                    DESA   : BELIKURIP
                       POKJA III

TAHUN : <tahun>
```

Sama style dengan Pokja I & II: bold, KAPITAL, center, "POKJA III" angka Romawi.

> Catatan: Di gambar referensi Pokja III, header tertulis "TP PKK DESA BELIKURIP / TAHUN 2025 / POKJA III". Untuk konsistensi dengan format Pokja I (Annex B) yang dipakai user sebagai canonical, saya pakai format "DATA KEGIATAN PKK / DESA : BELIKURIP / POKJA III". Kalau user mau format Pokja III pakai header berbeda, tinggal beri tahu.

### Tabel — struktur kolom (19 kolom logis)

Tiga baris header bertingkat (multi-row header), lalu satu baris nomor urut kolom (1..19), lalu 9 baris data + 1 baris "JUMLAH". Latar header: biru muda (sesuai gambar — beda dari Pokja I yang hijau).

#### Baris header 1 (top group)

| Span | Label |
|------|-------|
| col 1 (rowspan=3) | NO |
| col 2 (rowspan=3) | NAMA DUSUN |
| col 3-5 (colspan=3) | JUMLAH KADER |
| col 6-13 (colspan=8) | PANGAN |
| col 14-16 (colspan=3) | JUMLAH INDUSTRI RUMAH TANGGA |
| col 17-18 (colspan=2) | JUMLAH RUMAH |
| col 19 (rowspan=3) | KETERANGAN |

#### Baris header 2 (sub-group)

Di bawah JUMLAH KADER (cols 3-5):

| Col | Label |
|-----|-------|
| 3 (rowspan=2) | PANGAN |
| 4 (rowspan=2) | SANDANG |
| 5 (rowspan=2) | TATA LAKSANA RUMAH TANGGA |

Di bawah PANGAN (cols 6-13):

| Span | Label |
|------|-------|
| col 6-7 (colspan=2) | MAKANAN POKOK |
| col 8-13 (colspan=6) | PEMANFAATAN PEKARANGAN HATINYA PKK |

Di bawah JUMLAH INDUSTRI RUMAH TANGGA (cols 14-16):

| Col | Label |
|-----|-------|
| 14 (rowspan=2) | PANGAN |
| 15 (rowspan=2) | SANDANG |
| 16 (rowspan=2) | JASA |

Di bawah JUMLAH RUMAH (cols 17-18):

| Col | Label |
|-----|-------|
| 17 (rowspan=2) | SEHAT DAN LAYAK HUNI |
| 18 (rowspan=2) | TIDAK SEHAT DAN TIDAK LAYAK |

#### Baris header 3 (level paling bawah)

Untuk MAKANAN POKOK (cols 6-7):

| Col | Label |
|-----|-------|
| 6 | BERAS |
| 7 | NON BERAS |

Untuk PEMANFAATAN PEKARANGAN HATINYA PKK (cols 8-13):

| Col | Label |
|-----|-------|
| 8 | PETERNAKAN |
| 9 | PERIKANAN |
| 10 | WARUNG HIDUP |
| 11 | LUMBUNG HIDUP |
| 12 | TOGA |
| 13 | TANAMAN KERAS |

#### Baris nomor urut kolom (di bawah header)

Angka 1..19 di setiap kolom, alignment center. Latar biru muda.

#### Baris data (9 dusun)

Sama dengan Pokja I & II: 9 dusun urutan SOKO..BANYURIPAN, label uppercase. Sel kosong → 0.

#### Baris "JUMLAH" (footer total)

Sum vertikal kolom 3-18. Kolom 1 (NO), 2 (NAMA DUSUN diisi "JUMLAH"), dan 19 (KETERANGAN) kosong/label saja.

### Schema gap — kolom baru yang harus ditambah ke `data_pokja3`

Kolom existing di `data_pokja3`:
- `kader_pangan`, `kader_sandang`, `kader_tata_laksana_rt`
- `pangan_beras`, `pangan_non_beras`
- `pemanfaatan_peternakan`, `pemanfaatan_perikanan`, `pemanfaatan_warung_hidup`, `pemanfaatan_lumbung_hidup`, `pemanfaatan_toga`, `pemanfaatan_tanaman_keras`
- `industri_pangan`, `industri_sandang`, `industri_jasa`
- `rumah_sehat`, `rumah_kurang_sehat`

Mapping ke kolom gambar:

| Col | Header path | DB field |
|-----|-------------|----------|
| 1 | NO | `dusun.nomor_urut` |
| 2 | NAMA DUSUN | `dusun.nama` (uppercase) |
| 3 | JUMLAH KADER → PANGAN | `kader_pangan` |
| 4 | JUMLAH KADER → SANDANG | `kader_sandang` |
| 5 | JUMLAH KADER → TATA LAKSANA RUMAH TANGGA | `kader_tata_laksana_rt` |
| 6 | PANGAN → MAKANAN POKOK → BERAS | `pangan_beras` |
| 7 | PANGAN → MAKANAN POKOK → NON BERAS | `pangan_non_beras` |
| 8 | PANGAN → PEMANFAATAN PEKARANGAN → PETERNAKAN | `pemanfaatan_peternakan` |
| 9 | PANGAN → PEMANFAATAN PEKARANGAN → PERIKANAN | `pemanfaatan_perikanan` |
| 10 | PANGAN → PEMANFAATAN PEKARANGAN → WARUNG HIDUP | `pemanfaatan_warung_hidup` |
| 11 | PANGAN → PEMANFAATAN PEKARANGAN → LUMBUNG HIDUP | `pemanfaatan_lumbung_hidup` |
| 12 | PANGAN → PEMANFAATAN PEKARANGAN → TOGA | `pemanfaatan_toga` |
| 13 | PANGAN → PEMANFAATAN PEKARANGAN → TANAMAN KERAS | `pemanfaatan_tanaman_keras` |
| 14 | JUMLAH INDUSTRI RUMAH TANGGA → PANGAN | `industri_pangan` |
| 15 | JUMLAH INDUSTRI RUMAH TANGGA → SANDANG | `industri_sandang` |
| 16 | JUMLAH INDUSTRI RUMAH TANGGA → JASA | `industri_jasa` |
| 17 | JUMLAH RUMAH → SEHAT DAN LAYAK HUNI | `rumah_sehat` |
| 18 | JUMLAH RUMAH → TIDAK SEHAT DAN TIDAK LAYAK | `rumah_kurang_sehat` |
| 19 | KETERANGAN | `keterangan` (kolom baru, tambah di v5) |

**Schema gap kecil**: hanya butuh tambah `keterangan TEXT` ke `data_pokja3`. Semua kolom data sudah ada.

```sql
ALTER TABLE data_pokja3 ADD COLUMN IF NOT EXISTS keterangan TEXT;  -- col 19
```

Kolom existing yang **tidak terlihat di gambar**: tidak ada (semua existing kolom terpakai). Tidak ada yang perlu di-drop.

### Lebar kolom (rekomendasi Excel)

| Kolom | Konten | Lebar (chars) |
|-------|--------|---------------|
| 1 | NO | 4 |
| 2 | NAMA DUSUN | 16 |
| 3-5 | JUMLAH KADER (PANGAN/SANDANG/TATA LAKSANA RT) | 8 |
| 6-7 | MAKANAN POKOK (BERAS/NON BERAS) | 8 |
| 8-13 | PEMANFAATAN PEKARANGAN | 8 |
| 14-16 | INDUSTRI RUMAH TANGGA (PANGAN/SANDANG/JASA) | 8 |
| 17-18 | JUMLAH RUMAH (SEHAT/TIDAK SEHAT) | 12 |
| 19 | KETERANGAN | 10 |

Karena 19 kolom, paper size **A4 landscape** cukup. Header `TATA LAKSANA RUMAH TANGGA` (col 5) panjang → text rotation 90° atau wrap text dengan tinggi baris auto-fit.

### Excel render — implementasi (`exceljs`)

```js
// app/api/export/excel/route.js — Pokja III pseudocode
const ws = wb.addWorksheet('Pokja III', { pageSetup: { orientation: 'landscape', paperSize: 9 /* A4 */ } });

// 1. Title block (rows 1-3, merge across cols A:S — 19 kolom)
ws.mergeCells('A1:S1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
ws.mergeCells('A2:S2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
ws.mergeCells('A3:S3'); ws.getCell('A3').value = 'POKJA III';

// 2. Period label (row 5)
ws.getCell('A5').value = `TAHUN : ${tahun}`;

// 3. Header table (rows 7-9)
//    Row 7: top groups
ws.mergeCells('A7:A9'); ws.getCell('A7').value = 'NO';
ws.mergeCells('B7:B9'); ws.getCell('B7').value = 'NAMA DUSUN';
ws.mergeCells('C7:E7'); ws.getCell('C7').value = 'JUMLAH KADER';
ws.mergeCells('F7:M7'); ws.getCell('F7').value = 'PANGAN';
ws.mergeCells('N7:P7'); ws.getCell('N7').value = 'JUMLAH INDUSTRI RUMAH TANGGA';
ws.mergeCells('Q7:R7'); ws.getCell('Q7').value = 'JUMLAH RUMAH';
ws.mergeCells('S7:S9'); ws.getCell('S7').value = 'KETERANGAN';

//    Row 8: mid sub-groups
ws.mergeCells('C8:C9'); ws.getCell('C8').value = 'PANGAN';
ws.mergeCells('D8:D9'); ws.getCell('D8').value = 'SANDANG';
ws.mergeCells('E8:E9'); ws.getCell('E8').value = 'TATA LAKSANA RUMAH TANGGA';
ws.mergeCells('F8:G8'); ws.getCell('F8').value = 'MAKANAN POKOK';
ws.mergeCells('H8:M8'); ws.getCell('H8').value = 'PEMANFAATAN PEKARANGAN HATINYA PKK';
ws.mergeCells('N8:N9'); ws.getCell('N8').value = 'PANGAN';
ws.mergeCells('O8:O9'); ws.getCell('O8').value = 'SANDANG';
ws.mergeCells('P8:P9'); ws.getCell('P8').value = 'JASA';
ws.mergeCells('Q8:Q9'); ws.getCell('Q8').value = 'SEHAT DAN LAYAK HUNI';
ws.mergeCells('R8:R9'); ws.getCell('R8').value = 'TIDAK SEHAT DAN TIDAK LAYAK';

//    Row 9: leaf labels untuk MAKANAN POKOK & PEMANFAATAN PEKARANGAN
ws.getCell('F9').value = 'BERAS';
ws.getCell('G9').value = 'NON BERAS';
['PETERNAKAN','PERIKANAN','WARUNG HIDUP','LUMBUNG HIDUP','TOGA','TANAMAN KERAS']
  .forEach((label, i) => { ws.getCell(9, 8 + i).value = label; });

// 4. Column number reference row (row 10): 1..19
for (let i = 1; i <= 19; i++) ws.getCell(10, i).value = i;

// 5. Data rows (rows 11-19) — 9 dusun
DUSUN_LIST.forEach((dusunNama, idx) => {
  const r = 11 + idx;
  const data = pokja3Map[dusunNama] || {};
  ws.getCell(r, 1).value = idx + 1;
  ws.getCell(r, 2).value = dusunNama.toUpperCase();
  ws.getCell(r, 3).value = data.kader_pangan ?? 0;
  ws.getCell(r, 4).value = data.kader_sandang ?? 0;
  ws.getCell(r, 5).value = data.kader_tata_laksana_rt ?? 0;
  ws.getCell(r, 6).value = data.pangan_beras ?? 0;
  ws.getCell(r, 7).value = data.pangan_non_beras ?? 0;
  ws.getCell(r, 8).value = data.pemanfaatan_peternakan ?? 0;
  ws.getCell(r, 9).value = data.pemanfaatan_perikanan ?? 0;
  ws.getCell(r, 10).value = data.pemanfaatan_warung_hidup ?? 0;
  ws.getCell(r, 11).value = data.pemanfaatan_lumbung_hidup ?? 0;
  ws.getCell(r, 12).value = data.pemanfaatan_toga ?? 0;
  ws.getCell(r, 13).value = data.pemanfaatan_tanaman_keras ?? 0;
  ws.getCell(r, 14).value = data.industri_pangan ?? 0;
  ws.getCell(r, 15).value = data.industri_sandang ?? 0;
  ws.getCell(r, 16).value = data.industri_jasa ?? 0;
  ws.getCell(r, 17).value = data.rumah_sehat ?? 0;
  ws.getCell(r, 18).value = data.rumah_kurang_sehat ?? 0;
  ws.getCell(r, 19).value = data.keterangan ?? '';
});

// 6. Total row (row 20)
ws.getCell(20, 2).value = 'JUMLAH';
for (let col = 3; col <= 18; col++) {
  const letter = ws.getColumn(col).letter;
  ws.getCell(20, col).value = { formula: `SUM(${letter}11:${letter}19)` };
}

// 7. Borders & alignment for header & data area
const lastRow = 20, lastCol = 19;
for (let r = 7; r <= lastRow; r++) {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

// 8. Header background biru muda + bold (rows 7-10)
[7, 8, 9, 10].forEach(r => {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).font = { bold: true };
    ws.getCell(r, c).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCE5FF' },  // biru muda
    };
  }
});

// 9. Column widths
[4, 16, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 12, 12, 10]
  .forEach((w, i) => { ws.getColumn(i + 1).width = w; });

// 10. Special: TATA LAKSANA RUMAH TANGGA & TIDAK SEHAT DAN TIDAK LAYAK panjang → vertical text
ws.getCell('E8').alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
ws.getCell('R8').alignment = { textRotation: 0, horizontal: 'center', vertical: 'middle', wrapText: true };
```

### Validation checklist (post-implementation)

- [ ] Title block 3 baris, KAPITAL, center, bold, "POKJA III" angka Romawi.
- [ ] TAHUN label kiri.
- [ ] Header tabel 3 baris bertingkat dengan latar biru muda (`#CCE5FF`).
- [ ] Baris nomor urut kolom 1..19.
- [ ] Kolom NO 1..9 + kosong di JUMLAH.
- [ ] NAMA DUSUN uppercase + JUMLAH di footer.
- [ ] Border tipis di semua sel.
- [ ] Sel kosong → 0; KETERANGAN kosong default.
- [ ] Baris JUMLAH = SUM kolom 3-18.
- [ ] Visual diff dengan gambar referensi.
- [ ] Test fixture data dummy → file output match snapshot.


## Annex E — Pokja IV Report Template (pixel-perfect spec)

Layout berikut harus di-replicate persis di Excel & PDF. Sumber: foto laporan resmi Pokja IV yang dikirim user.

### Header (di atas tabel)

```
                    DATA KEGIATAN PKK
                    DESA   : BELIKURIP
                       POKJA IV

TAHUN : <tahun>
```

Sama style dengan Pokja I/II/III: bold, KAPITAL, center, "POKJA IV" angka Romawi.

### Tabel — struktur kolom (26 kolom logis)

Tiga baris header bertingkat (multi-row header), lalu satu baris nomor urut kolom (1..26), lalu 9 baris data + 1 baris "JUMLAH". Latar header: **kuning** (`#FFFF99` atau `#FFF2CC`, sesuai gambar).

#### Baris header 1 (top group)

| Span | Label |
|------|-------|
| col 1 (rowspan=3) | No |
| col 2 (rowspan=3) | NAMA DUSUN |
| col 3-8 (colspan=6) | JUMLAH KADER |
| col 9-13 (colspan=5) | KESEHATAN |
| col 14-20 (colspan=7) | KELESTARIAN LING HIDUP |
| col 21-25 (colspan=5) | PERENCANAAN SEHAT |
| col 26 (rowspan=3) | KET |

#### Baris header 2 (sub-group)

Di bawah JUMLAH KADER (cols 3-8) — semua leaf langsung (tidak ada sub-grup tambahan):

| Col | Label |
|-----|-------|
| 3 (rowspan=2) | POSYANDU |
| 4 (rowspan=2) | GIZI |
| 5 (rowspan=2) | KESLING |
| 6 (rowspan=2) | PENYULUH NARKOBA |
| 7 (rowspan=2) | PHBS |
| 8 (rowspan=2) | KB |

Di bawah KESEHATAN (cols 9-13):

| Span | Label |
|------|-------|
| col 9-13 (colspan=5) | POSYANDU |

Di bawah KELESTARIAN LING HIDUP (cols 14-20):

| Span | Label |
|------|-------|
| col 14-16 (colspan=3) | JML RUMAH YG MEMILIKI |
| col 17 (rowspan=2) | JML MCK |
| col 18-20 (colspan=3) | JML KRT YG MENGGUNAKAN AIR |

Di bawah PERENCANAAN SEHAT (cols 21-25):

| Col | Label |
|-----|-------|
| 21 (rowspan=2) | JML PUS |
| 22 (rowspan=2) | JML WUS |
| col 23-24 (colspan=2) | JML ASEPTOR KB |
| 25 (rowspan=2) | JML KK YG MEMILIKI TAB KES |

#### Baris header 3 (level paling bawah)

Di bawah POSYANDU (KESEHATAN, cols 9-13):

| Col | Label |
|-----|-------|
| 9 | JUMLAH |
| 10 | TERINTEGRASI |
| 11 | JML KLP (LANSIA) |
| 12 | JML ANG (LANSIA) |
| 13 | JML YG MMLKI KARTU BEROBAT/GRTAS |

Catatan: cols 11-13 punya parent group "LANSIA" yang muncul sebagai sub-row di antara header 2 dan header 3. Implementasinya pakai 4-level header: "POSYANDU" (header 2) → "LANSIA" (header 2.5, span cols 11-13) → "JML KLP / JML ANG / JML YG MMLKI..." (header 3). Atau di Excel: tetap 3 baris header dengan "LANSIA" di-merge horizontal di row 9 cells 11-13, lalu leaf di row 10 (lihat pseudocode).

Di bawah JML RUMAH YG MEMILIKI (cols 14-16):

| Col | Label |
|-----|-------|
| 14 | JAMBAN |
| 15 | SPAL |
| 16 | TEMPAT PEMBUANGAN SAMPAH |

Di bawah JML KRT YG MENGGUNAKAN AIR (cols 18-20):

| Col | Label |
|-----|-------|
| 18 | PDAM |
| 19 | SUMUR |
| 20 | DLL |

Di bawah JML ASEPTOR KB (cols 23-24):

| Col | Label |
|-----|-------|
| 23 | L |
| 24 | P |

#### Baris nomor urut kolom (di bawah header)

Angka 1..26 di setiap kolom, alignment center. Latar kuning.

#### Baris data (9 dusun)

Sama dengan Pokja I/II/III: 9 dusun urutan SOKO..BANYURIPAN, label uppercase. Sel kosong → 0.

#### Baris "JUMLAH" (footer total)

Sum vertikal kolom 3-25. Kolom 1 (No), 2 (NAMA DUSUN diisi "JUMLAH"), dan 26 (KET) kosong/label saja.

Contoh dari gambar referensi (data dummy untuk validasi):
- Kolom 3 (POSYANDU kader): JUMLAH = 60
- Kolom 4 (GIZI): JUMLAH = 60
- Kolom 5 (KESLING): JUMLAH = 26
- Kolom 11 (LANSIA JML KLP): JUMLAH = 9, dst.

### Schema gap — minimal

Schema `data_pokja4` existing sudah lengkap (semua 23 kolom data ada). Hanya butuh tambah `keterangan TEXT` untuk kolom 26.

```sql
ALTER TABLE data_pokja4 ADD COLUMN IF NOT EXISTS keterangan TEXT;  -- col 26
```

Tidak ada kolom legacy yang perlu di-drop.

### Mapping kolom logis → DB field

| Col | Header path | DB field |
|-----|-------------|----------|
| 1 | No | `dusun.nomor_urut` |
| 2 | NAMA DUSUN | `dusun.nama` (uppercase) |
| 3 | JUMLAH KADER → POSYANDU | `kader_posyandu` |
| 4 | JUMLAH KADER → GIZI | `kader_gizi` |
| 5 | JUMLAH KADER → KESLING | `kader_kesling` |
| 6 | JUMLAH KADER → PENYULUH NARKOBA | `kader_penyuluh_narkoba` |
| 7 | JUMLAH KADER → PHBS | `kader_phbs` |
| 8 | JUMLAH KADER → KB | `kader_kb` |
| 9 | KESEHATAN → POSYANDU → JUMLAH | `posyandu_jumlah` |
| 10 | KESEHATAN → POSYANDU → TERINTEGRASI | `posyandu_terintegrasi` |
| 11 | KESEHATAN → POSYANDU → LANSIA → JML KLP | `lansia_jml_klp` |
| 12 | KESEHATAN → POSYANDU → LANSIA → JML ANG | `lansia_jml_anggota` |
| 13 | KESEHATAN → POSYANDU → LANSIA → JML YG MMLKI KARTU BEROBAT/GRTAS | `lansia_jml_kartu_berobat` |
| 14 | KELESTARIAN LING HIDUP → JML RUMAH YG MEMILIKI → JAMBAN | `rumah_jamban` |
| 15 | KELESTARIAN LING HIDUP → JML RUMAH YG MEMILIKI → SPAL | `rumah_spal` |
| 16 | KELESTARIAN LING HIDUP → JML RUMAH YG MEMILIKI → TEMPAT PEMBUANGAN SAMPAH | `rumah_tempat_sampah` |
| 17 | KELESTARIAN LING HIDUP → JML MCK | `rumah_mck` |
| 18 | KELESTARIAN LING HIDUP → JML KRT YG MENGGUNAKAN AIR → PDAM | `air_pdam` |
| 19 | KELESTARIAN LING HIDUP → JML KRT YG MENGGUNAKAN AIR → SUMUR | `air_sumur` |
| 20 | KELESTARIAN LING HIDUP → JML KRT YG MENGGUNAKAN AIR → DLL | `air_lain` |
| 21 | PERENCANAAN SEHAT → JML PUS | `jml_pus` |
| 22 | PERENCANAAN SEHAT → JML WUS | `jml_wus` |
| 23 | PERENCANAAN SEHAT → JML ASEPTOR KB → L | `akseptor_kb_l` |
| 24 | PERENCANAAN SEHAT → JML ASEPTOR KB → P | `akseptor_kb_p` |
| 25 | PERENCANAAN SEHAT → JML KK YG MEMILIKI TAB KES | `kk_tabungan` |
| 26 | KET | `keterangan` |

Semua kolom existing terpakai — no legacy drop needed.

### Lebar kolom (rekomendasi Excel)

| Kolom | Konten | Lebar (chars) |
|-------|--------|---------------|
| 1 | No | 4 |
| 2 | NAMA DUSUN | 14 |
| 3-8 | JUMLAH KADER | 7 |
| 9-10 | POSYANDU JUMLAH/TERINTEGRASI | 8 |
| 11-13 | LANSIA sub-cells | 8 |
| 14-16 | JML RUMAH YG MEMILIKI | 8 |
| 17 | JML MCK | 6 |
| 18-20 | JML KRT YG MENGGUNAKAN AIR | 7 |
| 21-22 | JML PUS/WUS | 6 |
| 23-24 | JML ASEPTOR KB L/P | 5 |
| 25 | JML KK YG MEMILIKI TAB KES | 9 |
| 26 | KET | 6 |

Karena 26 kolom cukup banyak, paper size **A3 landscape** atau **A4 landscape scale 75%**.

### Excel render — implementasi (`exceljs`)

```js
// app/api/export/excel/route.js — Pokja IV pseudocode
const ws = wb.addWorksheet('Pokja IV', { pageSetup: { orientation: 'landscape', paperSize: 8 /* A3 */ } });

// 1. Title block (rows 1-3, merge across cols A:Z — 26 kolom)
ws.mergeCells('A1:Z1'); ws.getCell('A1').value = 'DATA KEGIATAN PKK';
ws.mergeCells('A2:Z2'); ws.getCell('A2').value = 'DESA   : BELIKURIP';
ws.mergeCells('A3:Z3'); ws.getCell('A3').value = 'POKJA IV';

// 2. Period label (row 5)
ws.getCell('A5').value = `TAHUN : ${tahun}`;

// 3. Header table (rows 7-10) — 4 rows karena LANSIA jadi sub-sub-header
//    Row 7: top groups
ws.mergeCells('A7:A10'); ws.getCell('A7').value = 'No';
ws.mergeCells('B7:B10'); ws.getCell('B7').value = 'NAMA DUSUN';
ws.mergeCells('C7:H7'); ws.getCell('C7').value = 'JUMLAH KADER';
ws.mergeCells('I7:M7'); ws.getCell('I7').value = 'KESEHATAN';
ws.mergeCells('N7:T7'); ws.getCell('N7').value = 'KELESTARIAN LING HIDUP';
ws.mergeCells('U7:Y7'); ws.getCell('U7').value = 'PERENCANAAN SEHAT';
ws.mergeCells('Z7:Z10'); ws.getCell('Z7').value = 'KET';

//    Row 8: sub-groups level 2
['POSYANDU','GIZI','KESLING','PENYULUH NARKOBA','PHBS','KB'].forEach((label, i) => {
  ws.mergeCells(8, 3 + i, 10, 3 + i);
  ws.getCell(8, 3 + i).value = label;
});
ws.mergeCells('I8:M8'); ws.getCell('I8').value = 'POSYANDU';  // KESEHATAN → POSYANDU
ws.mergeCells('N8:P8'); ws.getCell('N8').value = 'JML RUMAH YG MEMILIKI';
ws.mergeCells('Q8:Q10'); ws.getCell('Q8').value = 'JML MCK';
ws.mergeCells('R8:T8'); ws.getCell('R8').value = 'JML KRT YG MENGGUNAKAN AIR';
ws.mergeCells('U8:U10'); ws.getCell('U8').value = 'JML PUS';
ws.mergeCells('V8:V10'); ws.getCell('V8').value = 'JML WUS';
ws.mergeCells('W8:X8'); ws.getCell('W8').value = 'JML ASEPTOR KB';
ws.mergeCells('Y8:Y10'); ws.getCell('Y8').value = 'JML KK YG MEMILIKI TAB KES';

//    Row 9: sub-sub-groups level 3 (LANSIA + leaf untuk POSYANDU sub)
ws.mergeCells('I9:I10'); ws.getCell('I9').value = 'JUMLAH';
ws.mergeCells('J9:J10'); ws.getCell('J9').value = 'TERINTEGRASI';
ws.mergeCells('K9:M9'); ws.getCell('K9').value = 'LANSIA';
['JAMBAN','SPAL','TEMPAT PEMBUANGAN SAMPAH'].forEach((label, i) => {
  ws.mergeCells(9, 14 + i, 10, 14 + i);
  ws.getCell(9, 14 + i).value = label;
});
['PDAM','SUMUR','DLL'].forEach((label, i) => {
  ws.mergeCells(9, 18 + i, 10, 18 + i);
  ws.getCell(9, 18 + i).value = label;
});
ws.mergeCells('W9:W10'); ws.getCell('W9').value = 'L';
ws.mergeCells('X9:X10'); ws.getCell('X9').value = 'P';

//    Row 10: leaf labels untuk LANSIA
ws.getCell('K10').value = 'JML KLP';
ws.getCell('L10').value = 'JML ANG';
ws.getCell('M10').value = 'JML YG MMLKI KARTU BEROBAT/GRTAS';

// 4. Column number reference (row 11): 1..26
for (let i = 1; i <= 26; i++) ws.getCell(11, i).value = i;

// 5. Data rows (rows 12-20) — 9 dusun
DUSUN_LIST.forEach((dusunNama, idx) => {
  const r = 12 + idx;
  const data = pokja4Map[dusunNama] || {};
  ws.getCell(r, 1).value = idx + 1;
  ws.getCell(r, 2).value = dusunNama.toUpperCase();
  ws.getCell(r, 3).value = data.kader_posyandu ?? 0;
  ws.getCell(r, 4).value = data.kader_gizi ?? 0;
  ws.getCell(r, 5).value = data.kader_kesling ?? 0;
  ws.getCell(r, 6).value = data.kader_penyuluh_narkoba ?? 0;
  ws.getCell(r, 7).value = data.kader_phbs ?? 0;
  ws.getCell(r, 8).value = data.kader_kb ?? 0;
  ws.getCell(r, 9).value = data.posyandu_jumlah ?? 0;
  ws.getCell(r, 10).value = data.posyandu_terintegrasi ?? 0;
  ws.getCell(r, 11).value = data.lansia_jml_klp ?? 0;
  ws.getCell(r, 12).value = data.lansia_jml_anggota ?? 0;
  ws.getCell(r, 13).value = data.lansia_jml_kartu_berobat ?? 0;
  ws.getCell(r, 14).value = data.rumah_jamban ?? 0;
  ws.getCell(r, 15).value = data.rumah_spal ?? 0;
  ws.getCell(r, 16).value = data.rumah_tempat_sampah ?? 0;
  ws.getCell(r, 17).value = data.rumah_mck ?? 0;
  ws.getCell(r, 18).value = data.air_pdam ?? 0;
  ws.getCell(r, 19).value = data.air_sumur ?? 0;
  ws.getCell(r, 20).value = data.air_lain ?? 0;
  ws.getCell(r, 21).value = data.jml_pus ?? 0;
  ws.getCell(r, 22).value = data.jml_wus ?? 0;
  ws.getCell(r, 23).value = data.akseptor_kb_l ?? 0;
  ws.getCell(r, 24).value = data.akseptor_kb_p ?? 0;
  ws.getCell(r, 25).value = data.kk_tabungan ?? 0;
  ws.getCell(r, 26).value = data.keterangan ?? '';
});

// 6. Total row (row 21)
ws.getCell(21, 2).value = 'JUMLAH';
for (let col = 3; col <= 25; col++) {
  const letter = ws.getColumn(col).letter;
  ws.getCell(21, col).value = { formula: `SUM(${letter}12:${letter}20)` };
}

// 7. Borders & alignment for header & data area
const lastRow = 21, lastCol = 26;
for (let r = 7; r <= lastRow; r++) {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}

// 8. Header background kuning + bold (rows 7-11)
[7, 8, 9, 10, 11].forEach(r => {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).font = { bold: true };
    ws.getCell(r, c).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' },  // kuning muda
    };
  }
});

// 9. Column widths
const widths = [4, 14, 7, 7, 7, 8, 7, 7, 8, 8, 8, 8, 9, 8, 8, 9, 6, 7, 7, 7, 6, 6, 5, 5, 9, 6];
widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

// 10. Special: kolom dengan label panjang → vertical text rotation untuk header level 2
['F8','M10','Y8'].forEach(addr => {
  ws.getCell(addr).alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
});
```

### Catatan implementasi

1. **Header 4-level**: Pokja IV punya nested 4 level karena LANSIA jadi sub-sub-grup dari POSYANDU di KESEHATAN. Implementasi pakai 4 baris header (rows 7, 8, 9, 10).
2. **Kolom dengan teks panjang**: "PENYULUH NARKOBA", "TEMPAT PEMBUANGAN SAMPAH", "JML YG MMLKI KARTU BEROBAT/GRTAS", "JML KK YG MEMILIKI TAB KES" → set `textRotation: 90` atau wrap text + tinggi baris auto-fit.
3. **Latar header kuning**: pakai ARGB `FFFFFF99` (kuning muda standar) atau `FFFFF2CC` (kuning lebih pucat) — tinggal pilih yang paling mirip dengan gambar.
4. **Compatibility dengan column overrides**: kolom yang hidden via `table_column_overrides` tetap tidak di-render di laporan.

### Validation checklist (post-implementation)

- [ ] Title block 3 baris, KAPITAL, center, bold, "POKJA IV" angka Romawi.
- [ ] TAHUN label kiri.
- [ ] Header tabel 4 baris bertingkat dengan latar kuning muda.
- [ ] Baris nomor urut kolom 1..26.
- [ ] Kolom No 1..9 + kosong di JUMLAH.
- [ ] NAMA DUSUN uppercase + JUMLAH di footer.
- [ ] Border tipis di semua sel.
- [ ] Sel kosong → 0; KET kosong default.
- [ ] Baris JUMLAH = SUM kolom 3-25.
- [ ] Validasi numerik dengan contoh dari gambar (e.g., kolom 3 = 60 di JUMLAH).
- [ ] Visual diff dengan gambar referensi.
- [ ] Test fixture data dummy → file output match snapshot.


## Annex F — Rekapitulasi Dawis Report Template (pixel-perfect spec)

Layout berikut harus di-replicate persis di Excel & PDF. Sumber: foto laporan resmi Rekapitulasi Dawis (Catatan Data dan Kegiatan Warga) yang dikirim user.

### Header (di atas tabel)

```
                CATATAN DATA DAN KEGIATAN WARGA
              TP PKK DESA BELIKURIP KECAMATAN BATURETNO
                            TAHUN <tahun>
```

Catatan:
- KAPITAL semua, bold, center horizontal.
- Baris 2 menyebutkan "DESA BELIKURIP KECAMATAN BATURETNO" — ini berbeda dari format Pokja I/II/III/IV (yang pakai 2 baris terpisah). Pertahankan format ini sesuai gambar.

### Tabel — struktur kolom (34 kolom logis)

Multi-row header (4-5 baris), lalu satu baris nomor urut kolom (1..34), lalu 9 baris data + 1 baris "JUMLAH". Latar header: putih dengan border tipis (sesuai gambar).

#### Baris header 1 (top group)

| Span | Label |
|------|-------|
| col 1 (rowspan=4) | No |
| col 2 (rowspan=4) | Nama dusun |
| col 3 (rowspan=4) | Jml RW |
| col 4 (rowspan=4) | Jml RT |
| col 5 (rowspan=4) | Jml dawis |
| col 6 (rowspan=4) | Jml KRT |
| col 7 (rowspan=4) | Jml KK |
| col 8-18 (colspan=11) | Jml Angg keluarga |
| col 19-24 (colspan=6) | Jumlah Rumah |
| col 25-28 (colspan=4) | Sumber Air Keluarga |
| col 29-30 (colspan=2) | Makanan |
| col 31-33 (colspan=3) | Wrg yg mengikuti |
| col 34 (rowspan=4) | KET (JKN/BPJS) |

#### Baris header 2 (sub-group untuk Jml Angg keluarga)

| Span | Label |
|------|-------|
| col 8-9 (colspan=2) | Total |
| col 10-11 (colspan=2) | Balita |
| col 12 (rowspan=3) | PUS |
| col 13 (rowspan=3) | WUS |
| col 14 (rowspan=3) | Ibu Hamil |
| col 15 (rowspan=3) | Ibu menyusui |
| col 16 (rowspan=3) | Lansia |
| col 17 (rowspan=3) | 3 Buta |
| col 18 (rowspan=3) | Berkebutuhan khusus |

Sub-group untuk Jumlah Rumah (cols 19-24) — semua single-cell tapi label vertikal panjang:

| Col | Label (vertical text) |
|-----|------------------------|
| 19 (rowspan=3) | Sehat |
| 20 (rowspan=3) | Tidak sehat |
| 21 (rowspan=3) | Memiliki tempt sampah |
| 22 (rowspan=3) | Memiliki spal |
| 23 (rowspan=3) | Memiliki jamban |
| 24 (rowspan=3) | Menempel stiker |

Sub-group untuk Sumber Air Keluarga (cols 25-28):

| Col | Label |
|-----|-------|
| 25 (rowspan=3) | PDAM |
| 26 (rowspan=3) | Sumber |
| 27 (rowspan=3) | Sungai |
| 28 (rowspan=3) | Dll |

Sub-group untuk Makanan (cols 29-30):

| Col | Label |
|-----|-------|
| 29 (rowspan=3) | Beras |
| 30 (rowspan=3) | Non BERAS |

Sub-group untuk Wrg yg mengikuti (cols 31-33):

| Col | Label |
|-----|-------|
| 31 (rowspan=3) | UP2K |
| 32 (rowspan=3) | Pemanfaatan lahan |
| 33 (rowspan=3) | Kes lngk |

#### Baris header 3 (level paling bawah — leaf untuk Total & Balita)

| Col | Label |
|-----|-------|
| 8 | L |
| 9 | P |
| 10 | L |
| 11 | P |

#### Baris nomor urut kolom (di bawah header)

Angka 1..34 di setiap kolom, alignment center.

#### Baris data (9 dusun)

Sama pattern dengan Bumil/Pokja: 9 dusun urutan SOKO..BANYURIPAN. Catatan: di gambar referensi nama dusun ditulis kapital di awal kata saja (e.g., "Soko" bukan "SOKO"). Kalau format mau konsisten, bisa diset sesuai preferensi user — default saya: **uppercase** (sesuai Pokja I/II/III/IV).

#### Baris "JUMLAH" (footer total)

Sum vertikal kolom 3-33. Kolom 1 (No), 2 ("JUMLAH"), dan 34 (KET) kosong/label.

### Schema gap — perubahan ke `data_rekap_dawis`

Schema saat ini (`data_kegiatan_warga` → renamed jadi `data_rekap_dawis`) punya kolom-kolom yang **tidak match 100%** dengan gambar. Perlu beberapa adjustment:

#### Kolom yang DROP PERMANEN (tidak ada di gambar)

```sql
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS jml_dusun;       -- tidak relevan: tiap baris sudah 1 dusun
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS tiga_buta_l;     -- gambar pakai single col "3 Buta"
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS tiga_buta_p;
ALTER TABLE data_rekap_dawis DROP COLUMN IF EXISTS ikut_industri;   -- tidak ada di laporan resmi
```

#### Kolom yang DITAMBAH

```sql
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS tiga_buta              INTEGER DEFAULT 0;  -- col 17 (single, gabung L+P)
ALTER TABLE data_rekap_dawis ADD COLUMN IF NOT EXISTS berkebutuhan_khusus    INTEGER DEFAULT 0;  -- col 18 (NEW)
```

#### Kolom existing yang DIPAKAI (mapping)

| Col | Header path | DB field |
|-----|-------------|----------|
| 1 | No | `dusun.nomor_urut` |
| 2 | Nama dusun | `dusun.nama` |
| 3 | Jml RW | `jml_rw` |
| 4 | Jml RT | `jml_rt` |
| 5 | Jml dawis | `jml_dawis` |
| 6 | Jml KRT | `jml_krt` |
| 7 | Jml KK | `jml_kk` |
| 8 | Jml Angg keluarga → Total → L | `jml_anggota_l` |
| 9 | Jml Angg keluarga → Total → P | `jml_anggota_p` |
| 10 | Jml Angg keluarga → Balita → L | `balita_l` |
| 11 | Jml Angg keluarga → Balita → P | `balita_p` |
| 12 | Jml Angg keluarga → PUS | `pus` |
| 13 | Jml Angg keluarga → WUS | `wus` |
| 14 | Jml Angg keluarga → Ibu Hamil | `ibu_hamil` |
| 15 | Jml Angg keluarga → Ibu menyusui | `ibu_menyusui` |
| 16 | Jml Angg keluarga → Lansia | `lansia` |
| 17 | Jml Angg keluarga → 3 Buta | `tiga_buta` (kolom baru) |
| 18 | Jml Angg keluarga → Berkebutuhan khusus | `berkebutuhan_khusus` (kolom baru) |
| 19 | Jumlah Rumah → Sehat | `rumah_sehat` |
| 20 | Jumlah Rumah → Tidak sehat | `rumah_kurang_sehat` |
| 21 | Jumlah Rumah → Memiliki tempt sampah | `punya_tempat_sampah` |
| 22 | Jumlah Rumah → Memiliki spal | `punya_spal` |
| 23 | Jumlah Rumah → Memiliki jamban | `jamban` |
| 24 | Jumlah Rumah → Menempel stiker | `stiker_p4k` |
| 25 | Sumber Air Keluarga → PDAM | `air_pdam` |
| 26 | Sumber Air Keluarga → Sumber | `air_sumur` |
| 27 | Sumber Air Keluarga → Sungai | `air_sungai` |
| 28 | Sumber Air Keluarga → Dll | `air_dll` |
| 29 | Makanan → Beras | `makan_beras` |
| 30 | Makanan → Non BERAS | `makan_non_beras` |
| 31 | Wrg yg mengikuti → UP2K | `ikut_up2k` |
| 32 | Wrg yg mengikuti → Pemanfaatan lahan | `ikut_pekarangan` |
| 33 | Wrg yg mengikuti → Kes lngk | `ikut_kesling` |
| 34 | KET (JKN/BPJS) | `jkn_bpjs` |

### Excel render — implementasi (`exceljs`)

```js
// app/api/export/excel/route.js — Rekap Dawis pseudocode
const ws = wb.addWorksheet('Rekap Dawis', { pageSetup: { orientation: 'landscape', paperSize: 8 /* A3 */ } });

// 1. Title block (rows 1-3, merge across cols A:AH — 34 kolom)
ws.mergeCells('A1:AH1'); ws.getCell('A1').value = 'CATATAN DATA DAN KEGIATAN WARGA';
ws.mergeCells('A2:AH2'); ws.getCell('A2').value = 'TP PKK DESA BELIKURIP KECAMATAN BATURETNO';
ws.mergeCells('A3:AH3'); ws.getCell('A3').value = `TAHUN ${tahun}`;
[1, 2, 3].forEach(r => {
  ws.getCell(`A${r}`).font = { bold: true };
  ws.getCell(`A${r}`).alignment = { horizontal: 'center' };
});

// 2. Header table (rows 4-7) — 4 baris header karena ada nested Total/Balita di Jml Angg keluarga
//    Row 4: top groups
ws.mergeCells('A4:A7'); ws.getCell('A4').value = 'No';
ws.mergeCells('B4:B7'); ws.getCell('B4').value = 'Nama dusun';
ws.mergeCells('C4:C7'); ws.getCell('C4').value = 'Jml RW';
ws.mergeCells('D4:D7'); ws.getCell('D4').value = 'Jml RT';
ws.mergeCells('E4:E7'); ws.getCell('E4').value = 'Jml dawis';
ws.mergeCells('F4:F7'); ws.getCell('F4').value = 'Jml KRT';
ws.mergeCells('G4:G7'); ws.getCell('G4').value = 'Jml KK';
ws.mergeCells('H4:R4'); ws.getCell('H4').value = 'Jml Angg keluarga';
ws.mergeCells('S4:X4'); ws.getCell('S4').value = 'Jumlah Rumah';
ws.mergeCells('Y4:AB4'); ws.getCell('Y4').value = 'Sumber Air Keluarga';
ws.mergeCells('AC4:AD4'); ws.getCell('AC4').value = 'Makanan';
ws.mergeCells('AE4:AG4'); ws.getCell('AE4').value = 'Wrg yg mengikuti';
ws.mergeCells('AH4:AH7'); ws.getCell('AH4').value = 'KET (JKN/BPJS)';

//    Row 5: sub-groups Jml Angg keluarga
ws.mergeCells('H5:I5'); ws.getCell('H5').value = 'Total';
ws.mergeCells('J5:K5'); ws.getCell('J5').value = 'Balita';
ws.mergeCells('L5:L7'); ws.getCell('L5').value = 'PUS';
ws.mergeCells('M5:M7'); ws.getCell('M5').value = 'WUS';
ws.mergeCells('N5:N7'); ws.getCell('N5').value = 'Ibu Hamil';
ws.mergeCells('O5:O7'); ws.getCell('O5').value = 'Ibu menyusui';
ws.mergeCells('P5:P7'); ws.getCell('P5').value = 'Lansia';
ws.mergeCells('Q5:Q7'); ws.getCell('Q5').value = '3 Buta';
ws.mergeCells('R5:R7'); ws.getCell('R5').value = 'Berkebutuhan khusus';

//    Row 5: sub-groups Jumlah Rumah
['Sehat','Tidak sehat','Memiliki tempt sampah','Memiliki spal','Memiliki jamban','Menempel stiker']
  .forEach((label, i) => {
    ws.mergeCells(5, 19 + i, 7, 19 + i);
    ws.getCell(5, 19 + i).value = label;
  });

//    Row 5: sub-groups Sumber Air Keluarga
['PDAM','Sumber','Sungai','Dll'].forEach((label, i) => {
  ws.mergeCells(5, 25 + i, 7, 25 + i);
  ws.getCell(5, 25 + i).value = label;
});

//    Row 5: sub-groups Makanan
['Beras','Non BERAS'].forEach((label, i) => {
  ws.mergeCells(5, 29 + i, 7, 29 + i);
  ws.getCell(5, 29 + i).value = label;
});

//    Row 5: sub-groups Wrg yg mengikuti
['UP2K','Pemanfaatan lahan','Kes lngk'].forEach((label, i) => {
  ws.mergeCells(5, 31 + i, 7, 31 + i);
  ws.getCell(5, 31 + i).value = label;
});

//    Row 6: leaf labels untuk Total & Balita (L/P)
ws.getCell('H6').value = 'L'; ws.getCell('I6').value = 'P';
ws.getCell('J6').value = 'L'; ws.getCell('K6').value = 'P';
// merge row 6 dengan row 7 untuk H-K (karena L/P di row 6, row 7 kosong digabung)
ws.mergeCells('H6:H7'); ws.mergeCells('I6:I7');
ws.mergeCells('J6:J7'); ws.mergeCells('K6:K7');

// 3. Column number reference (row 8): 1..34
for (let i = 1; i <= 34; i++) ws.getCell(8, i).value = i;

// 4. Data rows (rows 9-17): 9 dusun
DUSUN_LIST.forEach((dusunNama, idx) => {
  const r = 9 + idx;
  const data = rekapDawisMap[dusunNama] || {};
  ws.getCell(r, 1).value = idx + 1;
  ws.getCell(r, 2).value = dusunNama;
  ws.getCell(r, 3).value = data.jml_rw ?? 0;
  ws.getCell(r, 4).value = data.jml_rt ?? 0;
  ws.getCell(r, 5).value = data.jml_dawis ?? 0;
  ws.getCell(r, 6).value = data.jml_krt ?? 0;
  ws.getCell(r, 7).value = data.jml_kk ?? 0;
  ws.getCell(r, 8).value = data.jml_anggota_l ?? 0;
  ws.getCell(r, 9).value = data.jml_anggota_p ?? 0;
  ws.getCell(r, 10).value = data.balita_l ?? 0;
  ws.getCell(r, 11).value = data.balita_p ?? 0;
  ws.getCell(r, 12).value = data.pus ?? 0;
  ws.getCell(r, 13).value = data.wus ?? 0;
  ws.getCell(r, 14).value = data.ibu_hamil ?? 0;
  ws.getCell(r, 15).value = data.ibu_menyusui ?? 0;
  ws.getCell(r, 16).value = data.lansia ?? 0;
  ws.getCell(r, 17).value = data.tiga_buta ?? 0;
  ws.getCell(r, 18).value = data.berkebutuhan_khusus ?? 0;
  ws.getCell(r, 19).value = data.rumah_sehat ?? 0;
  ws.getCell(r, 20).value = data.rumah_kurang_sehat ?? 0;
  ws.getCell(r, 21).value = data.punya_tempat_sampah ?? 0;
  ws.getCell(r, 22).value = data.punya_spal ?? 0;
  ws.getCell(r, 23).value = data.jamban ?? 0;
  ws.getCell(r, 24).value = data.stiker_p4k ?? 0;
  ws.getCell(r, 25).value = data.air_pdam ?? 0;
  ws.getCell(r, 26).value = data.air_sumur ?? 0;
  ws.getCell(r, 27).value = data.air_sungai ?? 0;
  ws.getCell(r, 28).value = data.air_dll ?? 0;
  ws.getCell(r, 29).value = data.makan_beras ?? 0;
  ws.getCell(r, 30).value = data.makan_non_beras ?? 0;
  ws.getCell(r, 31).value = data.ikut_up2k ?? 0;
  ws.getCell(r, 32).value = data.ikut_pekarangan ?? 0;
  ws.getCell(r, 33).value = data.ikut_kesling ?? 0;
  ws.getCell(r, 34).value = data.jkn_bpjs ?? 0;
});

// 5. Total row (row 18)
ws.getCell(18, 2).value = 'JUMLAH';
for (let col = 3; col <= 33; col++) {
  const letter = ws.getColumn(col).letter;
  ws.getCell(18, col).value = { formula: `SUM(${letter}9:${letter}17)` };
}

// 6. Borders + alignment + bold header (rows 4-8)
const lastRow = 18, lastCol = 34;
for (let r = 4; r <= lastRow; r++) {
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(r, c).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
}
[4, 5, 6, 7, 8].forEach(r => {
  for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).font = { bold: true };
});

// 7. Vertical text rotation untuk kolom dengan label panjang (cols 19-24, 32, 33)
[19, 20, 21, 22, 23, 24, 32, 33].forEach(col => {
  ws.getCell(5, col).alignment = { textRotation: 90, horizontal: 'center', vertical: 'middle', wrapText: true };
});

// 8. Column widths
const widths = [4, 14, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 6, 5, 7, 5, 6, 7, 5, 6, 6, 5, 5, 5, 5, 5, 6, 5, 7, 5, 7];
widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
```

### Validation checklist (post-implementation)

- [ ] Title 3 baris: "CATATAN DATA DAN KEGIATAN WARGA" / "TP PKK DESA BELIKURIP KECAMATAN BATURETNO" / "TAHUN <tahun>".
- [ ] Header tabel 4 baris bertingkat (rows 4-7) + baris nomor urut kolom (row 8).
- [ ] 34 kolom total. Kolom 1 = No, Kolom 34 = KET (JKN/BPJS).
- [ ] 9 baris data (dusun) + 1 baris JUMLAH dengan SUM formula kolom 3-33.
- [ ] Schema `data_rekap_dawis`: drop `jml_dusun`, `tiga_buta_l`, `tiga_buta_p`, `ikut_industri`. Add `tiga_buta`, `berkebutuhan_khusus`.
- [ ] Vertical text di kolom 19-24, 32, 33.
- [ ] Visual diff dengan gambar referensi.
- [ ] Test fixture data dummy → file output match snapshot.
