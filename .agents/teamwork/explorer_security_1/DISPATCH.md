## 2026-10-12T13:30:15Z
[Message] timestamp=2026-10-12T13:30:15Z sender=5958bfee-566f-423e-91c9-c9c4034e8cf9 priority=MESSAGE_PRIORITY_HIGH content=You are the Security & API Authorization Auditor (teamwork_preview_explorer).
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_security_1
The project root is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi
Read the original request at: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md
Also read AGENTS.md / CLAUDE.md for project conventions.

STRICT SAFETY CONSTRAINTS:
1. READ-ONLY: DO NOT modify any application code, schema, or data.
2. Dilarang menulis/menghapus data pada database produksi Supabase (.env.local), dilarang menjalankan skrip SQL apa pun.
3. Dilarang mencetak nilai rahasia (.env / .env.local / keys / passwords) ke laporan.
4. git status harus tetap bersih.

YOUR MISSION:
Perform a comprehensive audit of Aspek 1: Keamanan (Security) and create the complete API Authorization Matrix.

SPECIFIC REQUIREMENTS:
1. Complete API Authorization Matrix for EVERY route under `app/api/**/route.js`:
   - Scan all route files in `app/api/`
   - For every route file and every supported HTTP method (GET, POST, PUT, PATCH, DELETE):
     * Route path (e.g. `/api/rekap-dawis`, `/api/admin/users`, `/api/chat`, etc.)
     * Method (GET/POST/etc.)
     * Auth helper used (`requireAuth`, `requireAdmin`, custom, or none/public)
     * Allowed roles (`admin`, `sekretaris`, `pokja1-4`, `dusun_*`, `user`, public)
     * Row-level check implemented? (`canWriteRow`, `dusun_id` matching, etc.)
     * Security notes & vulnerabilities identified (e.g., missing auth, improper error handling, authorization bypass, injection risks, rate limit presence).
2. Deep security inspection:
   - Auth & Session: JWT handling in `lib/auth.js` and `proxy.js` (secret validation, algorithm pinning, expiration, cookie attributes httpOnly/secure/sameSite).
   - Rate limiting: `lib/rate-limit.js`, IP extraction (is `x-forwarded-for` spoofable?), failure behavior when DB rate limit fails.
   - Row-level access control: kader-dusun permissions (`ROLE_SCOPE`, `canWriteRow`), can a cadre tamper with another dusun's data?
   - Supabase & RLS: Does the server use service_role for all operations? Are anon keys exposed to the client? What RLS policies exist in Supabase?
   - AI Mutation Security: `/api/chat`, `lib/aiMutation.js`, dry-run pattern, validation against `VALID_TABLES` & `VALID_COLUMNS`, can prompts bypass role checks?
   - Injections: SQL/PostgREST injection risks in query builders, XSS risks in user inputs or Excel exports.
   - Secret Exposure: Check client bundles, public routes, or error responses for leaked keys or stack traces.

FORMAT OF FINDINGS:
For each issue found, document:
- ID: `SEC-001`, `SEC-002`, etc.
- Aspek: Keamanan
- Severity: Kritis / Tinggi / Sedang / Rendah
- Lokasi: `file_path:line_number` (must be exact and valid)
- Deskripsi Masalah: clear explanation of the issue
- Dampak: practical security impact
- Rekomendasi Konkret: specific code/architectural fix recommendation

OUTPUT:
Write your full findings and the complete API Authorization Matrix table to:
`c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_security_1\security_audit.md`
and write your `handoff.md` in your directory.
Send a message back to the orchestrator when completed.
