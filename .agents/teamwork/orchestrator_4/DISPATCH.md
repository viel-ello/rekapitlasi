# Dispatch Assignment

## 2026-10-22T15:09:59Z
You are the Project Orchestrator (orchestrator_4) for Lumbung Data PKK Desa Belikurip.

Your assigned working directory is:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\orchestrator_4`

Please read the latest user request in:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md`
under the section `## Follow-up — 2026-10-22T15:08:05Z`.

### Scope of Work:
1. **R1. Perbaikan Kritis Backend, Agregasi Ekspor, & Report Builder (P0)**:
   - NaN cast corruption & formula injection prevention in `app/api/reports/build/route.js` (sanitizeCellText, only Number() valid numeric columns).
   - Fix 12x stock inflation on annual exports in `app/api/export/word/route.js` and `excel/route.js` for snapshot tables (`data_umum`, `data_rekap_dawis`) by taking the latest available month per dusun instead of summing 12 months. Support `?bulan=MM` in Word export.
   - Upsert mutation in `app/api/chat/confirm-mutation/route.js` on conflict key.
   - Overfetching query optimization in `app/api/rekap/route.js` (reuse prefetched tables for completeness check).
2. **R2. Harmonisasi UI/UX, Dark Mode, & Aksesibilitas (P1)**:
   - Fix error/warning validation border/background in dark mode in `app/globals.css` and `NestedDataPage.js` using `.cell-error` and `.cell-warning`.
   - Liquid Glass consistency on `NestedDataPage.js` header controls (`.glass-pill`, `.glass-input`, `dark:text-gray-100`).
   - Danger ConfirmModal on "Batalkan" button in `BumilDataPage.js`.
   - SVG chart accessibility (`role="img"`, `aria-label`) on `DusunBarChart.jsx`, `KaderDonut.jsx`, `StackedBumilBar.jsx`, and toast accessibility (`role="status"`, `aria-live="polite"`).
3. **R3. 1-Click Carry-Over Data Periode Lalu**:
   - Toolbar button in `NestedDataPage.js` and `BumilDataPage.js` to copy previous period's stock data into empty months with confirmation.
4. **R4. Auto-Draft LocalStorage & Mode Offline PWA**:
   - `lib/useLocalDraft.js` auto-saving dirty edits per table/year/month, banner restore, clear upon successful save.
   - `app/manifest.js` for PWA installation support.
5. **R5. High-Impact Improvisations**:
   - Cross-Table Data Quality Auditor (`lib/dataQuality.js` & `components/DataQualityAuditor.jsx`) with VisionOS glass alert cards on Dashboard.
   - Liquid Glass Completeness Heatmap 9 Dusun × 12 Bulan (`components/CompletenessHeatmap.jsx`).
   - Portal Publik 2.0: Infografis Kilas Dusun (`app/publik/page.js` & `components/public/KilasDusunInfographic.jsx`), Dusun Benchmark Matrix (`components/public/DusunBenchmarkMatrix.jsx`), and Shareable Report Card (`components/public/ShareableReportCard.jsx`).
6. **R6. DevOps & Test Safety Guard (P2)**:
   - `isProductionUrl(baseURL)` guard in `e2e/auth.setup.mjs`.
7. **R7. Adversarial Peer Auditing**:
   - Dispatch specialist implementers and independent auditor/challenger subagents to verify implementation, test suites, a11y, and visionOS glass compliance.

### Explicitly Excluded Features (DO NOT implement):
- ❌ Rate Limiter AI pada `/api/chat`
- ❌ Peta Geospasial Choropleth
- ❌ Pengingat WhatsApp 1-Klik
- ❌ Sistem Peringatan Dini (Early Warning)
- ❌ Generator Narasi Laporan Tahunan AI
- ❌ Blok Tanda Tangan Resmi pada Ekspor

### Quality & Operational Rules:
- Maintain your own `BRIEFING.md` and `progress.md` in `.agents/teamwork/orchestrator_4/` updated frequently so the Sentinel can monitor progress.
- Zero live production database mutation.
- All 31 Jest test suites must pass 100% (`npm test`).
- Next.js 16 build (`npm run build`) must succeed with 0 errors.
- Report back with a victory claim and comprehensive summary once all acceptance criteria are met.
