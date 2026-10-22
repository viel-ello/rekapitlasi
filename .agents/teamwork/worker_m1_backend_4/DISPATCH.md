## 2026-10-22T15:22:45Z
You are worker_m1_backend_4, a Specialist Backend & DevOps Implementation Worker.
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m1_backend_4
Parent orchestrator conversation ID: ffab784d-de42-4b37-aceb-f1c33fa6d63b

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY REFERENCES TO READ FIRST:
1. `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md` (section ## Follow-up — 2026-10-22T15:08:05Z)
2. `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\orchestrator_4\PROJECT.md`
3. Detailed architectural blueprint and line-by-line findings in:
   `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_backend_4\handoff.md`

EXCLUSIVE FILE OWNERSHIP (You may ONLY modify these files):
- `app/api/reports/build/route.js`
- `app/api/export/excel/route.js`
- `app/api/export/word/route.js`
- `app/api/chat/confirm-mutation/route.js`
- `app/api/rekap/route.js`
- `e2e/auth.setup.mjs`

DETAILED TASKS TO IMPLEMENT:
1. `app/api/reports/build/route.js`:
   - Fix NaN casting and formula injection in custom report builder.
   - For text columns (`c.type === 'text'` or where `Number.isNaN(Number(r[c.key]))`), do not cast to `Number(r[c.key] || 0)`.
   - Apply `sanitizeCellText` to Excel text cells to prevent CSV/formula injection (`=`, `+`, `-`, `@`). Retain strings for Word and PDF.
2. `app/api/export/word/route.js` & `excel/route.js`:
   - Define snapshot tables `SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis'])`.
   - For annual exports without a specific `bulan`, select the latest available month record per dusun for snapshot tables (preventing 12x inflation of KK, Jiwa, RT/RW, etc.) while keeping cumulative sums for event tables like `data_bumil`.
   - In `app/api/export/word/route.js`, support `?bulan=MM` query parameter.
3. `app/api/chat/confirm-mutation/route.js`:
   - Replace `.update(...)` with `.upsert(payload, { onConflict: v.isMonthly ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun' })`.
   - Ensure proper error handling and audit logging.
4. `app/api/rekap/route.js`:
   - Optimize query overfetching: update `bumilList` query to `.select('*')`, map prefetched tables for the current year, and reuse them in `tableChecks` instead of calling `fetchRows` 7 more times.
5. `e2e/auth.setup.mjs`:
   - Import `isProductionUrl` from `../playwright.config.mjs` and abort with an explicit error if `isProductionUrl(baseURL)` is true and `process.env.E2E_ALLOW_PROD_READ !== '1'`.

VERIFICATION:
- Run `npm test` using run_command to verify that all 31 test suites continue to pass 100% without any regressions.
- Document commands and results in your `handoff.md` in your working directory.
- Send a completion message to parent orchestrator via send_message.
