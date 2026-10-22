## 2026-10-22T15:22:45Z
You are worker_m2_frontend_4, a Specialist Frontend UI/UX, A11y & PWA Implementation Worker.
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m2_frontend_4
Parent orchestrator conversation ID: ffab784d-de42-4b37-aceb-f1c33fa6d63b

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY REFERENCES TO READ FIRST:
1. `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md` (section ## Follow-up — 2026-10-22T15:08:05Z)
2. `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\orchestrator_4\PROJECT.md`
3. Detailed architectural blueprint and line-by-line findings in:
   `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_frontend_4\handoff.md`

EXCLUSIVE FILE OWNERSHIP (You may ONLY modify these files):
- `app/globals.css`
- `components/NestedDataPage.js`
- `components/BumilDataPage.js`
- `lib/useLocalDraft.js` (create new file)
- `app/manifest.js` (create new file)
- `components/charts/DusunBarChart.jsx`
- `components/charts/KaderDonut.jsx`
- `components/charts/StackedBumilBar.jsx`

DETAILED TASKS TO IMPLEMENT:
1. `app/globals.css` & `components/NestedDataPage.js`:
   - Implement `.cell-error` and `.cell-warning` classes with proper translucent red/yellow backgrounds and specular borders in dark mode (`.dark .nested-table table input.cell-error`, etc.) to resolve dark mode collisions.
   - Fix critical bug in `components/NestedDataPage.js`: relocate `SteppedForm` out of `VerticalText` and place it cleanly into the main component.
2. `components/NestedDataPage.js` & `components/BumilDataPage.js`:
   - Harmonize header controls with VisionOS Liquid Glass: replace hardcoded `bg-white border-gray-200` with `.glass-pill`, `.glass-input`, and `dark:text-gray-100`.
   - Add danger `ConfirmModal` (`type="danger"`) on the "Batalkan" button in `BumilDataPage.js` to prevent accidental discarding of unsaved edits.
3. 1-Click Carry-Over Data Periode Lalu:
   - In `NestedDataPage.js` and `BumilDataPage.js`, add a "Salin Data Bulan Lalu" action when a monthly period is empty.
   - Fetches previous month (or Dec previous year), copies snapshot fields to draft for editable dusun, marks status dirty, dan confirms safely before save.
4. Auto-Draft & PWA:
   - Create `lib/useLocalDraft.js` that auto-saves uncommitted edits to `localStorage` (keyed by `tableName + tahun + bulan + dusunId`), shows a banner offering to restore unsaved changes upon page reopen, and clears the draft when saved.
   - Create `app/manifest.js` supporting PWA installability with emerald theme `#047857` and `/logo.png`.
5. Accessibility (A11y):
   - In `components/charts/KaderDonut.jsx`, add `role="img"` and descriptive `aria-label` to the `<svg>` element.
   - In `DusunBarChart.jsx` and `StackedBumilBar.jsx`, enhance SVG accessibility.
   - Ensure toast notifications in `NestedDataPage.js`, `BumilDataPage.js`, and `PokjaDataPage.js` have `role="status"` and `aria-live="polite"`.

VERIFICATION:
- Run `npm test` using run_command to verify all tests pass without regressions.
- Document commands and results in your `handoff.md` in your working directory.
- Send a completion message to parent orchestrator via send_message.
