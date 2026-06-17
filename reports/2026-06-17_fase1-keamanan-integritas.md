# Laporan Pekerjaan — 17 Juni 2026 · FASE 1 (Keamanan & Integritas Data)

Mengacu ke `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md`. FASE 1 selesai. Detail per item:

---

## Item 1 — Supabase anon/public client fail-fast di production

**Masalah:** `supabaseAnon` fallback ke service role kalau `NEXT_PUBLIC_SUPABASE_ANON_KEY` tidak ada → endpoint publik berpotensi bypass RLS.

**Perubahan:** `lib/supabase.js`
- DEV/TEST: tetap fallback ke service role + **warning jelas** (tidak menutupi risiko).
- PRODUCTION: `supabaseAnon` jadi **lazy fail-fast** — di-wrap Proxy yang `throw` saat benar-benar dipakai menangani request (bukan saat module load). Ini mencegah `next build` patah (public routes `force-dynamic` tidak dievaluasi saat build) tapi tetap menolak request publik di production sampai anon key di-set.

**Catatan deploy:** Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` di environment Vercel + `.env.local` (dari Supabase Dashboard → Settings → API → anon/public key) sebelum production.

---

## Item 2 — Uniqueness `report_periods` (tahunan vs bulanan)

**Masalah:** `UNIQUE(table_name, tahun, bulan)` tidak menjamin unik saat `bulan IS NULL` (NULL ≠ NULL di PostgreSQL) → periode tahunan bisa duplikat, `maybeSingle()` bisa error.

**Perubahan:**
- `supabase_schema_updates_v13.sql` (**baru**, non-destruktif & idempotent):
  - STEP 0/0b: query AUDIT duplikat + panduan dedup manual (tidak otomatis hapus).
  - Drop constraint `UNIQUE(table_name,tahun,bulan)` lama.
  - Buat 2 partial unique index: `report_periods_yearly_uniq` (WHERE bulan IS NULL) & `report_periods_monthly_uniq` (WHERE bulan IS NOT NULL).
- `supabase_schema_updates_v4.sql` — fresh install report_periods diubah ke partial index (konsisten dengan v13).
- `app/api/periods/route.js` — **tidak lagi** pakai `upsert onConflict` (tidak reliable untuk partial index). Sekarang fetch row existing (sudah pakai `.is('bulan', null)`/`.eq('bulan', n)` dengan benar) → update-by-id atau insert.

**Langkah manual:** Jalankan v13 di Supabase SQL Editor. Jalankan STEP 0 dulu untuk cek duplikat; jika ada, dedup manual via STEP 0b sebelum index dibuat.

---

## Item 3 — Bug notifikasi periode bulanan

**Masalah:** `lib/notifications.js` query `.is('bulan', bulan === null ? null : undefined)` — untuk bulan non-null, `.is('bulan', undefined)` tidak memfilter bulan → submitter/approver salah/tak ketemu → notifikasi approve/return/lock tidak terkirim untuk tabel bulanan.

**Perubahan:** `lib/notifications.js`
- Query period sekarang: `.is('bulan', null)` untuk tahunan, `.eq('bulan', Number(bulan))` untuk bulanan.

---

## Test yang ditambahkan

- `__tests__/server/notifications-period.test.js` (**baru**, 4 test) — verifikasi filter bulan (`.eq` vs `.is`) + notifikasi terkirim ke submitter (approve) & reviewer (submit).
- `__tests__/server/migration-non-destructive.test.js` — tambah blok test untuk v13 (partial index ada, tidak ada operasi destruktif aktif).

---

## Verifikasi

- `npm.cmd test -- --runInBand` → **16 suites / 167 test passing** (sebelumnya 15 / 161).
- `npm.cmd run build` → **clean**, tidak ada lagi warning anon key saat build (lazy fail-fast).

## File yang diubah/ditambah

| File | Status |
|------|--------|
| `lib/supabase.js` | diubah (anon lazy fail-fast production) |
| `app/api/periods/route.js` | diubah (insert/update eksplisit, bukan upsert onConflict) |
| `lib/notifications.js` | diubah (fix filter bulan) |
| `supabase_schema_updates_v13.sql` | baru (partial unique index + audit) |
| `supabase_schema_updates_v4.sql` | diubah (fresh install pakai partial index) |
| `__tests__/server/notifications-period.test.js` | baru (4 test) |
| `__tests__/server/migration-non-destructive.test.js` | diubah (test v13) |

## Risiko tersisa

- v13 perlu dijalankan manual di Supabase. Jika ada duplikat `report_periods` existing, pembuatan unique index akan gagal sampai dedup manual (STEP 0b) dilakukan — ini disengaja (aman, tidak hapus data otomatis).
- Anon key belum di-set di `.env.local`; di dev tetap jalan (fallback + warning), tapi **wajib di-set sebelum deploy production**.

Menunggu instruksi untuk lanjut ke FASE 2.
