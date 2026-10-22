# Milestone M5 Verification Report — Challenger 1 (Stress & Interactive State)

## Verdict: REQUEST_CHANGES

---

## 1. Observation

### Obs 1: `SteppedForm.jsx` — Infinite Re-render Loop & Forced Step Reset on `initialData`
- **Location**: `components/ui/SteppedForm.jsx:59, 74-78`
- **Code**:
  ```javascript
  export default function SteppedForm({
    isOpen = true,
    onClose,
    title,
    subtitle,
    steps = [],
    initialData = {},
    ...
  }) {
    ...
    // Sinkronisasi data awal saat modal dibuka atau initialData berganti
    useEffect(() => {
      setFormData({ ...initialData });
      setCurrentStep(0);
      setDirection(1);
    }, [initialData, isOpen]);
  ```
- **Observed Behavior**:
  When `initialData` is not explicitly provided by the consumer:
  1. Default parameter `initialData = {}` evaluates on every invocation of `SteppedForm`.
  2. Inside `useEffect`, `setFormData({ ...initialData })` triggers a component re-render.
  3. The re-render triggers parameter destructuring, generating a new object `{}` for `initialData`.
  4. React's dependency comparison `Object.is(prevInitialData, nextInitialData)` returns `false` (`{} !== {}`), queuing another effect execution indefinitely.
  5. Empirical execution produced:
     ```
     console.error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
       74 |   useEffect(() => {
     > 75 |     setFormData({ ...initialData });
          |     ^
     ```
  6. Furthermore, in `__tests__/client/stress-interactive.test.js`:
     When a parent component re-renders (passing a new inline object reference `initialData={{ ... }}`), the `useEffect` fires while the user is actively on Step 2 or 3, forcefully resetting `currentStep` to `0` and destroying uncommitted user input.

### Obs 2: `SteppedForm.jsx` — Rapid Next Spamming Causes Step Index Overflow (`Langkah 21 dari 4`, `525% Selesai`)
- **Location**: `components/ui/SteppedForm.jsx:161-172`
- **Code**:
  ```javascript
  const handleNext = () => {
    ...
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };
  ```
- **Observed Behavior**:
  The guard `currentStep < totalSteps - 1` checks the **stale closure value** of `currentStep`, but the state update uses an unconstrained functional updater `setCurrentStep((prev) => prev + 1)`.
  When a user rapidly spams or double/triple-taps the "Lanjut" button (simulated with 20 clicks in `__tests__/client/stress-interactive.test.js`):
  1. All 20 clicks evaluate `currentStep < totalSteps - 1` against the initial closure value (`0 < 3`).
  2. All 20 clicks queue `prev => prev + 1`.
  3. React flushes the functional updates: `currentStep` increments to `20`.
  4. In `FormProgressBar.jsx:27`, progress computes to:
     `progressPercent = Math.round(((20 + 1) / 4) * 100) = 525%`.
  5. The UI renders:
     ```html
     <span class="flex items-center gap-1.5 ...">Langkah 21 dari 4</span>
     <span class="text-gray-500 ...">525% Selesai</span>
     <div aria-valuenow="525" role="progressbar" ...>
     ```
  6. `allSteps[20]` is `undefined`, so `currentStepDef.title` and `fields` evaluate to `undefined`. The form body becomes blank, the review step is never rendered, and the form cannot be submitted.
  7. The same issue exists on `handlePrev`: rapid clicking underflows `currentStep` to negative integers (`-1`, `-2`).

### Obs 3: `Sidebar.js` — Crash on `null` Pathname in Next.js Fallback / Suspense Transitions
- **Location**: `components/Sidebar.js:42-45`
- **Code**:
  ```javascript
  const isActive = (href) => href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  ```
- **Observed Behavior**:
  In Next.js App Router, `usePathname()` is documented to return `null` during fallback routes, suspense boundaries, and initial prerendering.
  When `pathname` is `null`, `pathname.startsWith(`${href}/`)` throws:
  ```
  TypeError: Cannot read properties of null (reading 'startsWith')
      at startsWith (components/Sidebar.js:44:37)
      at isActive (components/Sidebar.js:120:28)
  ```
  This unhandled exception crashes the entire client-side navigation tree.

### Obs 4: `Dialog.jsx` — Focus Trap Degradation When `offsetParent` is Null
- **Location**: `components/ui/Dialog.jsx:53-57`
- **Code**:
  ```javascript
  if (e.key === 'Tab') {
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  ```
- **Observed Behavior**:
  In JSDOM and in browser environments where elements are inside `position: fixed` containers (or styled with specific transforms), `offsetParent` returns `null`.
  When `offsetParent === null` for all focusable items:
  1. The filter expression `el.offsetParent !== null || el === document.activeElement` evaluates to `true` ONLY for the currently active element (`el === document.activeElement`).
  2. `items` collapses to an array of length 1 (`[currentActiveElement]`).
  3. Both `first` and `last` point to the identical active element.
  4. Pressing `Tab` from that element triggers `e.preventDefault(); first.focus();`, locking focus to that single element and preventing keyboard users from tabbing to any other button or input in the modal.

### Obs 5: `DashboardToolbar.jsx` & `FormProgressBar.jsx` `layoutId` Invariant Verification
- **Location**: `components/DashboardToolbar.jsx:69` (`layoutId="dashboardFilterPill"`), `components/ui/FormProgressBar.jsx:83` (`layoutId="formProgressActivePill"`), `components/Sidebar.js:131, 162` (`layoutId="sidebarActivePill"`)
- **Observed Behavior**:
  Under 30 rapid sequential tab switches (5 complete cycles across 6 tabs) and rapid step advancements:
  1. Active pill remained strictly singleton: exactly 1 element with the active pill styling and `layoutId` in the DOM at all times.
  2. No duplicate pills or orphaned DOM nodes were created.
  3. Empty filter lists (`tableFilters = []`) and zero-step forms (`steps = []`) rendered null or clean fallback without throwing.

---

## 2. Logic Chain

1. **Premise 1 (Obs 1)**: In React, `useEffect([initialData, isOpen])` relies on reference equality. Default parameter syntax `initialData = {}` allocates a new object instance on every render cycle where `props.initialData` is undefined.
   - Calling `setFormData` inside the effect schedules a state update.
   - The subsequent render evaluates default parameter `{}`, generating a new reference.
   - `Object.is(prev, next)` fails on every cycle, inducing an infinite loop that crashes the application thread with `Maximum update depth exceeded`.
   - Additionally, any non-memoized object passed by a parent triggers this effect, wiping out user input and resetting `currentStep` to 0.

2. **Premise 2 (Obs 2)**: Synchronous event dispatching (such as fast finger tapping or double clicks) queues multiple click events before React's state transition re-renders the component and updates closure bindings.
   - `if (currentStep < totalSteps - 1)` reads stale closure `0`.
   - `setCurrentStep((prev) => prev + 1)` executes repeatedly on the previous state without boundary clamping (`Math.min`).
   - The step counter escalates to arbitrary numbers (`20`, `21`), exceeding `totalSteps` (`4`).
   - `allSteps[currentStep]` resolves to `undefined`, breaking wizard rendering and blocking submission.

3. **Premise 3 (Obs 3)**: Next.js App Router specifies that `usePathname()` can return `null`.
   - `pathname.startsWith(...)` assumes `pathname` is always a string.
   - When `pathname` is `null`, JavaScript throws a fatal `TypeError`.

4. **Premise 4 (Obs 4)**: CSSOM defines that `offsetParent` is `null` for elements with `display: none`, elements inside `position: fixed` in certain rendering engines, and in all JSDOM environments.
   - Filtering focus trap targets by `el.offsetParent !== null` discards all valid focusable elements when `offsetParent` is null.
   - This breaks keyboard accessibility by trapping the focus on a single element.

5. **Conclusion**: While layout morphing (`layoutId`) and animation framer-motion variants are syntactically sound and pass the existing 26 suites, the interactive state management and navigation shell contain high-severity failure modes that break user workflows, cause runtime crashes, and create infinite render loops.

---

## 3. Caveats

- **Hardware Acceleration Frame Rate**: 60fps frame timing was analyzed through code inspection (GPU exclusivity: `transform`, `opacity` vs `backdrop-filter` isolation in CSS) and unit stress testing in JSDOM. True GPU frame profiling requires a live Chrome DevTools Performance recording session.
- **Production Data Safety**: Zero mutations were executed against live database endpoints. All tests were executed in client-side harnesses.

---

## 4. Conclusion & Actionable Mitigations

### Final Assessment: **REQUEST_CHANGES**

The work product contains 4 reproducible bugs that must be corrected before M5 approval:

1. **Fix `SteppedForm.jsx` Infinite Loop & Unwanted Step Resets**:
   - Define a static empty object outside the component:
     ```javascript
     const EMPTY_DATA = {};
     export default function SteppedForm({ initialData = EMPTY_DATA, ... })
     ```
   - Do NOT run step reset `setCurrentStep(0)` on every `initialData` change. Only initialize when `isOpen` flips from `false` to `true`:
     ```javascript
     const prevOpenRef = useRef(isOpen);
     useEffect(() => {
       if (isOpen && !prevOpenRef.current) {
         setFormData({ ...initialData });
         setCurrentStep(0);
         setDirection(1);
       }
       prevOpenRef.current = isOpen;
     }, [isOpen, initialData]);
     ```

2. **Fix `SteppedForm.jsx` Step Overflow on Rapid Clicking**:
   - Clamp step navigation inside functional updaters:
     ```javascript
     const handleNext = () => {
       ...
       setDirection(1);
       setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
     };

     const handlePrev = () => {
       setDirection(-1);
       setCurrentStep((prev) => Math.max(0, prev - 1));
     };
     ```

3. **Fix `Sidebar.js` Crash on Null Pathname**:
   - Guard `pathname` with null check:
     ```javascript
     const isActive = (href) => {
       if (!pathname) return false;
       return href === '/dashboard'
         ? pathname === href
         : pathname === href || pathname.startsWith(`${href}/`);
     };
     ```

4. **Fix `Dialog.jsx` Focus Trap Null OffsetParent**:
   - Replace `el.offsetParent !== null` with a robust visibility check:
     ```javascript
     const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
       (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
     );
     ```

---

## 5. Verification Method

To independently verify these findings:

1. **Run the Stress Test Suite**:
   ```powershell
   npx jest __tests__/client/stress-interactive.test.js
   ```
   *Expected*: All 20 tests pass, confirming the presence of the reproducible bug conditions and verifying passing invariants.

2. **Run Full Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: 28 test suites, 255 tests passing.

3. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js 16.2.5 Turbopack builds cleanly (61/61 static pages generated).
