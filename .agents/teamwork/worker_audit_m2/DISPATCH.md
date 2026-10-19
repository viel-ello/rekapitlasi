## 2026-10-12T15:28:41Z

You are the Implementation Worker for Milestone 2: Audit Remediations, Data Pipelines & Guardrails (`worker_audit_m2`).

Your working directory is:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_audit_m2`

You MUST read the authoritative user request at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically see section `## Follow-up — 2026-10-12T15:13:12Z`).

You MUST also read the Project scope document at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\PROJECT.md`
and the Explorer Blueprint reports at:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_audit\handoff.md`
and
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_build\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Ownership (You own these exclusively):
- `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql`
- `supabase_schema_updates_v14_fix_index_and_rls.sql`
- `next.config.mjs`
- `app/api/export/word/route.js`
- `app/api/chat/route.js`
- `app/api/auth/password/route.js`

Objectives to Implement:
1. Operational Reset Script Safeguard (DB-001):
   - In `supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql`, comment out lines 69-80 (`-- TRUNCATE TABLE ... RESTART IDENTITY CASCADE;`) for complete defense-in-depth against highlighted partial execution in the SQL Editor. The `DO $$ BEGIN RAISE EXCEPTION ... END $$;` block remains active.
2. Migration v14 Performance Indexes (PERF-003):
   - In `supabase_schema_updates_v14_fix_index_and_rls.sql`, append Step 5 adding B-Tree indexes on `(tahun)` and `(tahun, bulan)` for the operational data tables (`data_umum`, `data_pokja1`, `data_pokja2`, `data_pokja3`, `data_pokja4`, `data_rekap_dawis`, `data_bumil`) using `CREATE INDEX IF NOT EXISTS ...`.
3. Turbopack Root Configuration:
   - In `next.config.mjs`, import `path` and configure `turbopack: { root: path.resolve('.') }` in `nextConfig` to cleanly resolve the dual lockfile warning.
4. Word Document Export Expansion (ARCH-003, FEAT-002):
   - In `app/api/export/word/route.js`, expand export sections to include Data Umum, Rekap Dawis, and Bumil alongside Pokja I–IV. Maintain landscape orientation and existing formatting conventions.
5. Security Rate Limiting (SEC-007):
   - In `app/api/chat/route.js` and `app/api/auth/password/route.js`, incorporate IP-based / user-based rate limiting via `lib/rate-limit.js` (`checkRateLimit`). Return 429 Too Many Requests if the rate limit is exceeded.
6. Build & Test Verification:
   - Run `npm test -- --selectProjects server` ensuring all 19 suites and 180 tests pass 100%.
   - Verify zero live database mutations against production Supabase.

Report output:
Write your full report to `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_audit_m2\handoff.md`.
Send a message back to the orchestrator when finished.
