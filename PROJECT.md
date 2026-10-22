# Project: Framer Motion & 21st.dev UI/UX Upgrade for Lumbung Data PKK Desa Belikurip

## Architecture
- Framework: Next.js 16.4.0 (App Router, Turbopack) + React 19.2.4
- Animation Engine: Framer Motion 12.38.0 (`framer-motion`)
- Styling & Aesthetics: VisionOS Translucent Liquid Glass (`app/globals.css`, `.glass`, `.glass-card`, `.glass-panel`) + PKK Emerald Palette (`primary-50` ... `primary-900`)
- Motion Architecture:
  - Global Configuration: `<MotionConfig reducedMotion="user">` in `components/ThemeProvider.jsx`
  - Component Guards: `useReducedMotion()` from `framer-motion` for direction/delay conditional bypass
  - GPU Exclusivity: Runtime animations strictly bound to `transform` (`x`, `y`, `scale`) and `opacity`. Zero dynamic manipulation of `backdrop-filter` in motion loops to guarantee 60fps+.

## Code Layout & File Boundaries
- M0 (Test Harness): `jest.setup.js`, `__tests__/**`
- M1 (Navigation & Layout): `components/Sidebar.js`, `components/DashboardToolbar.jsx`, `components/ui/FormProgressBar.jsx`, `app/dashboard/admin/page.js`, `app/dashboard/admin/tabs/ColumnsTab.jsx`, `components/DensityToggle.jsx`
- M2 (Cards & Counters): `app/dashboard/page.js`, `components/DataStatsPage.js`, `components/AnimatedCounter.js`, `components/ui/AnimatedCounter.jsx`
- M3 (Dialogs & Forms): `components/ui/Dialog.jsx`, `components/ui/SteppedForm.jsx`
- M4 (Topbar & Gestures): `components/Topbar.js`, `components/ui/Button.jsx`
- M5 (Final Integration & E2E): Full project verification & audit

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Test Harness Motion Mocks | JSDOM polyfills for `matchMedia`, `IntersectionObserver`, and `ResizeObserver` | M0 | Survey (af576704) | DONE |
| 2 | Sidebar Sliding Active Pill | `layoutId="sidebarActivePill"` gliding indicator with spring physics | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 3 | DashboardToolbar Sliding Pill | `layoutId="dashboardFilterPill"` sliding active pill for data filters | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 4 | FormProgressBar Sliding Pill | `layoutId="formProgressActivePill"` active step indicator with spring physics | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 5 | Admin Tabs Sliding Pill | `layoutId="adminActiveTabIndicator"` and subtab sliding highlight | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 6 | DensityToggle Sliding Pill | `layoutId="densityTogglePill"` 2-state compact/comfortable switch | M1 | Survey (2e2aabb2) | DONE |
| 7 | Liquid Glass KPI Cards Entrance | Staggered entrance animation berantai (`variants`, `staggerChildren`) | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 8 | KPI Cards Hover Physics | `whileHover={{ y: -4, scale: 1.015 }}` with spring physics and sheen highlight | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 9 | AnimatedCounter Easing & A11y | Count-up metrics with `useReducedMotion` fallback in `AnimatedCounter` | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 10 | Dialog.jsx AnimatePresence | Modal dialog exit animation (`opacity: 0 ↔ 1`, `scale: 0.95 ↔ 1`) | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 11 | SteppedForm Directional Slide | Smooth horizontal slide transitions with `mode="popLayout"` & `custom={direction}` | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 12 | Topbar Dropdowns AnimatePresence | Spring pop entrance and exit for notification & profile menus | M4 | ORIGINAL_REQUEST §R4 | DONE |
| 13 | Primary Action Spring Tap | `whileTap={{ scale: 0.97 }}` on primary buttons (Export, Simpan, Tambah Data) | M4 | ORIGINAL_REQUEST §R4 | DONE |
| 14 | A11y & Reduced Motion Compliance | Full support for `prefers-reduced-motion` across all components | M5 | ORIGINAL_REQUEST §R5 | DONE |
| 15 | Full Test & Build Verification | 100% `npm test` pass + clean Turbopack `npm run build` | M5 | ORIGINAL_REQUEST Acceptance | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Test Harness & Motion Setup | JSDOM mocks in `jest.setup.js` for matchMedia / IntersectionObserver | none | DONE |
| M1 | Navigation & Layout Morphing | `layoutId` pills in Sidebar, DashboardToolbar, FormProgressBar, Admin Tabs | M0 | DONE |
| M2 | KPI Cards & Physics | Staggered entrance, hover elevation, specular sweep, AnimatedCounter | M0 | DONE |
| M3 | Dialogs & Step Transitions | AnimatePresence exit in Dialog.jsx and directional SteppedForm | M0 | DONE |
| M4 | Topbar & Micro-Gestures | Topbar dropdown pop physics and button spring whileTap | M0 | DONE |
| M5 | Final Integration & Adversarial Verification | Full test suite verification, build check, audit gate | M1, M2, M3, M4 | DONE |

## Interface Contracts
### `layoutId` Namespace Allocation
- `sidebarActivePill`: `components/Sidebar.js`
- `dashboardFilterPill`: `components/DashboardToolbar.jsx`
- `formProgressActivePill`: `components/ui/FormProgressBar.jsx`
- `adminActiveTabIndicator`: `app/dashboard/admin/page.js`
- `columnsSubtabIndicator`: `app/dashboard/admin/tabs/ColumnsTab.jsx`
- `densityTogglePill`: `components/DensityToggle.jsx`

### Modal Dialog Contract (`components/ui/Dialog.jsx`)
- Props: `{ open, onClose, title, description, children, size = 'md', className = '' }`
- Internal: Wrapped in `<AnimatePresence>` rendering `<motion.div className="fixed inset-0 ...">` backdrop and `<motion.div className="glass-panel ...">` modal panel.
- Exit physics finish before DOM unmount. Focus trap uses semantic `!disabled && !aria-hidden` attributes.

### SteppedForm Directional Contract (`components/ui/SteppedForm.jsx`)
- Direction state: `const [direction, setDirection] = useState(1);` (+1 forward, -1 backward).
- Internal: `<AnimatePresence mode="popLayout" custom={direction} initial={false}>`
- Child step wrapped in `<motion.div custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">`.
- `EMPTY_DATA` constant prevents infinite loops, `prevOpenRef` guards in-progress state, and functional updaters clamp via `Math.min`/`Math.max`.

### AnimatedCounter Contract (`components/AnimatedCounter.js` & `components/ui/AnimatedCounter.jsx`)
- Props: `{ value, duration = 1.2, prefix = '', suffix = '', formatLocale = true, className = '' }`
- Checks `useReducedMotion()`. If reduced motion is preferred, immediately displays formatted final value.
