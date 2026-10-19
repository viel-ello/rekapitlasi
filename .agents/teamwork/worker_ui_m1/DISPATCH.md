## 2026-10-12T15:28:19Z
You are the Implementation Worker for Milestone 1: Apple iOS / VisionOS Frosted Glass Design System & WCAG AA Contrast Compliance (`worker_ui_m1`).

Your working directory is:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_ui_m1`

You MUST read the authoritative user request at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically see section `## Follow-up — 2026-10-12T15:13:12Z`).

You MUST also read the Project scope document at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\PROJECT.md`
and the Explorer Blueprint report at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_ui\handoff.md`

You have access to the UI/UX design intelligence skill at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agent\skills\ui-ux-pro-max\SKILL.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Ownership (You own these exclusively):
- `app/globals.css`
- `tailwind.config.js`
- `components/Sidebar.js`
- `components/Topbar.js`
- `components/DashboardToolbar.jsx`
- `components/DensityToggle.jsx`
- `components/ui/Dialog.jsx`
- `components/ConfirmModal.js`
- `components/charts/DusunBarChart.jsx`
- `components/charts/KaderDonut.jsx`
- `components/charts/StackedBumilBar.jsx`
- `components/PokjaDataPage.js`
- `components/BumilDataPage.js`
- `components/NestedDataPage.js`
- `components/DataStatsPage.js`

Objectives to Implement:
1. Design Tokens (`app/globals.css` & `tailwind.config.js`):
   - Refine design tokens in `app/globals.css` per Section 4.1 of `explorer_survey_ui/handoff.md`:
     * Substantive frosted surface: milky/smoky (78%–88% light opacity e.g. `rgba(255, 255, 255, 0.82)`, 75%–85% dark opacity e.g. `rgba(15, 23, 20, 0.82)`), avoiding flimsy transparency.
     * Deep diffusion & saturation: `backdrop-filter: blur(28px) saturate(180%)` with `-webkit-backdrop-filter`.
     * Satin sheen & specular highlights: top inner specular edge lighting (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.50)` light, `inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)` dark), delicate 1px luminous rim border, diffuse elevation (`box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06)`).
     * Hierarchy tokens: `.glass`, `.glass-card`, `.glass-panel`, `.glass-header`, `.glass-pill`, `.glass-input`.
   - Update `tailwind.config.js` with dark surface colors (`surface.dark: '#0f1714'`, `surface.dark-elevated: '#15201b'`) and box shadows per Section 4.3.
   - Clean up CSS bugs:
     * Fix duplicate `.dark .sidebar` in `globals.css` so dark mode preserves frosted glass texture instead of solid `#111c18` (Section 4.2).
     * Clean up duplicate conflicting rules for `.dark .data-table` and `.dark .bg-white`.
     * Fix invalid class `background-[#f0fdf4]` in `components/PokjaDataPage.js:750` -> `bg-[#f0fdf4] dark:bg-emerald-950/60`.
     * Fix phantom class `dark:bg-card-dark` in `components/NestedDataPage.js:725, 735` -> `dark:bg-surface-dark`.
2. Component Adoption:
   - Navigation Shell: Update `Sidebar.js` and `Topbar.js` with frosted glass panels, headers, and highlights.
   - Toolbars & Controls: Update `DashboardToolbar.jsx` (export/import groups, filters) and `DensityToggle.jsx` with `.glass-pill`.
   - Dialogs & Modals: Update `Dialog.jsx` (`panelClassName="... glass-panel rounded-3xl"`, `backdropClassName="... bg-gray-950/45 backdrop-blur-md"`) and `ConfirmModal.js`.
   - Standalone Charts: Update `DusunBarChart.jsx`, `KaderDonut.jsx`, `StackedBumilBar.jsx` from plain `bg-white` to `glass rounded-3xl p-5`.
   - Data Pages: Replace hardcoded inline `background: '#fff'`, `#f9fafb`, `#f0fdf4` in `PokjaDataPage.js`, `BumilDataPage.js`, and `NestedDataPage.js` with semantic classes (`bg-white dark:bg-surface-dark`, `bg-gray-50 dark:bg-surface-dark-elevated`, `bg-emerald-50 dark:bg-emerald-950/60`) so sticky cells adapt cleanly to dark mode.
3. WCAG AA Contrast Compliance:
   - Ensure text contrast is strictly > 4.5:1 for body text, > 3:1 for large headers on both light & dark frosted surfaces.
   - Remap low-contrast `text-gray-400` in light mode (e.g., timestamps, subtext, helper labels) to `text-gray-600` / `text-gray-700` (>= 5.7:1).
   - Add explicit `dark:text-gray-300` / `dark:text-gray-200` to text elements so dark frosted surfaces have crisp contrast.
   - Ensure sticky table headers and inputs remain crisp and legible in both light and dark modes.
4. Build & Test Verification:
   - Run `npm test -- --selectProjects server` to ensure 100% passing (19 suites, 180 tests).
   - Run `npm run build` to verify clean compilation without errors.
   - Verify zero mutations against live production Supabase.
