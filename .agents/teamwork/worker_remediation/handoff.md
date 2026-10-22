# Milestone M5 Remediation Report: Interactive Edge Case Fixes

## 1. Observation

### Obs 1: `SteppedForm.jsx` — Infinite Loop on `initialData` & Forced Step Reset
- **Location**: `components/ui/SteppedForm.jsx:14, 57, 69, 72-80`
- **Issue**: Default parameter `initialData = {}` produced a new object reference on each render when consumers omitted `initialData`. Furthermore, `useEffect(() => { setFormData({ ...initialData }); setCurrentStep(0); setDirection(1); }, [initialData, isOpen])` fired on every parent re-render, resetting active step to 0 and wiping uncommitted user input.
- **Fix Implemented**:
  1. Defined a module-level static constant `const EMPTY_DATA = {};` outside the component.
  2. Set default parameter `initialData = EMPTY_DATA`.
  3. Added `const prevOpenRef = useRef(isOpen);` and guarded `useEffect`:
     ```javascript
     useEffect(() => {
       if (isOpen && !prevOpenRef.current) {
         setFormData({ ...initialData });
         setCurrentStep(0);
         setDirection(1);
       }
       prevOpenRef.current = isOpen;
     }, [isOpen, initialData]);
     ```

### Obs 2: `SteppedForm.jsx` — Rapid Next Spamming Step Index Overflow
- **Location**: `components/ui/SteppedForm.jsx:167-179`
- **Issue**: `handleNext` checked `currentStep < totalSteps - 1` against the closure state, but `setCurrentStep((prev) => prev + 1)` queued unbounded increments when rapid clicks occurred before state re-renders (reaching step 20 / 525% progress).
- **Fix Implemented**:
  1. Clamped `handleNext`:
     ```javascript
     if (currentStep < totalSteps - 1) {
       setDirection(1);
       setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
     }
     ```
  2. Clamped `handlePrev`:
     ```javascript
     if (currentStep > 0) {
       setDirection(-1);
       setCurrentStep((prev) => Math.max(0, prev - 1));
     }
     ```

### Obs 3: `Sidebar.js` — Unhandled Null Pathname Crash
- **Location**: `components/Sidebar.js:42-47`
- **Issue**: `isActive` evaluated `pathname === href || pathname.startsWith(...)`. When Next.js App Router returned `null` for `pathname` during suspense boundaries or fallback transitions, it crashed with `TypeError: Cannot read properties of null (reading 'startsWith')`.
- **Fix Implemented**:
  Guarded `pathname` with null check:
  ```javascript
  const isActive = (href) => {
    if (!pathname) return false;
    return href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  };
  ```

### Obs 4: `Dialog.jsx` — Focus Trap Degradation from Null `offsetParent`
- **Location**: `components/ui/Dialog.jsx:55-57`
- **Issue**: Inside the focus trap `Tab` handler, `(el) => el.offsetParent !== null || el === document.activeElement` caused all elements with `offsetParent === null` (such as in JSDOM or inside fixed/transformed containers) to be discarded except `document.activeElement`, collapsing the focus trap to a single locked element.
- **Fix Implemented**:
  Replaced `offsetParent` check with accessibility attribute check:
  ```javascript
  const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
  ```

### Obs 5: Adversarial Test Harness Assertions Updated
- **Location**: `__tests__/client/stress-interactive.test.js:111-170, 360-375, 598-615`
- **Action**: Per orchestrator authorization, updated the 4 adversarial tests previously asserting bug presence (`BUG CONFIRMED`) to assert the robust remediated invariants (`REMEDIATED`):
  1. Next spamming: asserted `currentStep` clamps at `Langkah 4 dari 4` (100% Selesai) with `Simpan Data` visible.
  2. Parent re-renders: asserted in-progress step is preserved (stays on Step 2, does not reset to Step 0).
  3. Sidebar with null pathname: asserted `render` does not throw and yields 0 active nav links.
  4. Focus trap: asserted Tab wraps from last element (`Tutup`) to first focusable element (`Tombol 1`).

---

## 2. Logic Chain

1. **Static Reference for Default Props**: Module-level `EMPTY_DATA` guarantees reference identity (`Object.is(EMPTY_DATA, EMPTY_DATA) === true`) across render cycles, eliminating the dependency churn in `useEffect`.
2. **Transition-Only Reset**: `prevOpenRef` tracks the edge-triggered transition (`!prevOpenRef.current && isOpen`). Form data and step indices only reset when the dialog transitions from closed to open, leaving state intact across arbitrary parent re-renders while the modal is open.
3. **Clamping in Functional Updaters**: React processes functional state updaters sequentially. Clamping `Math.min(totalSteps - 1, prev + 1)` and `Math.max(0, prev - 1)` ensures that no matter how many clicks are queued synchronously in a single event batch, the resulting step index cannot exceed `[0, totalSteps - 1]`.
4. **Falsy Guard on Next.js Pathname**: Early return `if (!pathname) return false;` guarantees that `pathname.startsWith` is never invoked on `null` or `undefined`, preventing navigation crashes during Next.js App Router Suspense fallback states.
5. **A11y-Aware Focus Trap Filtering**: Replacing brittle CSS layout checks (`offsetParent !== null`) with standard HTML/ARIA attributes (`!el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'`) guarantees focus trapping works consistently across JSDOM, headless environments, and browsers utilizing fixed or hardware-accelerated transforms.

---

## 3. Caveats

- **No Caveats**: All 4 target defects have been resolved directly in their owning components with clean, genuine logic without facades or test-specific hacks. Zero database schema mutations were performed.

---

## 4. Conclusion

All 4 defects raised by Challenger 1 have been completely remediated:
1. `SteppedForm.jsx` no longer has an infinite render loop and preserves wizard step progress during parent re-renders.
2. `SteppedForm.jsx` step counter is strictly clamped to valid step bounds regardless of click speed.
3. `Sidebar.js` safely handles `null` pathname during Next.js suspense transitions without throwing.
4. `Dialog.jsx` focus trap cleanly cycles focus across all enabled modal elements without self-locking.

---

## 5. Verification Method

To independently verify the remediated behaviors:

1. **Run Stress Test Suite**:
   ```powershell
   npx jest __tests__/client/stress-interactive.test.js
   ```
   *Result*: 1 suite passed, 20/20 tests passed.

2. **Run All Client Tests**:
   ```powershell
   npm run test:client
   ```
   *Result*: 9 suites passed, 75/75 tests passed.

3. **Run Full Test Suite**:
   ```powershell
   npm test
   ```
   *Result*: 28 suites passed, 255/255 tests passed.

4. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Result*: Next.js 16.2.5 Turbopack builds cleanly with 0 errors.
