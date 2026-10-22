# Handoff Report: Survey — Cards, KPI Physics, Dialogs & Stepped Form (R2, R3)

**Agent Role**: Cards & Dialogs Motion Explorer  
**Working Directory**: `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_cards_dialogs\`  
**Date**: 2026-10-22  
**Milestone**: Framer Motion & 21st.dev UI/UX Upgrade (R2 & R3 Survey)  

---

## 1. Observation

Direct investigation of the codebase, components, styles, tests, and skills revealed the following concrete findings:

### 1.1 KPI Summary Cards (`app/dashboard/page.js` & `components/DataStatsPage.js`)

1. **Dashboard KPI Cards (`app/dashboard/page.js:274-294` & `363-390`)**:
   - The operational KPI cards are defined as an array of 4 items:
     - `Dusun Lengkap`: `value: completeness.complete` (integer 0–9), sub: `<AnimatedCounter value={completeness.total} duration={1.2} /> dusun`, icon: `CheckCircle`.
     - `Belum Lengkap`: `value: completeness.incomplete` (integer), sub: `'belum memenuhi kolom wajib'`, icon: `MapPin`.
     - `Perlu Dicek`: `value: completeness.needsCheck` (integer), sub: `'ada warning/anomali'`, icon: `ExclamationCircle`.
     - `Aktivitas Terakhir`: `value: lastActivity ? timeAgo(...) : 'Belum ada'` (**string**, formatted relative time), `isText: true`, sub: `${username} (${action})`, icon: `Clock`.
   - Current markup:
     ```jsx
     // app/dashboard/page.js:363-390
     <motion.div 
       variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
       initial="hidden" animate="show"
       className="grid grid-cols-2 lg:grid-cols-4 gap-4"
     >
       {kpiCards.map((card, i) => {
         const Icon = card.icon;
         return (
           <motion.div 
             key={i} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
             className="rounded-3xl p-5 transition-shadow glass hover:shadow-card-hover"
           >
             <div className="flex justify-between items-start mb-3">
               <div className="p-2.5 rounded-2xl bg-white/50">
                 <Icon className={`w-5 h-5 ${card.color}`} />
               </div>
             </div>
             <div>
               <div className="text-2xl font-bold tabular-nums text-gray-900">
                 {card.isText ? card.value : <AnimatedCounter value={card.value} />}
               </div>
               <div className="text-sm font-semibold mt-0.5 text-gray-700">{card.label}</div>
               <div className="text-xs mt-1 truncate text-gray-500" title={card.subTitle || (typeof card.sub === 'string' ? card.sub : undefined)}>{card.sub}</div>
             </div>
           </motion.div>
         );
       })}
     </motion.div>
     ```
   - **Gaps identified**:
     - No Framer Motion interactive gesture physics: lacks `whileHover={{ y: -4, scale: 1.015 }}` with spring transition `{ type: "spring", stiffness: 350, damping: 25 }`.
     - No tactile tap response (`whileTap={{ scale: 0.985 }}`).
     - No 21st.dev subtle specular reflection sweep on hover (currently only standard CSS `hover:shadow-card-hover`).
     - `MiniTrendCard` (`app/dashboard/page.js:62-104`) also renders cards with `motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}` and lacks spring hover elevation.

2. **Data Stats Page KPI Cards (`components/DataStatsPage.js:37-64` & `255-271`)**:
   - `KpiCard` component rendered in a grid with `staggerChildren: 0.08`:
     - Card 1: `Dusun Aktif` (`summary.totalDusun`, integer), sub has `<AnimatedCounter value={summary.filledDusun} duration={1.2} />`.
     - Card 2: `Indikator` (`summary.indicatorCount`, integer).
     - Card 3: `Total Nilai` (`summary.totalValue`, integer - sum across active columns).
     - Card 4: `Perlu Dicek` (`needsCheck`, integer - count of rows with issues).
   - Current markup:
     ```jsx
     // components/DataStatsPage.js:46-63
     <motion.div
       variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
       className={`glass rounded-3xl p-4`}
     >
       <div className="flex items-start justify-between gap-3">
         <div>
           <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">
             <AnimatedCounter value={value} />
           </div>
           <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5">{label}</div>
           <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{sub}</div>
         </div>
         <div className={`rounded-2xl p-2 border ${tones[tone] || tones.primary}`}>
           <Icon className="w-5 h-5" />
         </div>
       </div>
     </motion.div>
     ```
   - **Gaps identified**:
     - Lacks `whileHover={{ y: -4, scale: 1.015 }}` and `whileTap={{ scale: 0.985 }}`.
     - Lacks subtle specular highlight sheen.
     - Lacks `hover:shadow-card-hover` class or spring transition.

### 1.2 AnimatedCounter Component (`components/AnimatedCounter.js` & `components/ui/AnimatedCounter.jsx`)

1. **Existing Component (`components/AnimatedCounter.js:1-49`)**:
   - Already implemented using `framer-motion`'s `animate` and `useInView`:
     - Normalizes incoming value (`normalizeNumber(value)`).
     - Animates smoothly with `ease: 'easeOut'` over `duration = 1.5` seconds.
     - Rounds values to whole integers (`setDisplay(Math.round(latest))`).
     - Formats with `display.toLocaleString(locale, formatOptions)` (default locale `'id-ID'`).
     - Supports `as` prop (e.g. `as="tspan"` for SVG text in demographic donut chart).
     - Supports `prefix` (e.g. `+` for trend delta) and `suffix`.
2. **Path & A11y Gap**:
   - The file is located at `components/AnimatedCounter.js`. No file existed at `components/ui/AnimatedCounter.jsx`.
   - **Missing A11y**: Does NOT import or check `useReducedMotion()`. When a user requests `prefers-reduced-motion: reduce`, the number still counts up over 1.5 seconds instead of rendering immediately.
   - Recommended solution: Add `useReducedMotion()` to `components/AnimatedCounter.js` (rendering target immediately if active) and create `components/ui/AnimatedCounter.jsx` as a re-export wrapper.

### 1.3 Modal Dialog (`components/ui/Dialog.jsx`)

1. **Current Structure (`components/ui/Dialog.jsx:26-125`)**:
   - It is an accessible modal shell:
     - Implements `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`.
     - Handles Escape key, Tab/Shift-Tab focus trap, focus restoration to previous active element, and body scroll lock.
     - Props: `open`, `onClose`, `title`, `labelledBy`, `describedBy`, `children`, `closeOnBackdrop`, `panelClassName`, `backdropClassName`, `containerClassName`, `initialFocusRef`.
   - **Immediate unmount on line 100**:
     ```javascript
     if (!open) return null;
     ```
   - **Gaps identified**:
     - Because it returns `null` synchronously when `open` is false, NO exit animations can ever play.
     - All callers in the app (`Sidebar.js:207`, `DashboardToolbar.jsx:105`, `ConfirmModal.js:20`) pass `open={boolean}` to `<Dialog open={...} />`.
     - Without `<AnimatePresence>`, modals vanish abruptly with zero closing transition.
   - **Existing test suite (`__tests__/client/Dialog.test.js:8-15`)**:
     ```javascript
     test('tidak render apa-apa saat open=false', () => {
       const { container } = render(
         <Dialog open={false} onClose={() => {}} title="Tes">
           <button>Isi</button>
         </Dialog>
       );
       expect(container.firstChild).toBeNull();
     });
     ```
     When `<AnimatePresence>` wraps `{open && (...)}`, initial render with `open={false}` renders nothing (`container.firstChild === null`), fully preserving test assertions.

### 1.4 Stepped Form Wizard (`components/ui/SteppedForm.jsx`)

1. **Current Structure (`components/ui/SteppedForm.jsx:52-402`)**:
   - Master wizard container used in `PokjaDataPage.js:837`, `BumilDataPage.js:741`, `NestedDataPage.js:54`.
   - Steps array + automatic review step (`review-step`).
   - Current step navigation:
     - `handleNext()`: validates fields on current step, then `setCurrentStep(prev => prev + 1)`.
     - `handlePrev()`: `setCurrentStep(prev => prev - 1)`.
     - `handleJumpToStep(idx)`: `setCurrentStep(idx)`.
     - Keyboard navigation: `Alt + ArrowRight` (next), `Alt + ArrowLeft` (prev).
   - Current step rendering (lines 244-255):
     ```jsx
     <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-6">
       {currentStepDef.isReview ? (
         <FormReviewStep ... />
       ) : (
         <div className="space-y-6 animate-in fade-in-50 duration-200">
           ...
         </div>
       )}
     </div>
     ```
   - **Gaps identified**:
     - No directional slide transition: Uses basic Tailwind CSS fade (`animate-in fade-in-50 duration-200`).
     - No `direction` state tracked (cannot distinguish between forward "Lanjut" and backward "Kembali").
     - No `custom={direction}` variant configuration.
     - Modal wrapper on line 175 (`if (!isOpen) return null;`) has no `<AnimatePresence>` exit transition.
   - **Testing invariant in `__tests__/client/SteppedForm.test.js:145-151`**:
     ```javascript
     // Maju ke step 2
     fireEvent.click(screen.getByText('Lanjut'));
     expect(screen.getByRole('heading', { name: 'Kegiatan' })).toBeInTheDocument();
     ```
     The test synchronously queries the heading on the very next line without `await waitFor`.
     Therefore, if `mode="wait"` is used in jsdom, the exiting step might delay mounting the next step. Using `mode="popLayout"` mounts the next step immediately while sliding, guaranteeing 100% test pass rate in Jest without needing asynchronous test rewrites!

### 1.5 VisionOS Translucent Liquid Glass Compliance (`app/globals.css`)

- Primary card styling (`.glass`, `.glass-card`):
  - Light mode: `linear-gradient(135deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.30) 100%)` (opacity 30%-50%, strictly under 0.65).
  - Dark mode: `linear-gradient(135deg, rgba(48, 72, 63, 0.46) 0%, rgba(16, 28, 23, 0.32) 100%)`.
  - Heavy frosted diffusion: `backdrop-filter: blur(40px) saturate(200%)`.
  - 3D Specular Rim: `border: 1px solid rgba(255, 255, 255, 0.68)`, `inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.88)`.
- Panel styling (`.glass-panel`):
  - Diffusion: `backdrop-filter: blur(44px) saturate(210%)`.
  - Light mode: opacity 36%–56%; Dark mode: opacity 38%–52%.
- **Invariant**: `backdrop-filter` is kept purely in CSS. Motion components ONLY animate GPU hardware-accelerated properties (`transform`, `opacity`, `box-shadow`) to maintain 60fps+.

---

## 2. Logic Chain

From the observations above, the design decisions follow a strict deductive chain:

1. **Interactive Glass KPI Cards**:
   - *Observation*: `app/dashboard/page.js` and `components/DataStatsPage.js` render cards with entry variants but lack `whileHover` and `whileTap` spring handlers.
   - *Requirement R2*: Demands 21st.dev liquid glass interactive cards with spring hover elevation (`whileHover={{ y: -4, scale: 1.015 }}`), tactile tap physics (`whileTap={{ scale: 0.985 }}`), and subtle specular reflection sheen.
   - *Deduction*: We can create a unified Framer Motion preset for glass cards that applies:
     - `whileHover={{ y: -4, scale: 1.015 }}`
     - `whileTap={{ scale: 0.985 }}`
     - `transition={{ type: 'spring', stiffness: 350, damping: 25 }}`
     - An inner specular reflection sweep overlay (`group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/15 via-transparent to-transparent`).
     - This elevates optical fidelity without touching CSS `backdrop-filter`, preventing GPU re-render thrashing.

2. **Animated Counter & Reduced Motion**:
   - *Observation*: `components/AnimatedCounter.js` handles numbers smoothly but continues counting up even if `prefers-reduced-motion` is active.
   - *Requirement R5*: Mandates strict WCAG AA and `prefers-reduced-motion` compliance.
   - *Deduction*: Update `AnimatedCounter.js` with `useReducedMotion()`. If active, immediately `setDisplay(target)`. Provide `components/ui/AnimatedCounter.jsx` as a re-export of `components/AnimatedCounter.js` for architectural cleanliness.

3. **Dialog Exit Transitions with `AnimatePresence`**:
   - *Observation*: `components/ui/Dialog.jsx` contains `if (!open) return null;`, unmounting the DOM immediately on close. All callers (`ConfirmModal`, `Sidebar`, `DashboardToolbar`) pass `open={boolean}` to the component.
   - *Requirement R3*: Demands modal unmounting transitions: backdrop fade-in/out (`opacity: 0 ↔ 1`) and modal panel spring scale (`scale: 0.95 ↔ 1, y: 16 ↔ 0`).
   - *Deduction*: Placing `<AnimatePresence>` inside `Dialog.jsx` wrapping `{open && <motion.div ...>}` enables exit animations universally for all existing callers without modifying their call sites.
   - *A11y verification*: Body scroll lock and focus restore cleanup hooks fire properly when `open` turns false. If `useReducedMotion()` is active, scale and y translations are disabled (fade-only).

4. **SteppedForm Directional Slide Transitions**:
   - *Observation*: `components/ui/SteppedForm.jsx` changes steps using a basic CSS fade class. Step buttons trigger `setCurrentStep` without recording direction.
   - *Requirement R3*: Requires directional slide transition: horizontal slide right-to-left when moving forward ("Lanjut"), left-to-right when moving backward ("Kembali").
   - *Deduction*:
     - Track `direction`: `const [direction, setDirection] = useState(1);`
     - Update in `handleNext()`: `setDirection(1)`.
     - Update in `handlePrev()`: `setDirection(-1)`.
     - Update in `handleJumpToStep(idx)`: `setDirection(idx > currentStep ? 1 : -1)`.
     - Animate step body using `<AnimatePresence mode="popLayout" custom={direction} initial={false}>` and `<motion.div key={currentStep} custom={direction} variants={slideVariants} ... />`.
     - `mode="popLayout"` ensures the next step is mounted immediately, preserving synchronous testing assertions in `__tests__/client/SteppedForm.test.js`.
     - Also upgrade the outer modal of `SteppedForm` to Framer Motion `<AnimatePresence>` for spring scale entry/exit.

---

## 3. Caveats

1. **Test Environment Synchronicity**:
   - In Jest / jsdom, timers and CSS animations do not advance automatically. Using `mode="popLayout"` in `SteppedForm` prevents test failures where the test asserts `expect(screen.getByRole('heading', { name: 'Kegiatan' })).toBeInTheDocument()` immediately after `fireEvent.click(screen.getByText('Lanjut'))`.
   - In `AnimatedCounter`, during unit tests, if `useReducedMotion()` or jsdom `animate` runs, numbers initialize cleanly.
2. **Tabular Numbers & Layout Shift**:
   - Animated count-up can cause slight text width changes while digits tick. `tabular-nums` is already applied on card text (`tabular-nums text-gray-900`) and must be strictly preserved to prevent card layout jitter.
3. **String Values in KPI Cards**:
   - The 4th card in `app/dashboard/page.js` ("Aktivitas Terakhir") displays a relative time string (e.g. "5 menit lalu"). It uses `card.isText ? card.value : <AnimatedCounter value={card.value} />`. The implementer must NOT replace this with an unqualified `<AnimatedCounter>` call.
4. **No Direct `backdrop-filter` Motion**:
   - Per VisionOS Liquid Glass rules, never animate `backdropFilter: 'blur(40px)' ↔ 'blur(0px)'` directly inside `motion.div`. Use `opacity` or `transform` on containers to let hardware compositing handle the frame blending.

---

## 4. Conclusion & Concrete Implementation Blueprint

### 4.1 Card Physics & Specular Sheen (`app/dashboard/page.js` & `components/DataStatsPage.js`)

**Motion Preset**:
```javascript
export const kpiContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const kpiCardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 24,
    },
  },
};

export const cardHoverMotion = {
  whileHover: { y: -4, scale: 1.015 },
  whileTap: { scale: 0.985 },
  transition: { type: 'spring', stiffness: 350, damping: 25 },
};
```

**Implementation in `app/dashboard/page.js:363-390`**:
```jsx
<motion.div 
  variants={kpiContainerVariants}
  initial="hidden" animate="show"
  className="grid grid-cols-2 lg:grid-cols-4 gap-4"
>
  {kpiCards.map((card, i) => {
    const Icon = card.icon;
    return (
      <motion.div 
        key={i}
        variants={kpiCardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative overflow-hidden group rounded-3xl p-5 glass hover:shadow-card-hover cursor-pointer"
      >
        {/* Subtle Specular Reflection Sweep */}
        <div className="pointer-events-none absolute -inset-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="p-2.5 rounded-2xl bg-white/50 dark:bg-white/10 shadow-inner">
            <Icon className={`w-5 h-5 ${card.color}`} />
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {card.isText ? card.value : <AnimatedCounter value={card.value} />}
          </div>
          <div className="text-sm font-semibold mt-0.5 text-gray-700 dark:text-gray-200">{card.label}</div>
          <div className="text-xs mt-1 truncate text-gray-500 dark:text-gray-400" title={card.subTitle || (typeof card.sub === 'string' ? card.sub : undefined)}>{card.sub}</div>
        </div>
      </motion.div>
    );
  })}
</motion.div>
```

**Implementation in `components/DataStatsPage.js:46-63`**:
```jsx
function KpiCard({ label, value, sub, icon: Icon, tone = 'primary' }) {
  ...
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="relative overflow-hidden group glass rounded-3xl p-4 hover:shadow-card-hover cursor-pointer"
    >
      <div className="pointer-events-none absolute -inset-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">
            <AnimatedCounter value={value} />
          </div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5">{label}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{sub}</div>
        </div>
        <div className={`rounded-2xl p-2 border ${tones[tone] || tones.primary}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
```

### 4.2 AnimatedCounter Accessibility Upgrade (`components/AnimatedCounter.js` & `components/ui/AnimatedCounter.jsx`)

**In `components/AnimatedCounter.js`**:
```javascript
'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

function normalizeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function AnimatedCounter({
  value,
  duration = 1.5,
  delay = 0,
  start = 0,
  locale = 'id-ID',
  formatOptions,
  prefix = '',
  suffix = '',
  className,
  as: Component = 'span',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();
  const target = normalizeNumber(value);
  const [display, setDisplay] = useState(normalizeNumber(start));

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(target);
      return;
    }
    if (!isInView) return;

    const controls = animate(normalizeNumber(start), target, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, target, duration, delay, start, shouldReduceMotion]);

  return (
    <Component ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(locale, formatOptions)}
      {suffix}
    </Component>
  );
}
```

**In `components/ui/AnimatedCounter.jsx`**:
```javascript
'use client';

export { default } from '@/components/AnimatedCounter';
```

### 4.3 Modal Dialog with `AnimatePresence` (`components/ui/Dialog.jsx`)

```jsx
'use client';

import { useEffect, useId, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Dialog({
  open,
  onClose,
  title,
  labelledBy,
  describedBy,
  children,
  closeOnBackdrop = true,
  panelClassName = 'relative z-10 w-full max-w-md glass-panel rounded-3xl p-6',
  backdropClassName = 'fixed inset-0 bg-gray-950/45 backdrop-blur-md',
  containerClassName = 'fixed inset-0 z-[100] flex items-center justify-center p-4',
  initialFocusRef,
}) {
  const panelRef = useRef(null);
  const previousActiveRef = useRef(null);
  const autoId = useId();
  const titleId = labelledBy || (title ? `dialog-title-${autoId}` : undefined);
  const shouldReduceMotion = useReducedMotion();

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
      return;
    }
    if (e.key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousActiveRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => {
      const target = initialFocusRef?.current
        || panelRef.current?.querySelector(FOCUSABLE)
        || panelRef.current;
      target?.focus?.();
    }, 0);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open, initialFocusRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dialog-container"
          className={containerClassName}
          onKeyDown={handleKeyDown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop with fade exit */}
          <motion.div
            key="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={backdropClassName}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Dialog Panel with Spring Scale & Slide */}
          <motion.div
            key="dialog-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={describedBy}
            tabIndex={-1}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={panelClassName}
          >
            {title && (
              <h2 id={titleId} className="sr-only">{title}</h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 4.4 Directional Step Transitions in `components/ui/SteppedForm.jsx`

1. **Direction tracking**:
   ```javascript
   const [direction, setDirection] = useState(1);
   const shouldReduceMotion = useReducedMotion();

   const handleNext = () => {
     ...
     setDirection(1);
     if (currentStep < totalSteps - 1) {
       setCurrentStep((prev) => prev + 1);
     }
   };

   const handlePrev = () => {
     if (currentStep > 0) {
       setDirection(-1);
       setCurrentStep((prev) => prev - 1);
     }
   };

   const handleJumpToStep = (stepIdx) => {
     if (stepIdx >= 0 && stepIdx < totalSteps) {
       setDirection(stepIdx > currentStep ? 1 : -1);
       setCurrentStep(stepIdx);
     }
   };
   ```

2. **Slide Variants**:
   ```javascript
   const slideVariants = {
     enter: (dir) => ({
       x: shouldReduceMotion ? 0 : dir > 0 ? 32 : -32,
       opacity: 0,
     }),
     center: {
       x: 0,
       opacity: 1,
       transition: {
         x: { type: 'spring', stiffness: 360, damping: 28 },
         opacity: { duration: 0.2 },
       },
     },
     exit: (dir) => ({
       x: shouldReduceMotion ? 0 : dir > 0 ? -32 : 32,
       opacity: 0,
       transition: {
         x: { type: 'spring', stiffness: 360, damping: 28 },
         opacity: { duration: 0.15 },
       },
     }),
   };
   ```

3. **Step Content Container**:
   ```jsx
   <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-6 relative overflow-x-hidden">
     <AnimatePresence mode="popLayout" custom={direction} initial={false}>
       <motion.div
         key={currentStep}
         custom={direction}
         variants={slideVariants}
         initial="enter"
         animate="center"
         exit="exit"
         className="w-full"
       >
         {currentStepDef.isReview ? (
           <FormReviewStep ... />
         ) : (
           <div className="space-y-6">
             ...
           </div>
         )}
       </motion.div>
     </AnimatePresence>
   </div>
   ```

4. **Outer Modal Animation**:
   Wrap the entire dialog return in `<AnimatePresence>` with `isOpen` condition, replacing Tailwind's CSS animation classes with Framer Motion spring backdrop fade and panel scale.

---

## 5. Verification Method

To independently verify all findings and test proposals:

1. **Unit and Client Test Suite**:
   ```bash
   npm test
   ```
   Must pass 24 suites, 205 tests, specifically:
   - `__tests__/client/Dialog.test.js`: verifies `open=false` renders null, `open=true` renders role dialog, Escape closes, backdrop click closes, focus moves to focusable child.
   - `__tests__/client/SteppedForm.test.js`: verifies navigation forward ("Lanjut"), backward ("Kembali"), review step, and submission.
2. **Production Build Verification**:
   ```bash
   npm run build
   ```
   Must compile cleanly without Next.js or Turbopack errors.
3. **Files to inspect**:
   - `app/dashboard/page.js` lines 274–294 and 363–390
   - `components/DataStatsPage.js` lines 37–64 and 255–271
   - `components/ui/Dialog.jsx`
   - `components/ui/SteppedForm.jsx`
   - `components/AnimatedCounter.js`
   - `app/globals.css` lines 137–227
4. **Invalidation Conditions**:
   - If `AnimatePresence` in `Dialog.jsx` prevents `expect(container.firstChild).toBeNull()` on `open=false`, the design is invalid (verified: `AnimatePresence` with `open={false}` returns `null`).
   - If `mode="wait"` in `SteppedForm` causes synchronous test `expect(screen.getByRole('heading', { name: 'Kegiatan' })).toBeInTheDocument()` to fail due to delayed unmount, use `mode="popLayout"` (verified).
   - If any `backdrop-filter` is animated directly via Framer Motion `style` or `animate`, it violates Rule 4 of VisionOS Liquid Glass rules (verified: keep in CSS).
