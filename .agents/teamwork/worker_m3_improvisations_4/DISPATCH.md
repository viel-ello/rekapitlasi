## 2026-10-22T15:22:45Z
You are worker_m3_improvisations_4, a Specialist High-Impact Features Implementation Worker.
Your working directory is: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\worker_m3_improvisations_4
Parent orchestrator conversation ID: ffab784d-de42-4b37-aceb-f1c33fa6d63b

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICTLY EXCLUDED FEATURES (DO NOT IMPLEMENT OR TOUCH):
- ❌ Rate Limiter AI pada `/api/chat`
- ❌ Peta Geospasial Choropleth
- ❌ Pengingat WhatsApp 1-Klik otomatis
- ❌ Sistem Peringatan Dini (Early Warning)
- ❌ Generator Narasi Laporan Tahunan AI
- ❌ Blok Tanda Tangan Resmi pada Ekspor

MANDATORY REFERENCES TO READ FIRST:
1. `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\ORIGINAL_REQUEST.md` (section ## Follow-up — 2026-10-22T15:08:05Z)
2. `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\orchestrator_4\PROJECT.md`
3. Detailed architectural blueprint and line-by-line findings in:
   `c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agents\teamwork\explorer_survey_improvisations_4\handoff.md`

EXCLUSIVE FILE OWNERSHIP (You may ONLY modify these files):
- `lib/dataQuality.js`
- `components/DataQualityAuditor.jsx` (create new file)
- `components/CompletenessHeatmap.jsx` (create new file)
- `app/dashboard/page.js`
- `app/publik/page.js`
- `components/public/KilasDusunInfographic.jsx` (create new file)
- `components/public/DusunBenchmarkMatrix.jsx` (create new file)
- `components/public/ShareableReportCard.jsx` (create new file)

DETAILED TASKS TO IMPLEMENT:
1. Cross-Table Data Quality Auditor:
   - In `lib/dataQuality.js`, implement `auditCrossTableConsistency(...)` checking:
     a) Balita consistency (Pokja IV vs Rekap Dawis, balita meninggal vs balita population)
     b) KK vs Jiwa in Data Umum (`totalJiwa >= jml_kk`, no KK without Jiwa, KK umum vs KK Dawis)
     c) Bumil Risti vs pendampingan & Bumil data vs Dawis
   - In `components/DataQualityAuditor.jsx`, build VisionOS Translucent Liquid Glass alert cards (`blur(40px) saturate(200%)`, specular rim, emerald accents) with 3 urgency tiers (Kritis, Peringatan, Info) and deep links to edit pages. Mount it in `app/dashboard/page.js`.
2. Liquid Glass Completeness Heatmap:
   - In `components/CompletenessHeatmap.jsx`, build a 9 Dusun × 12 Bulan visual matrix displaying report completeness with 3 semantic status colors (Emerald = Lengkap, Amber = Sebagian, Slate/Rose = Kosong), interactive tooltips, and smooth Framer Motion entrance. Mount it in `app/dashboard/page.js`.
   - Also in `app/dashboard/page.js`: on Word download button (`_performDownload`), pass `&bulan=${bulan}` so monthly Word export works as expected.
3. Portal Publik 2.0:
   - In `app/publik/page.js`, integrate:
     a) `components/public/KilasDusunInfographic.jsx`: interactive achievement cards per dusun, visual and mobile responsive.
     b) `components/public/DusunBenchmarkMatrix.jsx`: side-by-side comparison matrix for 2–3 selected dusun.
     c) `components/public/ShareableReportCard.jsx`: aesthetic summary report card with 1-click WhatsApp text copy and share button (strictly PII-safe).

VERIFICATION:
- Run `npm test` using run_command to verify all tests pass 100%.
- Document commands and results in your `handoff.md` in your working directory.
- Send a completion message to parent orchestrator via send_message.
