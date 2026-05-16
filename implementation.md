# Implementation Plan - Dashboard Drill-down, Public Portal, Welcome Page, and UI/UX Polish

Target project: Sistem Rekapitulasi Data TP PKK Kecamatan Baturetno
Date: 2026-05-14
Primary goal: implement feature gaps no. 3 and no. 7 from the review, plus all listed UI/UX gaps.

## Scope

Implement these deliverables:

1. Dashboard drill-down yang lebih dalam.
2. Portal publik/agregat untuk data non-sensitif.
3. Welcome page sebagai halaman pertama `/`, sehingga user tidak langsung melihat login.
4. Login dipindah ke route khusus, misalnya `/login`.
5. Semua kekurangan UI/UX dari review:
   - broken logo
   - mobile login terlalu dekoratif dan form kurang terbaca
   - dashboard mobile terlalu panjang dan action tersebar
   - visual terlalu satu warna hijau
   - tabel data berat untuk layar kecil
   - dev overlay `1 Issue` akibat CSP/eval warning di development

Non-goals untuk fase ini:

- Jangan membangun modul data personal lengkap level keluarga/warga/dasawisma. Itu gap fitur no. 1 dan butuh desain data sendiri.
- Jangan membuka data mentah atau data pribadi ke publik.
- Jangan mengganti backend Supabase.
- Jangan melakukan refactor besar yang tidak diperlukan untuk deliverable di atas.

## Existing Context

Project memakai Next.js App Router, React, Tailwind, Flowbite icons, Supabase, JWT auth, dan route API di `app/api/**/route.js`.

Komponen dan file penting:

- `app/page.js`: saat ini login page. Harus diubah menjadi welcome page.
- `app/dashboard/page.js`: dashboard operasional internal.
- `app/dashboard/layout.js`: guard client dashboard, redirect masih ke `/`.
- `components/Sidebar.js`: logo dan nav internal.
- `components/Topbar.js`: logout/profile/notifikasi.
- `components/PokjaDataPage.js`: tabel input Pokja/non-bulanan.
- `components/BumilDataPage.js`: tabel input Bumil bulanan.
- `components/DataStatsPage.js`: statistik per halaman data.
- `components/AiChatBubble.js`: AI assistant dan import preview.
- `lib/dataPages.js`: definisi tabel, kolom, endpoint, judul.
- `lib/validation.js`: validasi baris.
- `lib/chartStats.js`: helper statistik/ranking.
- `lib/auth.js`: auth helper dan permission.
- `lib/api-handler.js`: handler API shared untuk beberapa tabel.
- `public/bg-baturetno.png` dan `public/map-baturetno.svg`: asset visual yang ada.

Known issue:

- `public/logo.png` tidak ada, tetapi dipakai di login dan sidebar. Ini menghasilkan request 404 dan tampilan alt text terpotong.
- Dev console menunjukkan warning: `eval() is not supported in this environment... React requires eval() in development mode`. Cek `next.config.mjs` dan CSP. Di development, CSP perlu mengizinkan `unsafe-eval`; di production jangan longgarkan lebih dari perlu.

## Architecture Requirements

### Route structure

Recommended route structure:

- `/` -> public welcome page baru.
- `/login` -> login page lama yang dipindah dari `app/page.js`.
- `/publik` -> public aggregate portal.
- `/publik/desa/[id]` -> public aggregate detail per desa, tanpa data mentah sensitif.
- `/dashboard` -> dashboard internal existing.
- `/dashboard/desa/[id]` -> internal drill-down detail per desa.

Auth redirects:

- Unauthenticated dashboard access should redirect to `/login`, not `/`.
- Logout can redirect to `/` or `/login`; prefer `/` so users return to the welcome page.
- If an already-authenticated user opens `/login`, optionally redirect to `/dashboard` after validating `/api/auth/me`.

### Public API design

Add public aggregate APIs only if needed by UI:

- `GET /api/public/summary?tahun=2026&bulan=12`
- `GET /api/public/desa/[id]?tahun=2026&bulan=12`
- Optional: `GET /api/public/trend`

Rules:

- Public API must return aggregate totals, completeness summaries, and non-sensitive indicators only.
- Do not return user table, audit logs, raw row-level personal records, auth payloads, or secret-backed admin data.
- Use explicit allowlists for tables and fields. Do not accept arbitrary `table_name` or `column` from query params.
- If using Supabase service role server-side, keep select statements scoped and explicit.
- Add tests or at least smoke checks proving `/api/public/*` does not expose admin/private tables.

### Internal drill-down API design

Add either:

- `GET /api/rekap/desa/[id]?tahun=2026&bulan=12`

or use existing APIs from the page with careful parallel fetching. Prefer a dedicated endpoint if it reduces duplicate client logic.

Internal desa detail should include:

- Desa identity and active status.
- Completion status per table.
- KPI summary for selected year/month.
- Trend for key indicators.
- Per-table totals/values for data umum, Pokja I-IV, kegiatan warga, bumil.
- Validation issue summary using existing `validateRow` logic where feasible.
- Last activity for the desa if audit log can be scoped safely.

## Deliverable 1 - Welcome Page

Replace current `/` login with a welcome page that appears first.

Requirements:

- First screen must clearly show: `Sistem Rekapitulasi Data TP PKK Kecamatan Baturetno`.
- Provide two primary actions:
  - `Masuk Aplikasi` -> `/login`
  - `Lihat Data Publik` -> `/publik`
- Use existing real asset such as `/bg-baturetno.png` or `/map-baturetno.svg`, but keep text readable.
- Avoid putting the hero text inside a heavy card. Use direct hero content over a restrained background, with a hint of next section visible.
- Include concise public summary cards if public summary API is ready; otherwise render static domain-appropriate highlights without fake numbers.
- Add a section explaining, in short operational terms, what the app does: rekap data umum, Pokja, bumil, kegiatan warga, laporan, dan monitoring kelengkapan.
- Keep design government/internal-service style: clear, calm, trustworthy, not a marketing-heavy SaaS landing page.
- Mobile must show headline, short copy, and both CTA buttons without clipping.

Implementation suggestion:

- Move current `app/page.js` content to `app/login/page.js`.
- Create new `app/page.js` for welcome.
- If shared login form logic grows, extract `components/LoginForm.jsx`.

## Deliverable 2 - Public Aggregate Portal

Create `/publik` as public read-only aggregate page.

Content:

- Header/nav: brand, `Masuk Aplikasi`, optional `Beranda`.
- Year and month filters.
- KPI cards:
  - total desa aktif
  - desa lengkap / perlu dicek / belum lengkap
  - selected headline indicators: KK, Jiwa, Dasa Wisma, Posyandu, Ibu Hamil, Kegiatan Warga/JKN-BPJS if available
- Public trend chart for aggregate indicators.
- Public comparison table by desa with safe aggregate fields only.
- Clickable desa row -> `/publik/desa/[id]`.
- Clear note that data shown is agregat, not data pribadi.

`/publik/desa/[id]`:

- Show desa name, status kelengkapan, and aggregate indicators.
- Show per-table completion and selected totals.
- No edit controls, no admin links, no AI assistant unless it is explicitly safe/public.

UX:

- Public pages should be lighter than dashboard but still use the same design language.
- Use skeleton loading and empty states.
- Do not show login-only navigation/sidebar.

## Deliverable 3 - Internal Dashboard Drill-down

Enhance `app/dashboard/page.js` and add internal detail page.

Requirements:

- Matrix Kelengkapan rows should be clickable and navigate to `/dashboard/desa/[id]?tahun=...&bulan=...`.
- Ranking/desa comparison should offer a drill-down action.
- Add an internal detail page at `/dashboard/desa/[id]/page.js`.
- Detail page should include:
  - header with desa name, year/month filters, completion status
  - KPI summary cards
  - tab/segmented control: `Ringkasan`, `Data Umum`, `Pokja I`, `Pokja II`, `Pokja III`, `Pokja IV`, `Kegiatan Warga`, `Bumil`, `Validasi`
  - trend chart for selected key metrics
  - validation issues grouped by table
  - links to edit pages for users with permission
- Use existing `DATA_PAGES`, `validateRow`, `countIssues`, and chart helpers where possible.
- Avoid duplicating hardcoded column definitions.

Design details:

- Keep detail page dense and operational, not decorative.
- Make filters sticky on mobile if useful.
- On mobile, use stacked cards and horizontal tab scroll.

## Deliverable 4 - Fix Broken Logo

Fix all `/logo.png` usage.

Options:

1. Add a real `public/logo.png` if an official logo exists locally.
2. If no official logo exists, replace image source with `/map-baturetno.svg` or create a simple `public/logo.svg` using existing visual identity.

Requirements:

- No 404 for logo in dev server logs.
- No alt text visible inside logo circle.
- Logo remains legible at 32px, 40px, and 80px.
- Apply fix to login, sidebar, and welcome page.

## Deliverable 5 - Login UX Polish

Login page at `/login` should be simpler and more readable.

Requirements:

- Reduce background opacity/decorative motion on mobile.
- Ensure form fields are visible immediately on 390px width.
- Fix text clipping in logo circle.
- Use strong enough contrast between card, background, labels, and placeholders.
- Add `prefers-reduced-motion` behavior if animations remain.
- Add link back to welcome page.
- Add `Lupa password? Hubungi admin` or similar operational hint.
- Keep error messages clear for failed login/rate limit.

## Deliverable 6 - Dashboard Mobile Toolbar

Current dashboard mobile stacks many action buttons. Improve it.

Requirements:

- Group filters into a compact toolbar.
- Use a menu/overflow for secondary actions: template, export Excel, export Word, import.
- Keep primary filter controls easy to reach: tahun, bulan, jenis data.
- Avoid action buttons wrapping into awkward multi-line rows.
- On desktop, preserve efficient quick actions.

Implementation suggestion:

- Extract `DashboardToolbar` component from `app/dashboard/page.js` if the page is getting too large.
- Use icon+label for primary actions, icon-only with tooltip for repeated secondary actions where appropriate.

## Deliverable 7 - Visual System Polish

The UI currently reads heavily green. Keep PKK identity but improve hierarchy.

Requirements:

- Keep green as primary brand color.
- Use functional accents consistently:
  - green: success/complete
  - amber: warning/perlu dicek
  - red: error/belum lengkap/delete
  - blue: info/activity/export Word
- Reduce large green page background dominance where it hurts readability.
- Avoid making every card border/background a green variant.
- Keep card radius consistent, preferably 12px unless existing pattern strongly requires 16px.
- Review `tailwind.config.js` and `app/globals.css`; adjust carefully without broad churn.
- Do not use decorative gradient orbs/blobs.

## Deliverable 8 - Data Table UX for Small Screens

Existing mobile card is useful, but large data entry is still heavy. Improve without redesigning the database.

Requirements:

- Add column search/filter for desktop tables where columns are many.
- Add density toggle: `Compact` / `Nyaman` for desktop data tables.
- Add clearer group headers if columns can be grouped from existing labels/config.
- Add jump-to-desa or quick desa navigation on mobile.
- For mobile cards, add collapsible groups so users are not forced to scroll through all fields at once.
- Keep `Simpan Semua`, dirty state, validation warning, and `Ctrl+S` behavior intact.
- Do not remove autosave unless replacing it with an equally clear save model.

Suggested components:

- `components/DataTableControls.jsx`
- `components/MobileDataEntryCard.jsx` if duplication between `PokjaDataPage` and `BumilDataPage` becomes too high.

## Deliverable 9 - Dev Overlay / CSP Warning

Fix the development warning visible as `1 Issue` in Edge/Chrome when running locally.

Observed log:

`eval() is not supported in this environment... React requires eval() in development mode`

Requirements:

- Inspect `next.config.mjs` for Content-Security-Policy headers.
- In development only, allow `script-src 'unsafe-eval'` if CSP is blocking React dev tooling.
- In production, keep CSP strict and do not add unnecessary `unsafe-eval`.
- Verify the red browser issue bubble is gone in local dev screenshot.

## Accessibility and Responsiveness Checklist

- All icon-only buttons have `aria-label` and/or `title`.
- Inputs have visible labels or correct accessible labels.
- Focus states are visible.
- Text must not clip on 390px mobile width.
- Important action menus work with keyboard and outside click.
- Public pages do not rely on hover-only interactions.
- Charts have text alternatives or surrounding labels that explain the metric.

## Security and Privacy Requirements

- Public portal must not expose private raw records, users, audit logs, or admin controls.
- Internal dashboard detail must require auth through existing dashboard guard and API auth checks.
- Never trust client-side role/localStorage for sensitive API behavior.
- Public APIs must use hardcoded table/field allowlists.
- Do not expose Supabase service role, JWT secret, or Gemini key to browser.

## Testing and Verification

Run after implementation:

```bash
npm test
npm run build
npm run dev
```

Manual smoke checks:

- `GET /` shows welcome page, not login.
- `GET /login` shows login form and no broken logo request.
- Unauthenticated `/dashboard` redirects to `/login`.
- Login still works.
- Logout returns to welcome or login as designed.
- `/publik` loads without auth and only shows aggregate data.
- `/publik/desa/[id]` loads without auth and shows no edit/private controls.
- `/dashboard` matrix rows navigate to `/dashboard/desa/[id]`.
- `/dashboard/desa/[id]` requires auth and shows detail tabs.
- Mobile 390x844 screenshots for `/`, `/login`, `/publik`, `/dashboard`, and `/dashboard/desa/[id]` show no clipped text/overlap.
- Desktop 1366x768 screenshots show toolbar and dashboard layout cleanly.
- Browser dev overlay `1 Issue` is gone or explained if it is from an unrelated external extension.

## Suggested Implementation Order

1. Move login to `/login`, create welcome page at `/`, update redirects/logout links.
2. Fix logo asset/reference.
3. Add public aggregate API and `/publik` page.
4. Add `/publik/desa/[id]` page.
5. Add internal desa drill-down API/page and link dashboard matrix rows.
6. Polish dashboard mobile toolbar.
7. Improve visual palette/radius/readability.
8. Improve data table controls/mobile card collapses.
9. Fix CSP dev warning.
10. Run tests/build/screenshots and document results.

## Definition of Done

- User sees welcome page first at `/`, not login.
- Login is available at `/login` and works as before.
- Public aggregate portal exists and does not leak private data.
- Dashboard supports drill-down to desa detail.
- Broken logo is fixed everywhere.
- Mobile login and dashboard are readable and unclipped.
- Dashboard toolbar is usable on mobile.
- Tables have better controls for large column sets and mobile input.
- Visual style is less one-note green while preserving PKK identity.
- Dev CSP warning is resolved or specifically documented.
- `npm test` and `npm run build` pass, or failures are explained with exact causes.
