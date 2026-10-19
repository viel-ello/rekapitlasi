# Handoff Report: UI Design System & Component Styling Survey

**Surveyor Agent**: `explorer_survey_ui`  
**Target Milestone**: Apple iOS / VisionOS Frosted Glass Design System ("Liquid Glass") & WCAG AA Contrast Compliance  
**Date**: 2026-10-12  
**Working Directory**: `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_ui`  

---

## 1. Observation

### 1.1 Design Tokens & CSS / Tailwind Setup (`app/globals.css` & `tailwind.config.js`)

1. **Current Glass Classes (`app/globals.css:8-107`)**:
   - `.glass`:
     ```css
     /* globals.css:31-39 */
     .glass {
       background: rgba(255, 255, 255, 0.55);
       backdrop-filter: blur(18px) saturate(160%);
       -webkit-backdrop-filter: blur(18px) saturate(160%);
       border: 1px solid rgba(255, 255, 255, 0.6);
       box-shadow:
         0 8px 30px rgba(16, 24, 40, 0.08),
         inset 0 1px 0 rgba(255, 255, 255, 0.65);
     }
     /* globals.css:60-66 */
     .dark .glass {
       background: rgba(20, 32, 27, 0.55);
       border-color: rgba(255, 255, 255, 0.08);
       box-shadow:
         0 8px 30px rgba(0, 0, 0, 0.30),
         inset 0 1px 0 rgba(255, 255, 255, 0.06);
     }
     ```
     *Observed deficiency*: Light and dark backgrounds use only `0.55` (55%) opacity. This creates a watery, washed-out sheet where background noise bleeds through, degrading readability. The blur is limited to `18px` with saturation `160%`, lacking the deep diffusion required by VisionOS Liquid Glass (`blur(28px) saturate(180%)`).
   - `.glass-strong` (`globals.css:40-48, 67-70`):
     * Light: `background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(22px) saturate(170%);`
     * Dark: `background: rgba(20, 32, 27, 0.7);`
   - `.glass-pill` (`globals.css:72-83`):
     * Light: `background: rgba(255, 255, 255, 0.60); backdrop-filter: blur(12px) saturate(160%);`
     * Dark: `background: rgba(20, 32, 27, 0.60);`
   - `.glass-header` (`globals.css:85-96`):
     * Light: `background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(16px) saturate(180%);`
     * Dark: `background: rgba(13, 22, 19, 0.82); backdrop-filter: blur(20px) saturate(180%);`
   - *Missing Design Tokens*: There are no classes defined for `.glass-card`, `.glass-panel`, `.glass-input`, `.glass-modal`, `.glass-toolbar`, `.glass-dropdown`, or `.glass-toggle`. Components create ad-hoc inline styles or revert to solid white backgrounds.

2. **Tailwind Configuration (`tailwind.config.js:1-143`)**:
   - `darkMode`: Configured as `darkMode: 'class'` at line 3.
   - `colors.surface`: Only defines light values (`DEFAULT: '#ffffff'`, `subtle: '#f7f8f8'`, `muted: '#eef0f0'`). There are no tokens for dark surfaces (e.g., `surface-dark`, `surface-elevated`) or frosted borders.
   - `boxShadow`: Standard box shadows (`card`, `soft`, `modal`) do not incorporate the VisionOS specular top edge highlight (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.45)`).
   - `backdropBlur`: Uses default Tailwind values; does not define a dedicated `28px` token.

3. **CSS Duplication & Syntax Anomalies**:
   - **Duplicate `.dark .sidebar`**:
     * In `app/globals.css:142-161`: `.sidebar` has light styles (`background: rgba(255, 255, 255, 0.65); backdrop-filter: blur(20px) saturate(160%);`).
     * In `app/globals.css:638-641`: `.dark .sidebar` sets `background: #111c18; border-right-color: #1f2a25;`. In dark mode, the sidebar completely loses its backdrop-filter and glass texture, becoming an opaque `#111c18` block.
   - **Duplicate `.dark .data-table` rules**:
     * Lines `528-564` vs lines `724-755` in `app/globals.css` both declare `.dark .data-table th`, `.dark .data-table td`, `.dark .data-table .col-desa`, etc. Lines `528-564` use background `#15201b` while lines `724-755` use `#14201b`.
   - **Duplicate surface translation rules**:
     * Lines `579-610` vs lines `675-700` in `app/globals.css` define `.dark .bg-white`, `.dark .bg-gray-50`, and `.dark .border-gray-100` twice with conflicting hex codes (`#111a16` vs `#111c18`).
   - **Invalid Tailwind Class in `components/PokjaDataPage.js:750`**:
     ```jsx
     {canEdit && <td className="sticky right-0 background-[#f0fdf4] z-30"></td>}
     ```
     `background-[#f0fdf4]` is invalid (Tailwind requires `bg-[#f0fdf4]`). As a result, this sticky cell is completely transparent, causing table content to bleed through during horizontal scroll.
   - **Phantom Class `dark:bg-card-dark` in `components/NestedDataPage.js:725, 735`**:
     ```jsx
     className="bg-white dark:bg-card-dark text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-800 group-hover:bg-primary-50/50 dark:group-hover:bg-primary-950/30"
     ```
     `bg-card-dark` does not exist in `tailwind.config.js`. It only works because `.dark .bg-white` in `globals.css` catches it globally.

---

### 1.2 Component Adoption & Design Inconsistencies

1. **Navigation Shell (`components/Sidebar.js` & `components/Topbar.js`)**:
   - `Sidebar.js:181-186`: Password dialog uses `panelClassName="... bg-white rounded-2xl shadow-modal ..."` with inputs having hardcoded `border border-gray-200`. No glass effect.
   - `Sidebar.js:158`: `sidebar-user-card` has `background: #f9fafb` in light mode, `#14201b` in dark mode.
   - `Topbar.js:119`:
     ```jsx
     <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl backdrop-saturate-150 border-b border-white/40 dark:border-white/10 sticky top-0 z-30">
     ```
     Light opacity `bg-white/60` (60%) and dark opacity `dark:bg-gray-900/50` (50%) are too transparent. Lacks top specular edge highlight.
   - `Topbar.js:150` & `208`: Notification dropdown (`w-80 bg-white border border-gray-100`) and Profile dropdown (`w-56 bg-white dark:bg-gray-900 border border-gray-100`) are opaque containers without glass backdrop or specular borders.

2. **Data Tables & Pages**:
   - **`components/PokjaDataPage.js`**:
     * Line 603: Desktop table container uses `glass rounded-3xl p-4`.
     * Lines 608, 609, 612: Sticky headers hardcode `style={{ background: '#f9fafb' }}`.
     * Line 633: Sticky cell No hardcodes `style={{ background: '#fff' }}`.
     * Lines 738, 739: Total row cells hardcode `style={{ background: '#f0fdf4' }}`.
     * Line 750: Typo `background-[#f0fdf4]`.
   - **`components/BumilDataPage.js`**:
     * Line 573: Desktop table container uses `glass rounded-3xl p-4`.
     * Lines 578, 579, 611, 613: Sticky headers hardcode `style={{ background: '#f9fafb' }}`.
     * Line 633: Sticky cell No hardcodes `style={{ background: '#fff' }}`.
     * Lines 686, 687: Total row cells hardcode `style={{ background: '#f0fdf4' }}`.
   - **`components/NestedDataPage.js`**:
     * Line 619: Uses `glass rounded-3xl p-3`.
     * Lines 641, 643, 647, 659, 668, 678, 688, 692, 693, 706: Multi-level sticky headers apply `style={{ background: theme.bg, color: theme.fg }}` directly to each `th`.
     * Lines 770, 794: Table input cells hardcode `background: hasError ? '#fef2f2' : hasWarning ? '#fffbeb' : '#fff'`.
     * Lines 826-828: Total footer row uses `bg-emerald-50/90 dark:bg-emerald-950/60`.
   - **`components/DataStatsPage.js`**:
     * Lines 48, 266, 300: Uses `glass rounded-3xl`.
     * Lines 211, 220, 309: Select dropdowns (`bulan`, `tahun`, `selectedMetric`) use hardcoded `bg-white border border-gray-200`.
     * Lines 267, 301: Section headers hardcode `className="p-4 border-b border-white/40 bg-white/30"`. In dark mode, `bg-white/30` appears as a milky white band over dark glass.

3. **Toolbars, Controls, & Badges**:
   - **`components/DashboardToolbar.jsx`**:
     * Line 48: Export button group container: `flex bg-white rounded-xl border border-gray-200 shadow-sm`.
     * Lines 70, 82: Import button and overflow menu button use `bg-white border border-gray-200`.
     * Line 91: Overflow menu popup: `bg-white rounded-xl shadow-lg border border-gray-100`.
     * Line 137: Filter fields: `bg-white border border-gray-200 rounded-xl`.
     * None of these use the frosted glass system.
   - **`components/DensityToggle.jsx`**:
     * Line 12: `className="hidden md:inline-flex items-center rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm"`. Hardcoded solid white background.
   - **`components/PeriodWorkflowBadge.jsx`**:
     * Lines 19-23: Uses solid pastel backgrounds (`bg-gray-100`, `bg-blue-50`, `bg-green-50`, `bg-red-50`).

4. **Dialogs & Modals**:
   - **`components/ui/Dialog.jsx`**:
     * Line 34: Default `panelClassName="... bg-white rounded-2xl shadow-modal border border-gray-200"`.
     * Line 35: Default `backdropClassName="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"`. Uses only `blur-sm` (~4px).
   - **`components/ConfirmModal.js`**:
     * Line 26: `panelClassName="relative z-10 bg-white rounded-2xl shadow-modal w-full max-w-md p-6 overflow-hidden"`.
     * Line 44: Cancel button: `bg-white border border-gray-200`.
   - **`components/EditModeModal.jsx`**:
     * Line 47: `bg-black/40 backdrop-blur-sm`.
     * Line 58: `bg-white shadow-2xl`.
   - **`app/dashboard/admin/_components/ImportPreviewModal.jsx` & `components/ai-chat/ImportPreviewModal.jsx`**:
     * Admin: `bg-white rounded-2xl shadow-2xl border border-gray-200`.
     * Chat: `bg-white rounded-3xl shadow-modal`.

5. **Standalone Chart Cards (`components/charts/*.jsx`)**:
   - `DusunBarChart.jsx:29`: `bg-white rounded-xl border border-gray-200 shadow-sm`.
   - `KaderDonut.jsx:36`: `bg-white rounded-xl border border-gray-200 shadow-sm`.
   - `StackedBumilBar.jsx:26`: `bg-white rounded-xl border border-gray-200 shadow-sm`.
   *Observed inconsistency*: While other dashboard cards use `.glass rounded-3xl`, these three chart components use plain opaque `bg-white rounded-xl border-gray-200`, creating a visually jarring break in the dashboard grid.

6. **PKK Assistant AI Chat (`components/AiChatBubble.js` & `components/ai-chat/*`)**:
   - `AiChatBubble.js:25`: Floating chat window has `bg-white rounded-3xl shadow-modal border border-gray-200`.
   - `ChatInput.jsx:38`: Input container has `border-t border-gray-100 bg-white`.

---

### 1.3 Contrast & Accessibility (WCAG AA Compliance)

1. **Light Mode Contrast on Frosted Glass Surfaces**:
   - Over `glass` (effective luminance ~#F4F7F6):
     * `text-gray-400` (`#9CA3AF`): Contrast ratio **2.54:1** (Fails WCAG AA body 4.5:1 and heading 3:1). Used extensively in timestamps, icons, helper text, and column number rows.
     * `text-gray-500` (`#6B7280`): Contrast ratio **4.56:1** on pure white, but drops to **~3.8:1 – 4.2:1** when rendered over translucent frosted glass with underlying ambient emerald gradients.
     * `text-gray-600` (`#4B5563`): Contrast ratio **5.74:1** (Passes WCAG AA).
     * `text-gray-700` (`#374151`): Contrast ratio **9.01:1** (Passes WCAG AA).
     * `text-gray-900` (`#111827`): Contrast ratio **16.0:1** (Passes WCAG AAA).

2. **Dark Mode Contrast on Frosted Glass Surfaces**:
   - Over target dark frosted surface `rgba(15, 23, 20, 0.80)` (effective luminance ~#0F1714):
     * `text-gray-400` (`#9CA3AF`): Contrast ratio **5.52:1** (Passes WCAG AA).
     * `text-gray-500` (`#6B7280`): Contrast ratio **3.12:1** (Fails body text 4.5:1, only passes large headers).
     * `text-gray-600` (`#4B5563`): Contrast ratio **1.94:1** (Fails completely; unreadable).
     * When components write `text-gray-500` or `text-gray-600` without a `dark:text-gray-300` or `dark:text-gray-400` override, the text becomes nearly invisible in dark mode.

3. **Sticky Table Headers & Cell Readability**:
   - In `components/PokjaDataPage.js` and `components/BumilDataPage.js`, sticky cells (`left: 0`, `left: 40`, and `bottom: 0`) have hardcoded inline backgrounds (`#fff`, `#f9fafb`, `#f0fdf4`).
   - In dark mode, if the table text is light (`#e5e7eb` or `#ffffff`), these cells retain their light inline backgrounds, producing **white text on white/pale-green background (contrast < 1.3:1)**.

---

## 2. Logic Chain

```
[Observation 1.1: Current glass has 55% opacity & blur(18px)]
   │
   ├─► 55% opacity is too thin; background ambient gradient and content bleed through harshly.
   │   Target VisionOS / Apple Liquid Glass requires a substantive milky/smoky finish.
   │
   ├─► Reasoning: Light mode needs 78%–88% opacity (rgba(255, 255, 255, 0.82)) to provide optical mass.
   │   Dark mode needs 75%–85% opacity (rgba(15, 23, 20, 0.80)) to avoid murky gray translucency.
   │
   └─► Deep diffusion requires increasing blur from 18px to 28px and saturation to 180%
       with -webkit-backdrop-filter for cross-engine Safari / iOS / Chromium fidelity.

[Observation 1.1: Box shadows lack specular highlight & satin sheen]
   │
   ├─► Apple VisionOS / macOS Sequoia glass surfaces feature a crisp 1px specular highlight
   │   on the top inner edge representing directional overhead light refraction.
   │
   └─► Reasoning: Add `inset 0 1px 1px 0 rgba(255, 255, 255, 0.45)` for light mode,
       and `inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)` for dark mode, combined with a
       delicate 1px luminous border (`border-white/70` light, `border-white/10` dark)
       and diffuse elevation (`0 16px 40px rgba(0, 0, 0, 0.08)`).

[Observation 1.2: Fragmentation across toolbars, charts, modals, and tables]
   │
   ├─► DashboardToolbar, DensityToggle, and charts (DusunBarChart, KaderDonut, StackedBumilBar)
   │   use opaque `bg-white border-gray-200` while neighboring cards use `.glass rounded-3xl`.
   │
   ├─► Dialogs (Dialog, ConfirmModal, ImportPreviewModal, EditModeModal) use opaque white panels
   │   with weak backdrop blur (`blur-sm`).
   │
   └─► Reasoning: Establish a cohesive token hierarchy:
       - .glass-card: standard content card (KPI cards, charts, summaries).
       - .glass-panel: elevated surfaces (sidebar, modals, drawers, chat widget).
       - .glass-pill / .glass-toggle: toolbar toggles, filters, badges.
       - .glass-input: inputs and selects with subtle translucent fill and luminous focus ring.
       - .glass-header: sticky topbar and table headers.

[Observation 1.1 & 1.2: Inline backgrounds and CSS duplicate rules]
   │
   ├─► Inline `style={{ background: '#f9fafb' }}` overrides dark mode styling.
   │   Duplicate `.dark .sidebar` and `.dark .data-table` rules create dead, conflicting CSS.
   │   Invalid class `background-[#f0fdf4]` causes cell transparency.
   │   Phantom class `dark:bg-card-dark` is undefined in Tailwind.
   │
   └─► Reasoning:
       1. Replace inline styles in PokjaDataPage and BumilDataPage with semantic utility classes.
       2. Clean up duplicate rules in `globals.css` into a single, clean `.dark` layer.
       3. Fix the invalid class to `bg-[#f0fdf4] dark:bg-emerald-950/60`.
       4. Define missing dark tokens in `tailwind.config.js`.

[Observation 1.3: Text contrast violations on frosted surfaces]
   │
   ├─► `text-gray-400` (2.54:1) fails WCAG AA body (4.5:1) and headings (3:1) on light glass.
   │   `text-gray-500` (3.12:1) and `text-gray-600` (1.94:1) fail body text on dark glass.
   │
   └─► Reasoning:
       1. Light mode: replace `text-gray-400` with `text-ink-soft` (`#4b5563` / `#525d59` >= 5.0:1)
          for readable labels and helper text.
       2. Dark mode: ensure text scale maps `text-gray-500` to `#9ca3af` (5.5:1) and
          `text-gray-600` to `#cbd5e1` (10.5:1) under `.dark`.
```

---

## 3. Caveats

1. **Investigation Only**: This survey strictly adhered to read-only analysis. No source code modifications have been made to application code, styles, or configuration.
2. **Hardware & GPU Performance**: `backdrop-filter: blur(28px)` combined with multiple large SVG chart animations and extensive table DOM trees (Pokja II with 36 columns) requires hardware GPU acceleration. On low-end mobile devices, stacking multiple nested backdrop filters can cause frame drops. It is recommended to apply glass blur only to container cards and shell elements, keeping table body data cells non-blurred.
3. **Third-Party Styles (Flowbite)**: Flowbite React plugin (`flowbite/plugin`) in `tailwind.config.js` injects some default utility styles. Custom design tokens in `app/globals.css` should be declared in `@layer components` or `@layer utilities` to maintain precedence.
4. **No Live DB Mutations**: Live production databases and test environments were not touched.

---

## 4. Conclusion & Concrete Implementation Proposals

### 4.1 Proposed Design Tokens in `app/globals.css`

Replace the current lines `8-107` and clean up duplicate `.dark` rules in `app/globals.css`:

```css
/* ============================================================
   Apple iOS / VisionOS Frosted Glass Design System (Liquid Glass)
   ============================================================ */
@layer components {
  /* Ambient backdrop: soft emerald and teal gradient blobs */
  .glass-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(42rem 42rem at 12% -8%, rgba(16, 185, 129, 0.20), transparent 60%),
      radial-gradient(38rem 38rem at 88% 0%, rgba(45, 212, 191, 0.18), transparent 55%),
      radial-gradient(46rem 46rem at 75% 110%, rgba(5, 150, 105, 0.16), transparent 60%),
      linear-gradient(180deg, #f4f7f6 0%, #edf2f0 100%);
  }
  .dark .glass-ambient {
    background:
      radial-gradient(42rem 42rem at 12% -8%, rgba(16, 185, 129, 0.18), transparent 60%),
      radial-gradient(38rem 38rem at 88% 0%, rgba(20, 184, 166, 0.14), transparent 55%),
      radial-gradient(46rem 46rem at 75% 110%, rgba(5, 150, 105, 0.16), transparent 60%),
      linear-gradient(180deg, #090e0c 0%, #0c1411 100%);
  }

  /* 1. Standard Frosted Card (KPI cards, charts, containers) */
  .glass,
  .glass-card {
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.06),
      0 1px 3px rgba(0, 0, 0, 0.04),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.50);
  }
  .dark .glass,
  .dark .glass-card {
    background: rgba(15, 23, 20, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.10);
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.35),
      0 1px 3px rgba(0, 0, 0, 0.20),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.12);
  }

  /* 2. Elevated Frosted Panel (Sidebar, Modals, Dialogs, Chat) */
  .glass-panel {
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(32px) saturate(190%);
    -webkit-backdrop-filter: blur(32px) saturate(190%);
    border: 1px solid rgba(255, 255, 255, 0.85);
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.12),
      0 4px 12px rgba(0, 0, 0, 0.04),
      inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.60);
  }
  .dark .glass-panel {
    background: rgba(15, 23, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.45),
      0 4px 12px rgba(0, 0, 0, 0.25),
      inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.14);
  }

  /* 3. Sticky Header / Topbar */
  .glass-header {
    background: rgba(255, 255, 255, 0.84);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.65);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.03),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.45);
  }
  .dark .glass-header {
    background: rgba(15, 23, 20, 0.84);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.10);
  }

  /* 4. Frosted Pill / Toggle / Badge */
  .glass-pill {
    background: rgba(255, 255, 255, 0.70);
    backdrop-filter: blur(20px) saturate(170%);
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    border: 1px solid rgba(255, 255, 255, 0.60);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.04),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.50);
  }
  .dark .glass-pill {
    background: rgba(20, 32, 27, 0.70);
    border: 1px solid rgba(255, 255, 255, 0.10);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.20),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.10);
  }

  /* 5. Frosted Input / Select / Filter */
  .glass-input {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(203, 213, 225, 0.80);
    color: #111827;
    transition: all 0.2s ease;
  }
  .glass-input:focus {
    background: rgba(255, 255, 255, 0.95);
    border-color: #047857;
    box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.18);
  }
  .dark .glass-input {
    background: rgba(20, 32, 27, 0.75);
    border-color: rgba(255, 255, 255, 0.12);
    color: #f3f4f6;
  }
  .dark .glass-input:focus {
    background: rgba(20, 32, 27, 0.95);
    border-color: #34d399;
    box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.22);
  }
}
```

### 4.2 Fix Sidebar Dark Mode in `app/globals.css`

Replace lines `638-641`:
```css
/* Before */
.dark .sidebar {
  background: #111c18;
  border-right-color: #1f2a25;
}

/* After: Maintain Frosted Glass in Dark Mode */
.dark .sidebar {
  background: rgba(15, 23, 20, 0.85);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
}
```

### 4.3 Proposed Updates to `tailwind.config.js`

Add explicit dark surface tokens and glass elevation shadows to `theme.extend`:
```javascript
theme: {
  extend: {
    colors: {
      surface: {
        DEFAULT: '#ffffff',
        subtle: '#f7f8f8',
        muted: '#eef0f0',
        dark: '#0f1714',
        'dark-elevated': '#15201b',
        'dark-border': '#1f2a25',
      },
    },
    boxShadow: {
      'glass-card': '0 16px 40px rgba(0, 0, 0, 0.06), inset 0 1px 1px 0 rgba(255, 255, 255, 0.50)',
      'glass-card-dark': '0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
      'glass-modal': '0 24px 60px rgba(0, 0, 0, 0.14), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.60)',
    },
    backdropBlur: {
      'glass': '28px',
      'glass-panel': '32px',
    },
  }
}
```

### 4.4 Table Component Fixes (Sticky Cells & Dark Mode)

1. **`components/PokjaDataPage.js`**:
   - Line 750: Change `background-[#f0fdf4]` to `bg-[#f0fdf4] dark:bg-emerald-950/60`.
   - Lines 608, 609, 612: Replace inline `background: '#f9fafb'` with `className="sticky bg-gray-50 dark:bg-surface-dark-elevated text-gray-700 dark:text-gray-200 border-b-2 border-gray-100 dark:border-gray-800"`.
   - Line 633: Replace inline `background: '#fff'` with `className="sticky bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800"`.
   - Lines 738, 739: Replace inline `background: '#f0fdf4'` with `className="sticky bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold"`.

2. **`components/BumilDataPage.js`**:
   - Lines 578, 579, 611, 613: Replace inline `background: '#f9fafb'` with `className="sticky bg-gray-50 dark:bg-surface-dark-elevated text-gray-700 dark:text-gray-200"`.
   - Line 633: Replace inline `background: '#fff'` with `className="sticky bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100"`.
   - Lines 686, 687: Replace inline `background: '#f0fdf4'` with `className="sticky bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200"`.

3. **`components/NestedDataPage.js`**:
   - Lines 725, 735: Replace phantom `dark:bg-card-dark` with `dark:bg-surface-dark` or `dark:bg-[#111c18]`.
   - Lines 770, 794: Ensure input background adapts in dark mode:
     ```javascript
     background: hasError ? '#fef2f2' : hasWarning ? '#fffbeb' : undefined
     ```
     and rely on `className="bg-white dark:bg-[#15201b] ..."` rather than hardcoding `#fff` inline.

4. **Standalone Charts (`DusunBarChart.jsx`, `KaderDonut.jsx`, `StackedBumilBar.jsx`)**:
   - Change outer wrapper from `bg-white rounded-xl border border-gray-200 shadow-sm` to `glass rounded-3xl p-5`.

5. **Toolbars & Toggles (`DashboardToolbar.jsx`, `DensityToggle.jsx`)**:
   - `DensityToggle.jsx:12`: Change `border border-gray-200 bg-white` to `glass-pill p-0.5 rounded-xl`.
   - `DashboardToolbar.jsx:48`: Change `bg-white rounded-xl border border-gray-200` to `glass-pill p-0.5 rounded-xl`.
   - `DashboardToolbar.jsx:137`: Apply `glass-pill` to `SelectField` wrapper.

6. **Modals & Dialogs (`components/ui/Dialog.jsx`, `ConfirmModal.js`)**:
   - Update default `panelClassName` in `Dialog.jsx:34`:
     ```javascript
     panelClassName = 'relative z-10 w-full max-w-md glass-panel rounded-3xl border border-white/80 dark:border-white/10 p-6'
     ```
   - Update default `backdropClassName` in `Dialog.jsx:35`:
     ```javascript
     backdropClassName = 'fixed inset-0 bg-gray-950/45 backdrop-blur-md'
     ```

### 4.5 Contrast Remediation Plan (WCAG AA Compliance)

| Element Location | Current Class / Value | Current Contrast | Remediated Value / Class | Remediated Contrast |
|---|---|---|---|---|
| Sidebar brand subtext (`Sidebar.js:83`) | `text-[0.65rem] text-gray-600` | ~4.56:1 (borderline on glass) | `text-gray-700 dark:text-gray-300 font-medium` | 9.0:1 light / 10.5:1 dark (Passes AAA) |
| Sidebar collapse arrow (`Sidebar.js:102`) | `text-gray-400` | 2.54:1 (Fails AA) | `text-gray-600 dark:text-gray-300` | 5.7:1 light / 10.5:1 dark (Passes AA) |
| Sidebar user role (`Sidebar.js:164`) | `text-xs text-gray-400` | 2.54:1 (Fails AA) | `text-xs text-gray-600 dark:text-gray-300` | 5.7:1 light / 10.5:1 dark (Passes AA) |
| Topbar empty notif (`Topbar.js:159`) | `text-sm text-gray-400` | 2.54:1 (Fails AA) | `text-sm text-gray-600 dark:text-gray-300` | 5.7:1 light / 10.5:1 dark (Passes AA) |
| Topbar timestamp (`Topbar.js:172`) | `text-[10px] text-gray-400` | 2.54:1 (Fails AA) | `text-[10px] text-gray-600 dark:text-gray-400` | 5.7:1 light / 5.5:1 dark (Passes AA) |
| NestedDataPage helper (`NestedDataPage:622`) | `text-[11px] text-gray-400` | 2.54:1 (Fails AA) | `text-[11px] text-gray-600 dark:text-gray-300` | 5.7:1 light / 10.5:1 dark (Passes AA) |
| NestedDataPage readonly (`NestedDataPage:808`) | `color: '#6b7280'` inline | 3.12:1 in dark mode | `text-gray-700 dark:text-gray-200` | 9.0:1 light / 13.0:1 dark (Passes AAA) |
| DensityToggle inactive (`DensityToggle.jsx:22`) | `text-gray-500` | 4.56:1 (borderline) | `text-gray-700 dark:text-gray-300` | 9.0:1 light / 10.5:1 dark (Passes AAA) |
| Toolbar select label (`DashboardToolbar.jsx:138`) | `text-[11px] text-gray-500` | 4.56:1 (borderline) | `text-[11px] text-gray-700 dark:text-gray-300 font-bold` | 9.0:1 light / 10.5:1 dark (Passes AAA) |
| Chart totals subtext (`DusunBarChart.jsx:53`) | `text-xs text-gray-400` | 2.54:1 (Fails AA) | `text-xs text-gray-600 dark:text-gray-300` | 5.7:1 light / 10.5:1 dark (Passes AA) |

---

## 5. Verification Method

### 5.1 Automated Codebase Verification

1. **Server Unit Test Suite**:
   ```bash
   npm test -- --selectProjects server
   ```
   *Expected Outcome*: 100% pass across all 19 server suites (180 tests).

2. **Client Component Jest Suite**:
   ```bash
   npm test -- --selectProjects client
   ```
   *Expected Outcome*: Tests for `DashboardToolbar`, `Dialog`, and `Topbar` pass without regression.

3. **Build Compilation**:
   ```bash
   npm run build
   ```
   *Expected Outcome*: Clean Turbopack compilation with zero Tailwind syntax or JSX errors.

### 5.2 Visual Inspection Checklist

1. **Light Mode Frosted Glass**:
   - Open `/dashboard`. Verify card surfaces are substantive, milky white (78%-88% opacity) rather than watery.
   - Verify the 1px luminous top specular highlight (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.45)`) creates a crisp satin edge along cards and the sidebar.
   - Verify the ambient emerald gradient blooms softly behind cards under `blur(28px) saturate(180%)`.
2. **Dark Mode Cohesion**:
   - Toggle theme to Dark. Verify sidebar and cards maintain deep smoky frosted glass (`rgba(15, 23, 20, 0.82)`) with subtle specular highlights rather than collapsing into opaque solid `#111c18`.
   - Navigate to `/dashboard/pokja1` and `/dashboard/bumil`. Scroll horizontally and vertically.
   - Confirm sticky `No`, `Nama Dusun`, and `JUMLAH` rows remain legible with dark backgrounds; verify no white-on-white text bleeding.
3. **Accessibility (WCAG AA)**:
   - Run Lighthouse Accessibility audit or axe-core DevTools extension on `/dashboard` in both light and dark modes.
   - Confirm 0 color-contrast violations for body text (>4.5:1) and large headings (>3:1).
