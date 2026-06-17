# Senior Web Dev Review Lanjutan - Rekapitulasi PKK

Tanggal review: 17 Juni 2026
Reviewer: Codex sebagai senior web developer, UI/UX reviewer, dan product-quality reviewer
Project path: `C:\Users\ipw26\OneDrive\Documents\rekapitlasi`

## Ringkasan Eksekutif

Project ini sudah bukan prototype sederhana. Secara teknis, aplikasi sudah punya fondasi yang kuat: Next.js App Router 16, Supabase, JWT httpOnly cookie, role-based permission, row-level enforcement untuk kader dusun, audit log, import/export Excel, report builder, AI chat dengan dry-run mutation, notifikasi, approval queue, halaman publik, dark mode, dan test server yang cukup luas.

Verifikasi lokal pada review ini:

- `npm test -- --runInBand`: lulus, 17 test suite, 172 test.
- `npm run build`: lulus, Next.js 16.2.5 dengan Turbopack, 61 halaman static/dynamic terdaftar.

Catatan penting: review lama `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md` sudah banyak dieksekusi. Laporan fase 1, 2, dan 3 menunjukkan perbaikan keamanan, import month-aware, cache `/api/dusun`, dialog accessible, approval queue, filter hanya bermasalah, dan dark-mode table override sudah selesai. Karena itu review ini fokus pada kelemahan lanjutan yang masih relevan setelah fase tersebut.

## Kekuatan Utama Project

1. Arsitektur domain sudah cukup matang.
   - Unit data sudah diarahkan ke dusun.
   - Ada backward compatibility untuk alias lama `desa` dan `data_kegiatan_warga`.
   - Ada workflow periode: draft, submit, approve, return, lock.

2. Keamanan server sudah jauh lebih baik dari aplikasi CRUD biasa.
   - Auth memakai JWT cookie httpOnly.
   - Proxy melindungi `/dashboard/*`.
   - Route API sensitif tetap punya authorization sendiri.
   - Mutasi data memakai role permission, row-level check, period lock, sanitasi payload, dan audit log.

3. Fitur operasional kaya.
   - Dashboard KPI, chart, matrix kelengkapan.
   - Input data per pokja, data umum, rekap dawis, bumil.
   - Import Excel dengan preview/diff dan confirm.
   - Export Excel/Word/template.
   - Report builder.
   - AI assistant dengan preview sebelum mutasi database.
   - Notifikasi dan approval queue.

4. Ada perhatian nyata pada UX.
   - Sidebar responsive.
   - Mobile card untuk input tabel besar.
   - Quick jump antar dusun.
   - Skeleton loading.
   - Dark mode.
   - Onboarding tour.
   - Filter data bermasalah.

5. Build dan test saat review ini bersih.
   - Ini sinyal bagus untuk stabilitas backend dan integritas logic domain.

## Kelemahan Prioritas Tinggi

### 1. README masih bawaan create-next-app

`README.md` belum menjelaskan aplikasi sebenarnya. Padahal `AGENTS.md` dan folder `reports/` berisi pengetahuan arsitektur yang jauh lebih penting.

Dampak:

- Developer baru tidak tahu cara setup Supabase, env, migration, role, seed data, dan deployment.
- Risiko salah konfigurasi production meningkat.
- Pengetahuan project tersebar di banyak laporan, bukan entry point resmi.

Saran:

- Rewrite `README.md` menjadi dokumentasi nyata project.
- Tambahkan `.env.example` tanpa secret.
- Tambahkan bagian: stack, fitur utama, setup lokal, env wajib, migration order, akun/role, cara test, cara build, cara deploy, dan troubleshooting.
- Tambahkan `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, dan `docs/OPERATIONS.md` bila README mulai terlalu panjang.

### 2. Beberapa file UI sudah terlalu besar untuk dirawat aman

Ukuran file saat review:

- `app/dashboard/admin/page.js`: sekitar 1421 baris.
- `components/NestedDataPage.js`: sekitar 864 baris.
- `app/dashboard/page.js`: sekitar 748 baris.

Dampak:

- Sulit melakukan review perubahan kecil tanpa membaca banyak konteks.
- Risiko regresi UI meningkat.
- Logic fetch, state, rendering, validation, dan action bercampur.
- Komponen besar sulit dites secara terisolasi.

Saran:

- Pecah `admin/page.js` menjadi modul fitur: users, import, columns, years, logs, dusun management.
- Pecah `dashboard/page.js` menjadi `useDashboardData`, KPI section, trend section, completeness matrix, chart section, dan export actions.
- Pecah `NestedDataPage` menjadi hook data entry, header table builder, mobile card, desktop table, dirty state toolbar, dan validation helpers.
- Setelah modularisasi, tambahkan test komponen untuk alur utama.

### 3. Test frontend dan E2E belum sepadan dengan kompleksitas UI

`jest.config.js` sudah menyiapkan project `client`, tetapi folder `__tests__/client` belum ada. Test yang lulus saat ini kuat di server/domain, namun belum membuktikan workflow UI utama.

Dampak:

- Regression pada modal, dropdown, dark mode, mobile table, import wizard, dan approval queue bisa lolos.
- Refactor komponen besar menjadi berisiko.
- Aksesibilitas yang sudah diperbaiki tidak punya guard otomatis.

Saran:

- Tambahkan React Testing Library untuk komponen penting: `Dialog`, `Topbar`, `DashboardToolbar`, `PeriodWorkflowBadge`, `ApprovalPage`, dan data-entry dirty state.
- Tambahkan Playwright untuk E2E minimum:
  - login,
  - buka dashboard,
  - filter tahun/bulan,
  - edit satu row dan simpan,
  - submit periode,
  - admin approve/return,
  - import preview tanpa commit,
  - halaman publik terbuka tanpa auth.
- Tambahkan automated a11y smoke test dengan axe untuk dialog, topbar dropdown, dan halaman data entry.

### 4. Feedback error masih belum konsisten

Masih ada pola `silent catch`, `alert()`, dan `window.confirm()` di beberapa area seperti dashboard export, report builder, halaman publik, topbar notifications, approval page, dan beberapa data page.

Dampak:

- User tidak selalu tahu apakah data gagal dimuat atau hanya kosong.
- Native `alert/confirm` terasa kasar dibanding UI lain yang sudah memakai `Dialog` dan toast.
- Error operasional sulit ditelusuri karena beberapa catch sengaja silent.

Saran:

- Standarkan error UX: inline error state + retry button + toast untuk aksi.
- Ganti `alert()` dan `window.confirm()` dengan `Dialog` reusable.
- Buat helper `fetchJson()` client-side untuk response error konsisten.
- Bedakan error user-facing dan developer log.
- Di production, pertimbangkan error monitoring seperti Sentry atau log endpoint internal.

### 5. UI dashboard masih terlalu padat dan semua informasi terasa setara

Dashboard sudah kaya, tetapi halaman utama operasional menampilkan banyak KPI, trend card, chart, matrix, dan detail demografi dalam satu alur panjang.

Dampak:

- Admin atau operator baru harus mencari sendiri tindakan yang paling penting.
- Chart yang informatif bersaing dengan matrix kelengkapan dan approval task.
- Mobile experience bisa terasa berat untuk operator lapangan.

Saran:

- Buat dashboard role-based.
  - Admin: periode menunggu review, dusun bermasalah, import terakhir, anomali terbesar.
  - Pokja: tabel miliknya, periode aktif, data perlu dicek, deadline.
  - Kader dusun: hanya pekerjaan dusunnya, status submit, revisi dari admin.
- Taruh blok `Yang perlu tindakan hari ini` di paling atas.
- Jadikan chart trend sebagai section analisis, bukan hal pertama yang bersaing dengan task.
- Tambahkan drill-down dari KPI ke daftar dusun/kolom yang menyebabkan status bermasalah.

## Kelemahan UI/UX dan Tampilan

### 6. Tampilan masih sangat dominan hijau/emerald

Brand PKK memang wajar memakai hijau, tetapi aplikasi kini memakai hijau sebagai background, active state, badge, focus, chart, dan banyak card. Accent amber/biru/merah ada, namun hierarchy visual masih sangat bergantung pada emerald.

Dampak:

- Halaman terasa monoton.
- Status penting bisa kalah oleh warna brand.
- Chart dan KPI lebih sulit discan cepat.

Saran:

- Pertahankan hijau sebagai brand/action primary, tetapi gunakan neutral surface lebih dominan.
- Gunakan warna status hanya untuk status: success, warning, danger, info.
- Kurangi background hijau besar pada area kerja dense.
- Buat token design: surface, border, text-muted, action-primary, status-success, status-warning, status-danger.

### 7. Radius dan card treatment belum sepenuhnya konsisten

Banyak elemen memakai `rounded-xl` dan `rounded-2xl`. Untuk aplikasi operasional padat, radius besar membuat interface terasa lebih marketing daripada alat kerja.

Dampak:

- Density informasi turun.
- Tabel dan control terlihat kurang tegas.
- Hierarchy antar card kurang jelas karena hampir semua area menjadi card besar.

Saran:

- Pakai radius kecil-menengah untuk tool surface: 8-12px.
- Simpan radius besar hanya untuk modal atau hero/public landing.
- Buat standar: button 8-10px, input 8-10px, card 8-12px, dialog 12-16px.

### 8. Halaman publik masih kurang naratif untuk warga

Halaman publik sudah aman karena memakai agregat, tetapi UX-nya masih mirip ringkasan internal: KPI, indikator, tabel status.

Dampak:

- Warga awam belum tentu memahami arti angka PKK.
- Tidak ada konteks perubahan dari bulan/tahun sebelumnya.
- Tidak ada penjelasan dampak atau capaian.

Saran:

- Tambahkan `Terakhir diperbarui` dan sumber data.
- Tambahkan narasi singkat: kondisi umum, capaian, dan data yang perlu dilengkapi.
- Tambahkan chart sederhana per dusun untuk 3-5 indikator publik utama.
- Tambahkan definisi istilah seperti Dasa Wisma, Posyandu, JKN/BPJS.
- Tambahkan empty state publik yang menjelaskan jika periode belum ada data.

### 9. Dark mode sudah ada, tetapi masih patch-based

Fase 3 sudah menambahkan override dark mode untuk `.nested-table` memakai `!important` khusus dark mode. Ini aman secara pragmatis, tetapi masih menandakan styling belum sepenuhnya tokenized.

Dampak:

- Perubahan table layout berikutnya bisa memecahkan dark mode lagi.
- Warna hard-coded di inline style tetap menjadi utang teknis.

Saran:

- Untuk jangka pendek, pertahankan override yang sudah aman.
- Untuk jangka menengah, pindahkan warna tabel ke class dan CSS variables.
- Hindari inline `background`, `border`, dan `color` baru pada komponen table.

## Kelemahan Fitur dan Produk

### 10. Approval queue sudah ada, tetapi perlu konteks keputusan

Admin kini bisa approve/return dari queue. Namun workflow approval yang baik biasanya perlu alasan, komentar, dan histori ringkas.

Saran:

- Saat return, wajibkan alasan revisi.
- Tampilkan histori status periode: submitted by, returned by, approved by, locked by, timestamp.
- Tambahkan badge SLA: sudah menunggu berapa hari.
- Tambahkan filter queue: table, bulan, tahun, status, submitter.

### 11. Notifikasi belum cukup actionable

Topbar notifikasi dan halaman notifikasi sudah ada, tetapi notifikasi idealnya langsung membawa user ke tindakan berikutnya.

Saran:

- Kategorikan notifikasi: approval, return, import, system, data quality.
- Tambahkan primary action pada notifikasi tertentu: `Buka periode`, `Perbaiki data`, `Review approval`.
- Tambahkan preferensi notifikasi sederhana per role.

### 12. Import AI chat punya catatan preview bulan

Laporan fase 2 mencatat bahwa di AI chat, preview diff dihitung saat upload. Jika user mengganti bulan setelah upload, angka diff bisa tidak sinkron walau confirm tetap aman.

Saran:

- Re-run preview otomatis saat user mengganti tahun/bulan di modal AI import.
- Atau lock tahun/bulan setelah preview dibuat dan sediakan tombol `Hitung ulang preview`.

### 13. Belum ada command palette atau global search

Untuk aplikasi yang punya banyak halaman, tabel, dusun, tahun, bulan, dan laporan, navigasi sidebar saja akan terasa lambat.

Saran:

- Tambahkan command palette `Ctrl+K`.
- Target awal: lompat halaman, cari dusun, buka report builder, buka import, buka approval queue.
- Tampilkan recent pages dan shortcut per role.

### 14. Belum terlihat strategi observability produksi

Server sudah `console.error`, tetapi belum ada struktur monitoring produksi.

Saran:

- Tambahkan error monitoring untuk route API dan client errors.
- Tambahkan request ID sederhana di response error internal.
- Log event penting: import preview, import confirm, export, approval action, failed login, locked period write attempt.
- Jangan log secret, password, atau isi file Excel mentah.

### 15. Legacy alias masih perlu rencana pensiun

Backward compatibility `desa` dan `data_kegiatan_warga` masih berguna, tetapi perlu batas waktu.

Saran:

- Buat `docs/DEPRECATION.md`.
- Tandai route/field legacy dengan deprecation header bila belum.
- Setelah satu rilis stabil, siapkan migration dan PR penghapusan alias client-side yang tidak lagi dipakai.

## Rekomendasi Prioritas

### P0 - Harus dikerjakan sebelum production luas

1. Rewrite README dan tambahkan `.env.example`.
2. Pastikan default admin password tidak bisa bertahan di production.
3. Standarkan error/confirm UX untuk flow berisiko: export, import, report builder, save all.
4. Tambahkan minimal E2E untuk login, data entry, approval queue, import preview, dan public page.
5. Pastikan migration v13 sudah dijalankan di Supabase production dan hasil audit duplikat `report_periods` tercatat.

### P1 - Produktivitas operator dan maintainability

1. Pecah `app/dashboard/admin/page.js` menjadi modul kecil.
2. Pecah `NestedDataPage` dan `DashboardPage` menjadi hook + section component.
3. Tambahkan role-based dashboard summary `Yang perlu tindakan hari ini`.
4. Tambahkan alasan return pada approval workflow.
5. Re-run import preview saat tahun/bulan berubah di AI chat.

### P2 - Tampilan dan pengalaman publik

1. Perbaiki halaman publik agar lebih naratif dan mudah dipahami warga.
2. Rapikan design token, radius, warna, dan density.
3. Tambahkan command palette/global search.
4. Tambahkan observability produksi.
5. Buat deprecation plan untuk alias legacy.

## Prompt untuk Claude Code Opus 4.8

```markdown
Anda adalah Senior Full-Stack Next.js Developer, UI/UX Engineer, dan Production Readiness Reviewer. Kerjakan project berikut secara hati-hati dan bertahap.

Project:
- Path: `C:\Users\ipw26\OneDrive\Documents\rekapitlasi`
- Stack: Next.js App Router 16.2.5, React 19, Supabase, Tailwind CSS, Jest.
- Domain: aplikasi rekapitulasi data PKK Desa Belikurip per dusun.
- Unit data utama: dusun.
- Tabel bulanan: `data_umum`, `data_rekap_dawis`, `data_bumil`.
- Review terakhir: `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md`.
- Test terakhir: `npm test -- --runInBand` lulus 17 suites / 172 tests.
- Build terakhir: `npm run build` lulus.

Penting:
- Jangan mengulang pekerjaan yang sudah selesai di laporan `reports/2026-06-17_fase1-keamanan-integritas.md`, `reports/2026-06-17_fase2-import-performa.md`, dan `reports/2026-06-17_fase3-uiux-aksesibilitas.md` kecuali perlu penyempurnaan kecil.
- Jangan menjalankan command destruktif seperti `git reset --hard`, `git checkout --`, atau SQL destruktif.
- Jangan mengubah data produksi langsung.
- Pertahankan backward compatibility untuk alias legacy `desa` dan `data_kegiatan_warga` sampai ada deprecation plan eksplisit.
- Setelah setiap fase, jalankan `npm test -- --runInBand` dan `npm run build`.
- Tambahkan test untuk perubahan behavior backend atau workflow UI penting.

FASE 1 - Dokumentasi dan production readiness

1. Rewrite `README.md` agar bukan lagi README bawaan create-next-app.
   Isi minimal:
   - deskripsi aplikasi,
   - fitur utama,
   - stack,
   - struktur folder penting,
   - setup lokal,
   - env wajib,
   - urutan migration Supabase,
   - role dan permission,
   - cara test,
   - cara build,
   - checklist deploy,
   - troubleshooting.

2. Tambahkan `.env.example` tanpa secret.
   Sertakan variabel seperti:
   - `NEXT_PUBLIC_SUPABASE_URL`,
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   - `SUPABASE_SERVICE_ROLE_KEY`,
   - `JWT_SECRET`,
   - `GEMINI_API_KEY`,
   - `GEMINI_MODEL` bila relevan.
   Jelaskan mana yang wajib production dan mana optional.

3. Tambahkan `docs/DEPLOYMENT.md` dan `docs/OPERATIONS.md` bila README terlalu panjang.
   Deployment doc wajib memuat checklist migration v13 dan anon key production.
   Operations doc wajib memuat langkah rotasi password admin, backup Supabase, import/export, dan recovery saat import salah bulan.

4. Audit default admin password.
   - Cari referensi `admin/admin123` di SQL dan dokumen.
   - Jangan hapus seed begitu saja jika masih dibutuhkan lokal.
   - Tambahkan peringatan dokumentasi yang kuat.
   - Jika feasible, implementasikan first-login force password change untuk akun default atau flag `must_change_password` secara non-destruktif.
   - Jika butuh migration, buat SQL non-destruktif dan dokumentasikan.

FASE 2 - UX error handling dan test frontend minimum

5. Ganti native `alert()` dan `window.confirm()` pada flow utama dengan `Dialog`/toast existing.
   Target awal:
   - `app/dashboard/page.js` export warning dan download error,
   - `app/dashboard/reports/page.js` report builder error,
   - `components/PokjaDataPage.js`, `components/BumilDataPage.js`, `components/NestedDataPage.js` save-all warning.
   Pastikan visual konsisten dan keyboard accessible.

6. Kurangi `silent catch` yang membuat user tidak tahu error.
   - Untuk data publik dan dashboard, tampilkan inline error state dengan tombol retry.
   - Untuk notifikasi/dropdown, minimal tampilkan fallback state atau toast ringan.
   - Jangan menampilkan detail secret/internal error ke user.

7. Tambahkan test frontend minimum.
   Gunakan React Testing Library/Jest yang sudah dikonfigurasi.
   Buat folder `__tests__/client` dan test untuk:
   - `Dialog` Escape close + focus behavior dasar,
   - `DashboardToolbar` render filter dan action,
   - `Topbar` notification/profile dropdown open-close,
   - satu flow dirty state data entry bila feasible.

8. Jika feasible, tambahkan Playwright E2E smoke test.
   Jika terlalu besar untuk satu fase, buat konfigurasi dan satu test smoke public page saja, lalu dokumentasikan sisanya sebagai follow-up.

FASE 3 - Modularisasi file besar

9. Refactor `app/dashboard/admin/page.js` secara bertahap.
   - Pecah menjadi komponen/hook di folder seperti `components/admin/*` atau `app/dashboard/admin/_components/*`.
   - Jangan ubah behavior dulu.
   - Target: import tab, users tab, columns tab, years tab, logs tab, dusun tab.
   - Pastikan build dan test tetap lulus.

10. Refactor `app/dashboard/page.js`.
   - Ekstrak `useDashboardData`.
   - Ekstrak KPI cards, toolbar wrapper, completeness matrix, trend cards, chart sections.
   - Jangan mengubah query API kecuali ada bug jelas.

11. Refactor `components/NestedDataPage.js` secara aman.
   - Ekstrak pure helpers untuk tree/header rows bila belum.
   - Ekstrak mobile card dan desktop table.
   - Pertahankan pixel-perfect layout dan dark mode override yang sudah ada.

FASE 4 - Product UX lanjutan

12. Dashboard role-based.
   - Tambahkan section paling atas `Yang perlu tindakan hari ini`.
   - Admin: periode submitted, dusun perlu dicek, import/report action.
   - Operator: tabel miliknya, periode aktif, warning/error, submit status.
   - Kader dusun: status dusunnya dan revisi admin.

13. Approval workflow.
   - Saat return, wajibkan alasan revisi.
   - Tampilkan histori status periode ringkas.
   - Tambahkan filter queue: tahun, bulan, tabel, status.

14. AI import preview.
   - Re-run preview saat user mengganti tahun/bulan setelah upload, atau lock pilihan periode setelah preview dan sediakan tombol `Hitung ulang preview`.
   - Pastikan confirm tetap memakai periode yang sama dengan preview.

15. Halaman publik.
   - Tambahkan `Terakhir diperbarui`, definisi istilah, dan narasi ringkas.
   - Tambahkan chart sederhana untuk indikator publik utama.
   - Tambahkan empty/error state yang jelas.

Urutan kerja:
1. Kerjakan FASE 1 dulu saja.
2. Laporkan file yang diubah, alasan perubahan, migration bila ada, hasil test, dan hasil build.
3. Berhenti setelah FASE 1 dan tunggu instruksi sebelum lanjut ke FASE 2.
```
