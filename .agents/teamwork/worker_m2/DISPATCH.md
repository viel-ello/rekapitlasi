# Dispatch Assignment: Milestone M2 - Liquid Glass KPI Cards & Physics (R2)

## Exclusive File Ownership
- `app/dashboard/page.js`
- `components/DataStatsPage.js`
- `components/AnimatedCounter.js`
- `components/ui/AnimatedCounter.jsx`

## Objective & Requirements
Implement 21st.dev style Liquid Glass interactive cards and dashboard physics:

1. **Dashboard KPI Cards (`app/dashboard/page.js` & `components/DataStatsPage.js`)**:
   - Wrap the cards container in `motion.div` with staggered entrance variants (`staggerChildren: 0.08`, `delayChildren: 0.1`).
   - Wrap each KPI card in `motion.div` with entrance variants (`hidden: { opacity: 0, y: 16 }`, `show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }`).
   - Add micro-interaction hover elevation and spring tap:
     `whileHover={{ y: -4, scale: 1.015 }}`
     `whileTap={{ scale: 0.985 }}`
     `transition={{ type: "spring", stiffness: 350, damping: 25 }}`
   - Add specular reflection sweep on hover: subtle white sheen gradient overlay (`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`).
   - Keep `.glass`, `.glass-card` styling in static CSS (`backdrop-filter: blur(40px) saturate(200%)`). DO NOT animate `backdropFilter` in motion props.
2. **`components/AnimatedCounter.js` & `components/ui/AnimatedCounter.jsx`**:
   - Import and check `useReducedMotion()`. If reduced motion is requested, immediately render target value without animation delay.
   - Smooth count-up easing with locale formatting. Ensure `components/ui/AnimatedCounter.jsx` re-exports or mirrors this cleanly.

## Mandatory Rules & Integrity
- DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Run `npm test` and `npm run build` to verify 100% pass and 0 errors.

## Deliverable
Write your report in `.agents/teamwork/worker_m2/handoff.md` and report back via send_message.


## 2026-10-22T11:50:44Z
[Message] timestamp=2026-10-22T11:50:44Z sender=0c22180d-d9b7-430b-85ce-270db2e50d88 priority=MESSAGE_PRIORITY_HIGH content=You are the Worker for Milestone M2: Liquid Glass KPI Cards & Physics (R2).
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m2\

You MUST read:
1. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md (under ## Follow-up — 2026-10-22T11:33:14Z)
2. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\PROJECT.md
3. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m2\DISPATCH.md
4. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_cards_dialogs\handoff.md

Exclusive file ownership:
- app/dashboard/page.js
- components/DataStatsPage.js
- components/AnimatedCounter.js
- components/ui/AnimatedCounter.jsx

Implement staggered entrance variants, spring hover/tap physics on KPI cards, specular sheen gradient overlay, and AnimatedCounter with useReducedMotion().
Keep backdrop-filter in static CSS; do not animate backdropFilter in motion props.
Run npm run test:client and npm test to verify.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m2\handoff.md and notify me via send_message.
