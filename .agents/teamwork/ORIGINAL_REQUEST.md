# Original User Request

## Initial Request — 2026-10-12T13:26:52Z

Lakukan audit menyeluruh (read-only) terhadap aplikasi web Rekapitulasi TP PKK Desa Belikurip (Next.js 16.2.5 + Supabase, JWT auth, integrasi Gemini) untuk menemukan kekurangan dan aspek yang bisa diperbaiki, lalu hasilkan laporan temuan berprioritas dalam Bahasa Indonesia. Ini adalah tugas analisis — JANGAN mengubah kode aplikasi, skema, atau data.

Working directory: c:\Users\ipw26\OneDrive\Documents\rekapitlasi
Integrity mode: development

Referensi wajib dibaca: `AGENTS.md` / `CLAUDE.md` (konvensi arsitektur & Next.js versi ini — baca `node_modules/next/dist/docs/` sebelum menilai pola Next.js), `.kiro/specs/migrasi-level-desa/`, serta dokumen review lama: `PROJECT_REVIEW.md`, `SENIOR_WEB_DEV_REVIEW_LANJUTAN_2026-06-17.md`, `REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md`, `REVIEW_UIUX_FITUR_2026-07-02.md`, `UI_UX_AND_FEATURE_GAPS.md`, `AI_SKILLS_PROJECT_REVIEW.md`.

## Requirements

### R1. Audit lintas semua aspek
Analisis seluruh codebase pada aspek: keamanan (auth, otorisasi tiap route `app/api/**`, row-level permission kader-dusun, RLS Supabase, injeksi, kebocoran rahasia, mutasi AI), kualitas kode & arsitektur (duplikasi, utang teknis, alias legacy desa↔dusun), performa (query Supabase, bundle, rendering), UI/UX & aksesibilitas (mobile, a11y, alur kerja kader), testing & keandalan (cakupan, e2e, error handling), kelengkapan fitur untuk kebutuhan TP PKK Desa, database/skema & migrasi (v1–v13, integritas data, skrip destruktif), serta DevOps/deployment & dokumentasi.

### R2. Verifikasi status temuan lama
Untuk setiap temuan di dokumen review lama, tentukan statusnya saat ini (Sudah diperbaiki / Sebagian / Belum / Tidak relevan lagi) dengan bukti dari kode terkini.

### R3. Bukti empiris dengan menjalankan aplikasi
Tim boleh menjalankan `npm test`, `npm run build`, `npm audit`, dev server, dan Playwright e2e menggunakan `.env.e2e`. Dilarang menulis/menghapus data pada database produksi Supabase (`.env.local`), dilarang menjalankan skrip SQL apa pun, dan dilarang mencetak nilai rahasia (.env) ke laporan.

### R4. Laporan berprioritas
Hasilkan laporan Markdown berbahasa Indonesia di `reports/AUDIT_<YYYY-MM-DD>.md` yang berisi ringkasan eksekutif, tabel status temuan lama, daftar temuan baru, dan roadmap perbaikan bertahap (quick wins → jangka menengah → jangka panjang).

## Acceptance Criteria

### Kelengkapan & bukti
- [ ] Setiap temuan memiliki: ID, aspek, tingkat keparahan (Kritis/Tinggi/Sedang/Rendah), lokasi file + nomor baris (link yang valid ke file yang ada), deskripsi masalah, dampak, dan rekomendasi konkret.
- [ ] Ke-8 aspek di R1 masing-masing punya bagian sendiri; aspek tanpa temuan berarti harus menyebutkan apa yang diperiksa.
- [ ] Setiap route di `app/api/**/route.js` tercantum dalam tabel audit otorisasi (method, helper auth yang dipakai, role yang diizinkan, catatan).
- [ ] Setiap temuan lama di dokumen review tercantum dalam tabel status dengan bukti file:baris.

### Verifikasi independen
- [ ] Laporan mencantumkan output ringkas (jumlah pass/fail, error, kerentanan per severity) dari `npm test`, `npm run build`, `npm audit`, dan hasil Playwright (atau alasan jelas jika tidak bisa dijalankan).
- [ ] Seorang reviewer independen (agent terpisah dari penulis temuan) memeriksa ulang sampel minimal 10 temuan acak + semua temuan Kritis/Tinggi terhadap kode; temuan yang tidak terbukti dihapus atau dikoreksi, dan hasil pengecekan ini dicatat di lampiran laporan.
- [ ] Tidak ada nilai rahasia (API key, JWT secret, service role key) muncul di laporan.

### Tanpa perubahan kode
- [ ] `git status` setelah audit hanya menunjukkan file laporan baru di `reports/` (serta artefak test/e2e yang memang di-gitignore).


## Follow-up — 2026-10-12T15:13:12Z

Implement a comprehensive, full-team polish for the **Lumbung Data PKK Desa Belikurip** application. This encompasses: (1) refining the UI design system into an authentic Apple iOS / VisionOS frosted glass aesthetic ("Liquid Glass" that is substantive, milky/smoky, not overly transparent, with a satin sheen and specular highlights), and (2) completing and verifying all remaining tasks from `reports/AUDIT_2026-10-12.md` across security, export pipelines, data integrity, and automated testing.

Working directory: c:\Users\ipw26\OneDrive\Documents\rekapitlasi
Integrity mode: development
Requested team: full team

Reference image: C:/Users/ipw26/.gemini/antigravity/brain/c0a921a8-db15-4a8a-8bc1-91328b54dde0/reference_glass.png

## Requirements

### R1. Apple iOS / VisionOS Frosted Glass Design System
Refine the Liquid Glass design tokens in `app/globals.css` and `tailwind.config.js`:
- **Substantive Frosted Surface**: Avoid watery/excessive transparency. In light mode, use smoky/milky surfaces with 78%–88% opacity; in dark mode, 75%–85% opacity (`rgba(15, 23, 20, 0.80)`).
- **Deep Diffusion & Saturation**: Apply `backdrop-filter: blur(28px) saturate(180%)` (with `-webkit-backdrop-filter`).
- **Satin Sheen & Specular Highlights**: Add top inner specular edge lighting (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.45)` for light mode, `inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)` for dark mode), a delicate 1px luminous rim border, and diffuse elevation (`box-shadow: 0 16px 40px rgba(0, 0, 0, 0.10)`).
- **Comprehensive Integration**: Apply across the Navigation Shell (`Sidebar.js`, `Topbar.js`), Data Pages (`NestedDataPage.js`, `PokjaDataPage.js`, `DataStatsPage.js`), Action Toolbars (`DashboardToolbar.jsx`), Pills/Toggles (`DensityToggle.jsx`, badges), and Modals/Dialogs.

### R2. High-Readability & WCAG AA Contrast Compliance
- Ensure text contrast remains strictly above 4.5:1 for body text and 3:1 for large headers on both light and dark frosted surfaces.
- Avoid low-contrast gray text on translucent backgrounds. Inputs and sticky table headers must remain crisp and readable in both light and dark modes.

### R3. Audit Findings Completion & Data Pipeline Guardrails
Complete and verify all resolutions mandated by `reports/AUDIT_2026-10-12.md`:
- Data safety: Verify reset script safeguard (`DO $$ BEGIN RAISE EXCEPTION ... END $$;`), migration v14 (`supabase_schema_updates_v14_fix_index_and_rls.sql`), and Playwright production URL rejection.
- Export pipelines: Ensure Excel and Word exports (Annex A–F, Pokja I–IV, Rekap Dawis, Bumil) accurately map all canonical columns and sanitize against CSV/formula injection.
- Security: Verify rate limiting, strict PostgREST parameter validation, and secure cookie parsing.

### R4. Automated Testing & Build Verification
- Execute and verify the complete server unit test suite: `npm test -- --selectProjects server` must pass 100% (19 suites, 180 tests).
- Verify clean Next.js build compilation (`npm run build`) without Turbopack or TypeScript/Tailwind errors.

## Acceptance Criteria

### Visual & UX Quality
- [ ] Frosted surfaces reflect Apple iOS/VisionOS aesthetic: substantive, milky/smoky, satin texture, deep blur, and specular border highlights without looking washed out or flimsy.
- [ ] Both light mode and dark mode maintain cohesive optical depth and consistent glass treatment across all pages.
- [ ] WCAG AA text contrast (> 4.5:1) is verified on all frosted card text and table cells.

### Functional & Security Verification
- [ ] `npm test -- --selectProjects server` passes 100% with 19 suites and 180 tests.
- [ ] `npm run build` completes successfully.
- [ ] Zero database mutations executed against live production environments.
