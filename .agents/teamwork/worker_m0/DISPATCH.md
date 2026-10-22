# Dispatch Assignment: Milestone M0 - Test Harness & Motion Setup

## Objective
Update `jest.setup.js` to provide standard JSDOM polyfills for `window.matchMedia`, `global.IntersectionObserver`, and `global.ResizeObserver`.
This ensures tests continue to run cleanly in JSDOM when components use Framer Motion hooks (`useReducedMotion`, `useInView`, `layoutId`).

## Exclusive File Ownership
- `jest.setup.js`

## Requirements
1. In `jest.setup.js`, add:
   - `window.matchMedia` polyfill if `typeof window !== 'undefined'`.
   - `global.IntersectionObserver` mock class if undefined.
   - `global.ResizeObserver` mock class if undefined.
2. Run test suites to verify:
   - `npm run test:client`
   - `npm test`
3. Verify that all 24 suites (205 tests) pass cleanly with exit code 0.
4. DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your report in `.agents/teamwork/worker_m0/handoff.md` with:
- Exact lines modified in `jest.setup.js`
- Test commands executed and full pass/fail output
- Notification via `send_message`.


## 2026-10-22T11:47:03Z
[Message] timestamp=2026-10-22T11:47:03Z sender=0c22180d-d9b7-430b-85ce-270db2e50d88 priority=MESSAGE_PRIORITY_HIGH content=You are the Worker for Milestone M0: Test Harness & Motion Setup.
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m0\

You MUST read:
1. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\PROJECT.md
3. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m0\DISPATCH.md
4. c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_infra_a11y\handoff.md

Exclusive file ownership: `jest.setup.js` ONLY.

Implement the JSDOM polyfills for `window.matchMedia`, `global.IntersectionObserver`, and `global.ResizeObserver` in `jest.setup.js`.
Run `npm run test:client` and `npm test` to verify 100% passing tests.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m0\handoff.md and notify me via send_message.
