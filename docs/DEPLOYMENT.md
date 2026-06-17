# Deployment — Lumbung Data PKK

Panduan deploy ke production (Vercel + Supabase Free Plan). Lakukan berurutan.

---

## 1. Prasyarat

- Project Supabase aktif.
- Akun Vercel terhubung ke repo.
- Akses ke Supabase SQL Editor.

---

## 2. Environment Variables (Vercel)

Set di **Vercel → Project → Settings → Environment Variables** (environment: Production, sebaiknya juga Preview):

| Variable | Wajib | Sumber |
|----------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Settings → API → service_role (RAHASIA) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ **production** | Supabase → Settings → API → anon public |
| `JWT_SECRET` | ✅ | Generate string acak panjang |
| `GEMINI_API_KEY` | ✅ (AI) | Google AI Studio |
| `GEMINI_MODEL` | ❌ | Default `gemini-flash-latest` |

> **Anon key WAJIB di production.** Kode `lib/supabase.js` membuat `supabaseAnon`
> fail-fast (menolak request) di production bila anon key tidak ada — ini mencegah
> endpoint publik `/api/public/*` memakai service role yang bypass RLS.
>
> **Service role key TETAP diperlukan** (endpoint internal/admin). Jangan dihapus.

Setelah menambah/mengubah env, lakukan **Redeploy** agar terpakai.

---

## 3. Migration Supabase (urutan)

Jalankan di **Supabase → SQL Editor** berurutan (lihat README untuk daftar lengkap).
Untuk fresh install mulai dari `supabase_schema.sql`. Untuk database existing,
jalankan hanya migration yang belum pernah dijalankan.

### ⚠️ Checklist khusus migration v13 (`report_periods` uniqueness)

`supabase_schema_updates_v13.sql` mengganti unique constraint `report_periods`
dengan partial unique index (memperbaiki bug periode tahunan `bulan IS NULL`).

1. **Backup dulu**:
   ```
   pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" \
     -t report_periods --data-only > backup_report_periods_pre_v13.sql
   ```
2. **Jalankan STEP 0 (AUDIT)** di v13 untuk cek duplikat periode tahunan
   (`bulan IS NULL`) dan bulanan. **Catat hasilnya.**
3. Jika ADA duplikat → jalankan STEP 0b (dedup manual, review dulu) sebelum lanjut.
   Jika TIDAK ada → lanjut.
4. Jalankan STEP 1 & STEP 2 (drop constraint lama + buat 2 partial unique index).
5. **Verifikasi**:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'report_periods' AND indexname LIKE '%uniq';
   ```
   Harus muncul `report_periods_yearly_uniq` & `report_periods_monthly_uniq`.

---

## 4. Build & Deploy

- Vercel otomatis menjalankan `npm run build`.
- Pastikan lokal lulus dulu:
  ```bash
  npm test -- --runInBand
  npm run build
  ```

---

## 5. Smoke Test Pasca-Deploy

- [ ] Buka `/publik` (tanpa login) → data agregat tampil tanpa error.
- [ ] Login admin → ganti password default bila belum (lihat OPERATIONS).
- [ ] Input + simpan 1 data dusun.
- [ ] Submit periode → login admin → approve di Approval Queue.
- [ ] Import Excel: upload → preview muncul → (boleh batal, jangan commit) .
- [ ] Export Excel & Word berhasil.

---

## 6. Catatan Supabase Free Plan

- **Tidak ada automated backup.** Lakukan backup manual berkala (lihat `OPERATIONS.md`).
- Cache `/api/dusun` bersifat per-instance (serverless) — wajar di Vercel.
