# Handoff Report — Adversarial Verification of Export Inflation Fix & Regression Guard

- **Agent**: `challenger_2_4` (Adversarial Export & Regression Verifier)
- **Roles**: `critic`, `specialist`
- **Parent Conversation ID**: `ffab784d-de42-4b37-aceb-f1c33fa6d63b`
- **Target Files**:
  - `app/api/export/excel/route.js`
  - `app/api/export/word/route.js`
  - `app/dashboard/page.js`
- **Test Artifact**: `__tests__/server/annual-export-inflation.test.js`
- **Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Annual Export Stock Metric Inflation Fix (`app/api/export/excel/route.js` & `app/api/export/word/route.js`)
- **Excel Export (`app/api/export/excel/route.js:51-87`)**:
  - Direct Code:
    ```javascript
    const SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis']);
    ...
    if (isMonthly && bulan == null && isSnapshot) {
      // SNAPSHOT TABLE ANNUAL EXPORT: Ambil data bulan terakhir yang tersedia per dusun (mencegah inflasi 12x)
      const sortedRows = (rows || []).slice().sort((a, b) => (Number(a.bulan) || 0) - (Number(b.bulan) || 0));
      for (const row of sortedRows) {
        const id = unitIdOf(row);
        const dusunName = Object.keys(dusunByName).find((nama) => dusunByName[nama].id === id);
        if (dusunName) {
          map[dusunName] = row;
        }
      }
      return map;
    }
    ```
  - For snapshot tables (`data_umum`, `data_rekap_dawis`) when `bulan == null`, `rows` are sorted ascending by month number. Subsequent months overwrite earlier months, ensuring each dusun entry contains strictly the latest available month record.
  - For event tables (`data_bumil`), lines 89–114 are executed: all months are cumulatively summed across numeric fields (`existing[k] = (Number(existing[k]) || 0) + num;`), preserving correct annual cumulative metrics (total births, maternal deaths, etc.).

- **Word Export (`app/api/export/word/route.js:426-503`)**:
  - Direct Code:
    ```javascript
    const SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis']);
    const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);
    ...
    // Latest available month row for snapshot tables when bulan is null (annual export)
    let targetRow = null;
    if (isMonthly && bulan == null && isSnapshot) {
      targetRow = rows.slice().sort((a, b) => (Number(b.bulan) || 0) - (Number(a.bulan) || 0))[0] || null;
    }
    const latestDawisRow = dawisRows.slice().sort((a, b) => (Number(b.bulan) || 0) - (Number(a.bulan) || 0))[0] || null;

    const aggregated = {};
    secDef.flatKeys.forEach((k) => {
      if (targetRow) {
        aggregated[k] = Number(targetRow[k]) || 0;
      } else {
        let sum = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
        if (sum === 0 && secDef.table === 'data_bumil') {
          if (k === 'jml_rt') sum = latestDawisRow ? (Number(latestDawisRow.jml_rt) || 0) : 0;
          if (k === 'jml_rw') sum = latestDawisRow ? (Number(latestDawisRow.jml_rw) || 0) : 0;
          if (k === 'jml_dasa_wisma') sum = latestDawisRow ? (Number(latestDawisRow.jml_dawis) || 0) : 0;
        }
        aggregated[k] = sum;
      }
    });
    ```
  - Direct observation: When `isSnapshot` is true and `bulan == null`, `targetRow` selects the row with the maximum month number (`b.bulan - a.bulan`). `aggregated[k]` takes `Number(targetRow[k]) || 0`, avoiding the 12x summation loop.
  - When `isSnapshot` is false (`data_bumil`), `targetRow` is `null`, and `rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)` sums all months.
  - If `jml_rt`, `jml_rw`, `jml_dasa_wisma` are 0 in `data_bumil`, it falls back to `latestDawisRow` (latest available month from `data_rekap_dawis`), preventing inflation of administrative infrastructure counts in Bumil reports.

### 1.2 Query Parameter `?bulan=MM` Support in Word Export (`app/api/export/word/route.js` & `app/dashboard/page.js`)
- Direct Code in `app/api/export/word/route.js:444, 570, 610`:
  ```javascript
  const bulan = searchParams.get('bulan') ? Number(searchParams.get('bulan')) : null;
  ...
  const monthTitle = bulan != null ? ` · BULAN : ${String(bulan).padStart(2, '0')}` : '';
  children.push(
    ...,
    new Paragraph({ children: [new TextRun({ text: `TAHUN : ${tahun}${monthTitle}`, ... })] })
  );
  ...
  const stamp = `${tahun}${bulan != null ? `_Bulan_${String(bulan).padStart(2, '0')}` : ''}`;
  return new NextResponse(buffer, { status: 200, headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="Data_Kegiatan_PKK_${stamp}.docx"`,
  }});
  ```
- Direct Code in `app/dashboard/page.js:203-205`:
  ```javascript
  const exportUrl = type === 'word' && bulan
    ? `/api/export/word?tahun=${tahun}&bulan=${bulan}`
    : `/api/export/${type}?tahun=${tahun}`;
  ```
- Observation: When a user selects a month on the dashboard, clicking "Unduh Word" calls `/api/export/word?tahun=YYYY&bulan=MM`, which applies row filtering `.eq('bulan', bulan)`, adds the month stamp to document headers, and names the downloaded file `Data_Kegiatan_PKK_YYYY_Bulan_MM.docx`.

### 1.3 Zero Production Mutation & Credentials Check
- `git status` output directly checked:
  - 0 live SQL migrations executed.
  - No `.env` or `.env.local` files modified or added.
  - Working tree only contains legitimate application code changes and teamwork documentation metadata.

### 1.4 Test Suite & Production Build Results
- `npm test`:
  ```text
  Test Suites: 33 passed, 33 total
  Tests:       309 passed, 309 total
  Snapshots:   0 total
  Time:        8.961 s
  Ran all test suites in 2 projects.
  ```
- `npm run build`:
  ```text
  ▲ Next.js 16.2.5 (Turbopack)
  - Environments: .env.local
  Creating an optimized production build ...
  ✓ Compiled successfully in 17.0s
  Running TypeScript ...
  Finished TypeScript in 148ms ...
  ✓ Generating static pages using 11 workers (62/62) in 756ms
  Finalizing page optimization ...
  ```

---

## 2. Logic Chain

1. **Root Cause Analysis of the Export Inflation**:
   - In prior revisions, annual reports (`bulan == null`) blindly reduced all returned rows across all months for every table with `rows.reduce((s, r) => s + Number(r[k]), 0)`.
   - For snapshot tables like `data_umum` (population, KK, RT/RW, Kader) and `data_rekap_dawis` (number of latrines, healthy houses, waste systems), each month records the current census state, NOT an incremental flow. Summing 12 months multiplied these census figures by up to 12.
   - Conversely, event tables like `data_bumil` represent transactional flow (births, deaths per month). Annual totals for events mathematically require summing all 12 monthly occurrences.

2. **Resolution Mechanics in Excel**:
   - `fetchDusunData` was updated with `SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis'])`.
   - In `fetchDusunData`, sorting rows by `Number(row.bulan) || 0` guarantees ascending order. Iterating through rows assigns `map[dusunName] = row;`, resulting in the latest month replacing earlier months.
   - For `data_bumil`, `isSnapshot` is false, so it takes the aggregation branch and sums monthly values.

3. **Resolution Mechanics in Word**:
   - `buildTableSection` sorts rows descending (`b.bulan - a.bulan`) and assigns `targetRow = rows.slice().sort(...)[0]` when `isSnapshot` and `bulan == null`.
   - When `targetRow` exists, `aggregated[k] = Number(targetRow[k]) || 0`, resolving to the latest month without summing.
   - Fallback RT/RW in `data_bumil` similarly selects `latestDawisRow` instead of summing 12 months of RT/RW.

4. **Empirical Adversarial Testing**:
   - Written test harness `__tests__/server/annual-export-inflation.test.js` subjected the implementation to:
     - Multi-month census records for `data_umum` (e.g. Month 1: 100 KK, Month 4: 105 KK, Month 8: 110 KK). Word and Excel exports verified to output 110 KK and not 315 KK.
     - Out-of-order month return (Month 11, Month 3, Month 7) for `data_rekap_dawis`. Word export verified to select Month 11 (42 balita) and not 120 balita.
     - Multi-month event records for `data_bumil` (e.g. Month 1: 1 male birth, Month 3: 2 male births, Month 9: 1 male birth). Word and Excel exports verified to output cumulative sum (4 male births).
     - RT/RW fallback in `data_bumil` verified to extract 5 RT from Month 6 dawis, not 9 RT (4+5).
     - Word export `?bulan=5` query verified to include ` · BULAN : 05` and filename `Data_Kegiatan_PKK_2026_Bulan_05.docx`.

5. **Stability & Regressions**:
   - All 33 test suites (309 tests) pass with 0 failures.
   - Next.js 16 Turbopack production build compiles with 0 errors.

---

## 3. Caveats

- **Missing Months in Sparse Data**: If a dusun has not submitted data for the target year at all, `targetRow` is `null`, and the exported value gracefully defaults to `0` (or `''` for text). This is expected and desirable behavior.
- **Dusun Active State**: Both Word and Excel routes filter by `is_active = 1` on the `dusun` table, ensuring decommissioned dusuns do not appear as empty rows in export spreadsheets.
- **Database Safety**: Testing utilized in-memory mocks and local test fixtures; no production Supabase databases were written to or mutated.

---

## 4. Conclusion

- **VERDICT: APPROVE**.
- The 12x annual stock metric inflation has been verified as completely resolved in both `app/api/export/excel/route.js` and `app/api/export/word/route.js`.
- Cumulative calculation for event tables (`data_bumil`) has been verified as preserved.
- Query parameter `?bulan=MM` is fully supported in `app/api/export/word/route.js` and integrated with `app/dashboard/page.js`.
- The codebase passes 100% of automated tests (33 suites, 309 tests) and builds cleanly in Next.js 16.2.5 Turbopack.
- Zero production mutation occurred.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Run the dedicated export inflation test suite**:
   ```powershell
   npx jest __tests__/server/annual-export-inflation.test.js
   ```
   *Expected Result*: 8 passed, 0 failed.

2. **Run the full test suite**:
   ```powershell
   npm test
   ```
   *Expected Result*: 33 suites passed, 309 tests passed, 0 failed.

3. **Run the Next.js production build**:
   ```powershell
   npm run build
   ```
   *Expected Result*: `✓ Compiled successfully`, 62 routes generated, 0 build errors.

4. **Inspect Git Status**:
   ```powershell
   git status
   ```
   *Expected Result*: Clean working tree with no uncommitted credentials or database migrations.
