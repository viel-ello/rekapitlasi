# Dispatch Assignment: Milestone M3 - Accessible Modal Dialog & Step Transitions (R3)

## Exclusive File Ownership
- `components/ui/Dialog.jsx`
- `components/ui/SteppedForm.jsx`

## Objective & Requirements
Implement smooth exit and directional physics with `AnimatePresence`:

1. **`components/ui/Dialog.jsx`**:
   - Wrap dialog modal in `<AnimatePresence>`:
     ```jsx
     <AnimatePresence>
       {open && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2 }}
             className="fixed inset-0 bg-black/50 backdrop-blur-sm"
             onClick={onClose}
           />
           <motion.div
             initial={{ opacity: 0, scale: 0.95, y: 16 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: 16 }}
             transition={{ type: "spring", stiffness: 350, damping: 25 }}
             className={`relative z-10 glass-panel ...`}
             role="dialog"
             aria-modal="true"
           >
             ...
           </motion.div>
         </div>
       )}
     </AnimatePresence>
     ```
   - Ensure exit animations play fully before unmounting from DOM.
   - Must preserve all props, classNames, accessibility attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, etc.), and keep `Dialog.test.js` passing 100%.

2. **`components/ui/SteppedForm.jsx`**:
   - Add direction state: `const [direction, setDirection] = useState(1);`.
   - Update `onNext` (set direction = 1) and `onPrev` (set direction = -1), and direct step selection (stepIndex > currentStep ? 1 : -1).
   - Use `useReducedMotion()`.
   - Wrap current step content in:
     `<AnimatePresence mode="popLayout" custom={direction} initial={false}>`
       `<motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" ...>`
     Where `slideVariants`:
     `enter: (dir) => ({ x: shouldReduceMotion ? 0 : (dir > 0 ? 32 : -32), opacity: 0 })`
     `center: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 28 } }`
     `exit: (dir) => ({ x: shouldReduceMotion ? 0 : (dir > 0 ? -32 : 32), opacity: 0, transition: { duration: 0.15 } })`
   - Using `mode="popLayout"` ensures next step renders immediately for synchronous test assertions in `SteppedForm.test.js`.

## Mandatory Rules & Integrity
- DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Run `npm test` and `npm run build` to verify 100% pass and 0 errors.

## Deliverable
Write your report in `.agents/teamwork/worker_m3/handoff.md` and report back via send_message.

## 2026-10-22T11:50:44Z
[Message from 0c22180d-d9b7-430b-85ce-270db2e50d88]
You are the Worker for Milestone M3: Accessible Modal Dialog & Step Transitions (R3).
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m3\
Exclusive file ownership:
- components/ui/Dialog.jsx
- components/ui/SteppedForm.jsx
Implement AnimatePresence modal dialog exit animations in Dialog.jsx without breaking consumer call sites.
Implement directional horizontal slide in SteppedForm.jsx using mode="popLayout", custom={direction}, and useReducedMotion().
Run npm run test:client and npm test to verify.

