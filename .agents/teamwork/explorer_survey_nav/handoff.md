# Handoff Report: Navigation Motion & Micro-interactions Survey (R1, R4)

**Agent**: Navigation Motion Explorer (`explorer_survey_nav`)  
**Date**: 2026-10-22  
**Target Areas**: `components/Sidebar.js`, `components/DashboardToolbar.jsx`, `components/ui/FormProgressBar.jsx`, `app/dashboard/admin/**`, `components/Topbar.js` (+ `components/DensityToggle.jsx`, `components/ui/Dialog.jsx`)

---

## 1. Observation

### 1.1 Dependency & Global Environment
- **Framer Motion Version**: `package.json:32` contains `"framer-motion": "^12.38.0"`. React version is `19.2.4`, Next.js is `16.4.0`.
- **Accessibility & Reduced Motion**: `components/ThemeProvider.jsx:17` wraps the application in:
  ```jsx
  <Provider defaultTheme={defaultTheme}>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </Provider>
  ```
  `reducedMotion="user"` is **already active at app root**, meaning Framer Motion automatically skips layout/transform animations whenever a user has `prefers-reduced-motion: reduce` configured in their OS.
- **Client Test Status**: Executed `npm run test:client` — 5 test suites passed (25 tests).
- **Server Test Status**: Executed `npm run test:server` — 19 test suites passed (180 tests).

---

### 1.2 `components/Sidebar.js`
- **Directive**: Line 1: `'use client';` is present.
- **State Management**:
  - `const pathname = usePathname();` (Next.js navigation hook).
  - Active detection at lines 41–43:
    ```javascript
    const isActive = (href) => href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
    ```
  - Render loop at lines 116–134 (Menu Utama) and 140–158 (Administrasi):
    ```jsx
    <Link
      key={item.href}
      href={item.href}
      className={`nav-item ${active ? 'nav-item-active' : ''}`}
      title={collapsed ? (item.label + (item.sub ? ' — ' + item.sub : '')) : undefined}
      aria-label={item.label + (item.sub ? ' — ' + item.sub : '')}
    >
      <span className="nav-icon"><Icon className="w-5 h-5" /></span>
      <div className="nav-text">
        <span className="truncate">{item.label}</span>
        {item.sub && <span className="nav-sub truncate">{item.sub}</span>}
      </div>
    </Link>
    ```
- **CSS Styling Interplay (`app/globals.css`)**:
  - Lines 565–587: `.nav-item` is `display: flex; ... height: 44px; border-radius: 14px; position: static;`
  - Lines 608–623: `.nav-item-active` defines a static green gradient background:
    ```css
    .nav-item-active {
      background: linear-gradient(180deg, rgba(5, 150, 105, 0.92) 0%, rgba(4, 120, 87, 0.80) 100%);
      backdrop-filter: blur(20px) saturate(190%);
      border: 1px solid rgba(167, 243, 208, 0.75);
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(5, 150, 105, 0.28), inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.65)...;
    }
    ```
  - Dark mode at lines 1030–1037: `.dark .nav-item-active { background: linear-gradient(180deg, rgba(16, 185, 129, 0.40) 0%, rgba(5, 150, 105, 0.24) 100%); ... }`
- **Testing Invariants**:
  - `__tests__/client/Sidebar.test.js:50,55,123,139` directly asserts:
    ```javascript
    expect(dashboardLink).toHaveClass('nav-item-active');
    expect(dataUmumLink).not.toHaveClass('nav-item-active');
    ```
    Therefore, the class `nav-item-active` **must not be removed or renamed**.
- **Mobile / Responsive Behavior**:
  - Parent `aside` has `${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : 'sidebar-mobile-hidden'}`.
  - On desktop, `collapsed` toggles `w-64` ↔ `w-20`.
  - On mobile (`< 768px`), `app/dashboard/layout.js:27-35` forces `collapsed=false` so the mobile drawer is full-width, controlled via `sidebar-mobile-open` / `sidebar-mobile-hidden`.

---

### 1.3 `components/DashboardToolbar.jsx`
- **Directive**: Line 1: `'use client';` is present.
- **State & DOM Structure**:
  - Controlled props: `tahun, setTahun, years, bulan, setBulan, months, jenisData, setJenisData, tableFilters, onDownloadExcel, onDownloadWord, onDownloadTemplate, downloading, downloadingTemplate`.
  - Internal states: `showTemplate` (Dialog state), `showOverflow` (Dropdown state).
  - Row 1 (Lines 40–44): 3 compact dropdown filters (`Tahun`, `Bulan`, `Data`) rendered using `<SelectField>`.
  - Row 2 (Lines 47–102):
    - Export button pill: `<button onClick={() => onDownloadExcel()}>` (Excel) + `<button onClick={() => onDownloadWord()}>` (Word).
    - Import link: `<a href="/dashboard/admin">`.
    - Overflow menu trigger: `<button onClick={() => setShowOverflow(!showOverflow)} aria-label="Tindakan lain">`.
    - Overflow dropdown content (Lines 91–98):
      ```jsx
      <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl shadow-lg z-20 py-1.5 animate-in fade-in slide-in-from-top-2">
      ```
      Uses CSS class `animate-in` without exit animation.
- **Testing Invariants**:
  - `__tests__/client/DashboardToolbar.test.js:27-29,34,40,46` checks labels `Unduh laporan Excel`, `Unduh laporan Word`, `Import`, and `Tindakan lain`.

---

### 1.4 `components/ui/FormProgressBar.jsx`
- **Directive**: Line 1: `'use client';` is present.
- **State & DOM Structure**:
  - Props: `steps = []`, `currentStep = 0`, `onStepClick`, `className = ''`.
  - Percentage: `progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);`
  - Track (Lines 41–50):
    ```jsx
    <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/40 dark:bg-black/30 border border-white/60 dark:border-white/10 shadow-inner">
      <div
        className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-400 transition-all duration-300 ease-out rounded-full shadow-sm"
        style={{ width: `${progressPercent}%` }}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
    ```
  - Step Pills Bar (Lines 53–92):
    ```jsx
    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
      {steps.map((step, idx) => {
        const isCurrent = idx === currentStep;
        const isCompleted = idx < currentStep;
        const isClickable = onStepClick && idx <= currentStep;
        return (
          <button
            key={step.id || idx}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStepClick?.(idx)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
              isCurrent && 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300/60 dark:ring-primary-500/40 font-semibold scale-[1.02]',
              isCompleted && 'glass-pill text-emerald-800 dark:text-emerald-300 hover:bg-white/70 dark:hover:bg-white/10 cursor-pointer',
              !isCurrent && !isCompleted && 'opacity-60 text-gray-500 dark:text-gray-400 cursor-not-allowed bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/5'
            )}
            title={step.title}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {/* Step badge + Title */}
          </button>
        );
      })}
    </div>
    ```
- **Testing Invariants**:
  - `__tests__/client/SteppedForm.test.js:24-26,32` asserts `Langkah 2 dari 3`, `67% Selesai`, `progressbar` `aria-valuenow="67"`, and clicking completed step triggers `onStepClick(0)`.

---

### 1.5 `app/dashboard/admin/**` (Admin Tabs & Panels)
- **Directive**: `app/dashboard/admin/page.js:1` is `'use client';`.
- **State & DOM Structure**:
  - Tabs list (Lines 14–21): `users`, `desa`, `years`, `columns`, `logs`, `import`.
  - State: `const [tab, setTab] = useState('users');`
  - Tab pills (Lines 43–60):
    ```jsx
    <div className="flex gap-2 mb-6 flex-wrap">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === t.id
              ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
              : 'bg-white/70 backdrop-blur text-gray-600 border border-gray-200 hover:bg-white'
          }`}
        >
          <Icon className="w-4 h-4" /> {t.label}
        </button>
      ))}
    </div>
    ```
  - Subtabs in `_components/ColumnsTab.jsx:13–30`:
    `const [subtab, setSubtab] = useState('standard');` ('standard' vs 'dynamic') using border underline tabs.
  - Step wizard in `_components/ImportTab.jsx:104–108`: Uses `FormProgressBar` with `IMPORT_STEPS`.

---

### 1.6 `components/Topbar.js`
- **Directive**: Line 1: `'use client';` is present.
- **State & Dropdowns**:
  - `const [showDropdown, setShowDropdown] = useState(false);` (Profile menu)
  - `const [showNotif, setShowNotif] = useState(false);` (Notifications menu)
  - Click-outside & Escape key handlers via `useEffect` (lines 48–62).
  - Both dropdown menus are conditionally rendered:
    `{showNotif && <div className="absolute right-0 top-full mt-2 w-80 glass-panel rounded-2xl shadow-modal z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">...</div>}`
    `{showDropdown && <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl shadow-modal z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">...</div>}`
- **Testing Invariants**:
  - `__tests__/client/Topbar.test.js:39-51` tests `aria-expanded` flip on click, `Profil Saya` presence, and Escape key closing dropdown.

---

### 1.7 `components/DensityToggle.jsx`
- **Directive**: Line 1: `'use client';` is present.
- **State & Structure**:
  - Controlled via `density` ('comfortable' | 'compact') and `onChange`.
  - Rendered as 2 adjacent buttons inside a `glass-pill` container.
  - Active button has `'bg-primary-600 text-white shadow-sm'`.

---

## 2. Logic Chain

1. **`layoutId` Mechanism in Next.js App Router**:
   - In Next.js App Router, `DashboardLayout` (`app/dashboard/layout.js`) persists across navigation between dashboard routes (`/dashboard`, `/dashboard/pokja1`, `/dashboard/admin`, etc.).
   - Because `Sidebar.js` is rendered once inside `DashboardLayout` and is not destroyed on route change, Framer Motion's `layoutId` maintains component continuity across page changes.
   - When the user transitions from `/dashboard` to `/dashboard/data-umum`, `usePathname()` updates. Framer Motion tracks the `<motion.div layoutId="sidebarActivePill" />` element unmounting from the previous item and mounting in the new active item, calculating their bounding box deltas and applying spring physics smoothly.

2. **Resolving the CSS Gradient Clashing in `Sidebar.js`**:
   - *Observation*: `.nav-item-active` in `globals.css` currently sets an opaque `background: linear-gradient(...)`.
   - *Logic*: If `.nav-item-active` paints an opaque background on the new link immediately, the user will see a static green background appear instantly before the animated sliding pill finishes moving, causing a visual flash or double pill.
   - *Solution*:
     - Keep `.nav-item-active` class on the `<Link>` to preserve test assertions in `Sidebar.test.js`.
     - In `globals.css`, adjust `.nav-item-active` so the background is transparent or delegated to the child motion pill (e.g., `background: transparent; border-color: transparent; box-shadow: none;` when rendered with the motion pill, while maintaining `color: #ffffff` and `font-weight: 600`).
     - Render `<motion.div layoutId="sidebarActivePill" className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-primary-600 to-primary-700 shadow-sm border border-emerald-300/40 -z-10" />` inside the active item.
     - Add `relative` and `z-0` to `.nav-item`, with `.nav-icon` and `.nav-text` possessing `relative z-10`.

3. **Admin Tabs Spring Sliding Pill**:
   - *Observation*: `AdminPage` tabs (`TABS.map(...)`) are simple sibling buttons with inline active classes.
   - *Logic*:
     - Adding a shared container with `p-1 glass-pill rounded-full inline-flex gap-1` and setting `relative` on each tab button allows `<motion.div layoutId="adminActiveTabIndicator" className="absolute inset-0 bg-primary-600 rounded-full shadow-md -z-10" transition={{ type: "spring", stiffness: 450, damping: 32 }} />` to smoothly glide between tabs when `tab === t.id`.
     - Cross-fading tab contents via `<AnimatePresence mode="wait">` with `<motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>` avoids abrupt content jumps.

4. **Stepped Form Indicator Physics**:
   - *Observation*: `FormProgressBar.jsx` has two interactive elements: (1) the progress percentage track, (2) the stepped pill buttons.
   - *Logic*:
     - Progress track: Replacing inline `style={{ width: `${progressPercent}%` }}` with `<motion.div animate={{ width: `${progressPercent}%` }} transition={{ type: "spring", stiffness: 220, damping: 26 }} ... />` creates a physical fluid filling effect.
     - Stepped pills: The current step button receives `<motion.div layoutId="formProgressActivePill" className="absolute inset-0 bg-primary-600 rounded-full shadow-md ring-2 ring-primary-300/60 dark:ring-primary-500/40 -z-10" transition={{ type: "spring", stiffness: 450, damping: 32 }} />`. As steps advance from 0 to 1 to 2, the pill glides across the bar.

5. **Topbar Dropdown Polish (`AnimatePresence`)**:
   - *Observation*: Both notifications and profile popovers disappear instantly on Escape or click-outside because they rely on React conditional unmounting with Tailwind's unidirectional `animate-in`.
   - *Logic*:
     - Enclosing both dropdowns in `<AnimatePresence>`:
       ```jsx
       <AnimatePresence>
         {showDropdown && (
           <motion.div
             key="profile-dropdown"
             initial={{ opacity: 0, scale: 0.95, y: -6 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: -6 }}
             transition={{ type: "spring", stiffness: 420, damping: 28 }}
             className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl shadow-modal z-50 overflow-hidden"
           >
             ...
           </motion.div>
         )}
       </AnimatePresence>
       ```
     - Guarantees authentic VisionOS translucent popping entrance and smooth exit fade-scale out.
     - `__tests__/client/Topbar.test.js` tests `aria-expanded` and Escape key. Because `setShowDropdown(false)` immediately changes `aria-expanded="false"`, the existing test passes without needing extra delay.

6. **Primary Button Micro-gestures**:
   - Applying `whileTap={{ scale: 0.97 }}` and subtle `whileHover={{ y: -1 }}` with `{ type: "spring", stiffness: 400, damping: 25 }` to primary actions (Excel/Word export, modal save, step navigation) creates a tactile Apple-grade feel without introducing layout reflow.

---

## 3. Caveats

1. **JSDOM Animation Timing in Tests**:
   - In Jest environments (`jest-environment-jsdom`), Framer Motion runs animations synchronously or in mock mode. However, if exit animations in `<AnimatePresence>` take time to unmount, tests using `waitForElementToBeRemoved` or `expect(element).not.toBeInTheDocument()` may fail if they do not await the exit. Topbar tests use `waitFor(() => expect(profileBtn).toHaveAttribute('aria-expanded', 'false'))`, which flips immediately.
2. **`layoutId` Scope Collision**:
   - `layoutId` values must be strictly unique across active components. Do NOT reuse `"activeIndicator"` generically. Use scoped IDs:
     - Sidebar: `"sidebarActivePill"`
     - Admin Tabs: `"adminActiveTabIndicator"`
     - Columns Subtabs: `"columnsSubtabIndicator"`
     - Form Progress Bar: `"formProgressActivePill"`
     - Density Toggle: `"densityTogglePill"`
3. **GPU Acceleration Invariant**:
   - In accordance with `.agent/rules/visionos-liquid-glass.md`, never animate `backdrop-filter` directly in `animate` or `whileHover`. Keep frosted glass blur inside CSS (`.glass-panel`, `.glass-pill`) and animate only `opacity`, `transform` (`scale`, `y`, `x`), and specular borders via `boxShadow`.

---

## 4. Conclusion & Concrete Proposal

### 4.1 Component-by-Component Upgrade Blueprint

#### A. `components/Sidebar.js`
- Wrap items with `<Link className={cn('nav-item relative overflow-hidden', active && 'nav-item-active')} ...>`:
  ```jsx
  {active && (
    <motion.div
      layoutId="sidebarActivePill"
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      className="absolute inset-0 bg-gradient-to-b from-primary-600/95 to-primary-700/85 dark:from-primary-600/50 dark:to-primary-700/35 border border-emerald-300/40 dark:border-emerald-400/30 rounded-[14px] shadow-sm -z-10"
    />
  )}
  <span className="nav-icon relative z-10"><Icon className="w-5 h-5" /></span>
  <div className="nav-text relative z-10">
    <span className="truncate">{item.label}</span>
    {item.sub && <span className="nav-sub truncate">{item.sub}</span>}
  </div>
  ```
- Micro-taps:
  - Toggle button: `motion.button` with `whileTap={{ scale: 0.92 }}`.
  - Footer Ganti Password & Keluar: `motion.button` with `whileTap={{ scale: 0.97 }}`.

#### B. `components/DashboardToolbar.jsx`
- Wrap overflow menu in `<AnimatePresence>`:
  ```jsx
  <AnimatePresence>
    {showOverflow && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setShowOverflow(false)} />
        <motion.div
          key="toolbar-overflow"
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl shadow-lg z-20 py-1.5"
        >
          {/* Menu items */}
        </motion.div>
      </>
    )}
  </AnimatePresence>
  ```
- Primary action buttons:
  - Excel button: `motion.button` with `whileTap={{ scale: 0.96 }}`.
  - Word button: `motion.button` with `whileTap={{ scale: 0.96 }}`.
  - Import button: `motion.a` with `whileTap={{ scale: 0.96 }}`.

#### C. `components/ui/FormProgressBar.jsx`
- Replace progress track inline style with `motion.div`:
  ```jsx
  <motion.div
    className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-400 rounded-full shadow-sm"
    initial={false}
    animate={{ width: `${progressPercent}%` }}
    transition={{ type: "spring", stiffness: 220, damping: 26 }}
    role="progressbar"
    aria-valuenow={progressPercent}
    aria-valuemin={0}
    aria-valuemax={100}
  />
  ```
- Active step pill:
  ```jsx
  <button
    key={step.id || idx}
    type="button"
    disabled={!isClickable}
    onClick={() => isClickable && onStepClick?.(idx)}
    className={cn(
      'relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200',
      isCurrent && 'text-white font-semibold',
      isCompleted && 'glass-pill text-emerald-800 dark:text-emerald-300 hover:bg-white/70 dark:hover:bg-white/10 cursor-pointer',
      !isCurrent && !isCompleted && 'opacity-60 text-gray-500 dark:text-gray-400 cursor-not-allowed bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/5'
    )}
    title={step.title}
    aria-current={isCurrent ? 'step' : undefined}
  >
    {isCurrent && (
      <motion.div
        layoutId="formProgressActivePill"
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="absolute inset-0 bg-primary-600 rounded-full shadow-md ring-2 ring-primary-300/60 dark:ring-primary-500/40 -z-10"
      />
    )}
    <span className="relative z-10 ...">{...}</span>
    <span className="relative z-10 truncate max-w-[120px] sm:max-w-[160px]">{step.title}</span>
  </button>
  ```

#### D. `app/dashboard/admin/page.js` & `ColumnsTab.jsx`
- Admin tabs in `AdminPage`:
  ```jsx
  <div className="flex gap-2 mb-6 flex-wrap">
    {TABS.map(t => {
      const Icon = t.icon;
      const isActive = tab === t.id;
      return (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            isActive ? 'text-white' : 'bg-white/70 backdrop-blur text-gray-600 border border-gray-200 hover:bg-white'
          }`}
        >
          {isActive && (
            <motion.div
              layoutId="adminActiveTabIndicator"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="absolute inset-0 bg-primary-600 rounded-full shadow-sm shadow-primary-500/20 -z-10"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Icon className="w-4 h-4" /> {t.label}
          </span>
        </button>
      );
    })}
  </div>
  ```
- Subtabs in `ColumnsTab.jsx`:
  ```jsx
  <div className="mb-4 flex gap-2 border-b border-gray-200 relative">
    {['standard', 'dynamic'].map((key) => {
      const isCurrent = subtab === key;
      const label = key === 'standard' ? 'Kolom Standar' : 'Kolom Dinamis';
      return (
        <button
          key={key}
          onClick={() => setSubtab(key)}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            isCurrent ? 'text-primary-700 font-semibold' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {label}
          {isCurrent && (
            <motion.div
              layoutId="columnsSubtabIndicator"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
            />
          )}
        </button>
      );
    })}
  </div>
  ```

#### E. `components/Topbar.js`
- Wrap both notification popover and profile dropdown in `<AnimatePresence>`:
  - Spring pop animation:
    `initial={{ opacity: 0, scale: 0.95, y: -6 }}`  
    `animate={{ opacity: 1, scale: 1, y: 0 }}`  
    `exit={{ opacity: 0, scale: 0.95, y: -6 }}`  
    `transition={{ type: "spring", stiffness: 420, damping: 28 }}`
- Micro-taps:
  - Hamburger menu: `whileTap={{ scale: 0.92 }}`
  - Notification Bell: `whileTap={{ scale: 0.92 }}`
  - Profile Avatar button: `whileTap={{ scale: 0.97 }}`
  - Theme buttons: `whileTap={{ scale: 0.94 }}`
  - AngleDown chevron: `animate={{ rotate: showDropdown ? 180 : 0 }}`

#### F. `components/DensityToggle.jsx`
- Replace static active background with sliding pill:
  ```jsx
  {density === mode && (
    <motion.div
      layoutId="densityTogglePill"
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      className="absolute inset-0 bg-primary-600 rounded-lg shadow-sm -z-10"
    />
  )}
  ```

---

## 5. Verification Method

To verify these findings and any subsequent implementation:

1. **Verify Baseline Tests**:
   - Run client unit tests:
     ```powershell
     npm run test:client
     ```
     *Expected*: 5 passed suites (25 tests).
   - Run server unit tests:
     ```powershell
     npm run test:server
     ```
     *Expected*: 19 passed suites (180 tests).

2. **Verify Component Invariants**:
   - `Sidebar.test.js`: Confirmed that `nav-item-active` class is retained on the active link and that toggle button aria-labels ('Buka sidebar' / 'Tutup sidebar') remain unaltered.
   - `Topbar.test.js`: Confirmed that `aria-expanded` and Escape key dismiss behavior work cleanly with `AnimatePresence`.
   - `SteppedForm.test.js`: Confirmed that `FormProgressBar` `aria-valuenow` and `Langkah X dari Y` text remain exact.

3. **Verify Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Clean Turbopack compilation without client component or hydration errors.
