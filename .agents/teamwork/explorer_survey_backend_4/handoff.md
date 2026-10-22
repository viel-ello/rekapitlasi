# Handoff Report — Backend & DevOps Exploration Survey

- **Agent**: `explorer_survey_backend_4` (Backend & DevOps Specialist Explorer)
- **Parent Conversation ID**: `ffab784d-de42-4b37-aceb-f1c33fa6d63b`
- **Scope**: Technical audit and resolution survey for report generation, export aggregations, AI mutations, rekap query overfetching, and E2E production guards.
- **Baseline Test Suite Status**: **31 passed, 31 total (268 passed, 0 failed, 100% pass rate in ~6.5s)**.

---

## 1. Observation

### Observation 1.1: NaN Corruption & Formula Injection in `app/api/reports/build/route.js`
- **File**: `app/api/reports/build/route.js`
  - **Lines 185–191 (`buildExcel`)**:
    ```javascript
    sheet.rows.forEach((r, i) => {
      const rowVals = [
        i + 1,
        r._dusun_nama || r._desa_nama,
        r.tahun,
        ...sheet.columns.map((c) => Number(r[c.key] || 0)),
      ];
      const rr = ws.addRow(rowVals);
    ```
  - **Lines 235–242 (`buildWord`)**:
    ```javascript
    const dataRows = sheet.rows.map((r, i) => new TableRow({
      children: [
        i + 1, r._dusun_nama || r._desa_nama, r.tahun, ...sheet.columns.map((c) => Number(r[c.key] || 0)),
      ].map((v) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })], alignment: AlignmentType.CENTER })],
        borders: cellBorder,
      })),
    }));
    ```
  - **Lines 327–330 (`buildPdf`)**:
    ```javascript
    const cells = [
      String(i + 1), r._dusun_nama || r._desa_nama || '-', String(r.tahun),
      ...sheet.columns.map((c) => Number(r[c.key] || 0).toLocaleString('id-ID')),
    ];
    ```
  - In all three formats, `sheet.columns.map((c) => Number(r[c.key] || 0))` casts blindly.
  - When a column has `c.type === 'text'` (e.g. `keterangan` defined in `lib/dataPages.js:44, 99` as `{ key: 'keterangan', label: 'Keterangan', type: 'text' }`) or holds textual remarks (such as `"Kegiatan lancar"`), `Number("Kegiatan lancar")` yields `NaN`.
  - In Word, `String(NaN)` prints `"NaN"` inside document cells.
  - In PDF, `Number("...").toLocaleString('id-ID')` outputs `"NaN"`.
  - In Excel, `NaN` is written as raw numeric NaN, breaking `numFmt = '#,##0'` formatting (lines 196–199) or showing `#NUM!`.
  - When `r[c.key]` is empty string `""`, `Number("" || 0)` converts empty text cells into literal `0`.
  - Furthermore, `buildExcel` lacks formula injection protection: strings starting with `=`, `+`, `-`, or `@` are not sanitized with prefix escaping.
  - In contrast, `app/api/export/excel/route.js:52–59` implements `sanitizeCellText(val)`:
    ```javascript
    function sanitizeCellText(val) {
      if (val == null) return '';
      if (typeof val === 'number') return val;
      const str = String(val);
      if (!isNaN(Number(str)) && str.trim() !== '') return str;
      if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
      return str;
    }
    ```

---

### Observation 1.2: 12x Snapshot Metric Inflation in Annual Exports & Missing Month Forwarding
- **Files**:
  - `app/api/export/excel/route.js:61–98`
  - `app/api/export/word/route.js:427–489` & `537–586`
  - `app/dashboard/page.js:198–219`
- **Observed Code in `app/api/export/excel/route.js:61–98`**:
  ```javascript
  async function fetchDusunData(table, tahun, bulan = null, dusunByName) {
    const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);
    const isMonthly = TABLES_WITH_MONTH.has(table);
    ...
    if (isMonthly && bulan == null) {
      // Aggregate semua bulan
      const existing = map[dusunName];
      for (const [k, v] of Object.entries(row)) {
        if (METADATA_KEYS.has(k)) { ... }
        const trimmed = typeof v === 'string' ? v.trim() : v;
        const num = Number(trimmed);
        if (trimmed !== '' && trimmed !== null && !isNaN(num) && Number.isFinite(num)) {
          existing[k] = (Number(existing[k]) || 0) + num;
        } else if (existing[k] == null) {
          existing[k] = v;
        }
      }
    }
  ```
  `data_umum` and `data_rekap_dawis` are snapshot/stock tables representing the total population, total households (KK), RT, RW, Dasawisma, and infrastructure counts at a point in time. When `bulan == null` (annual export), summing all 12 months multiplies KK, Jiwa, RT/RW, and Dasawisma counts by up to 12x (e.g. 300 KK becomes 3,600 KK).
- **Observed Code in `app/api/export/word/route.js:427–489`**:
  ```javascript
  async function buildTableSection(secDef, tahun, dusunList = []) {
    const { data: tableData } = await supabase.from(secDef.table).select('*').eq('tahun', tahun);
    const allData = tableData || [];
    ...
    dusunList.forEach((d, idx) => {
      const rows = allData.filter((r) => (r.dusun_id ?? r.desa_id) === d.id);
      ...
      secDef.flatKeys.forEach((k) => {
        let sum = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
        aggregated[k] = sum;
      });
  ```
  `buildTableSection` does not accept or filter by `bulan`. In annual exports, `rows` contains up to 12 monthly rows per dusun for `DATA_UMUM_DEF` (`data_umum`) and `REKAP_DAWIS_DEF` (`data_rekap_dawis`). `reduce(...)` sums all 12 rows, inflating snapshot metrics 12-fold.
  Line 492 also joins 12 monthly `keterangan` strings (`rows.map((r) => r.keterangan).filter(Boolean).join('; ')`).
- **Word API Query Handling**:
  `app/api/export/word/route.js:542–544` only reads `searchParams.get('tahun')`. `searchParams.get('bulan')` is completely ignored.
- **Dashboard UI Trigger**:
  In `app/dashboard/page.js:198–219`:
  ```javascript
  const _performDownload = async (type) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/export/${type}?tahun=${tahun}`);
  ```
  Even though `DashboardPage` maintains `const [bulan, setBulan] = useState(12)` (line 143) and `DashboardToolbar` renders month selection (lines 43, 351), `_performDownload` only requests `?tahun=${tahun}`. It never passes `&bulan=${bulan}`!

---

### Observation 1.3: 404 Failures on AI Mutation for New Periods in `app/api/chat/confirm-mutation/route.js`
- **File**: `app/api/chat/confirm-mutation/route.js:62–78`
  ```javascript
  let updateQuery = supabase
    .from(v.tableName)
    .update(v.sanitizedUpdates)
    .eq('dusun_id', v.dusunId)
    .eq('tahun', currentYear);
  if (v.isMonthly) updateQuery = updateQuery.eq('bulan', v.bulan);
  const { data: updatedRows, error } = await updateQuery.select('id');

  if (error) {
    return NextResponse.json({ error: `Gagal menyimpan ke database: ${error.message}` }, { status: 500 });
  }
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: `Data dusun ${v.dusunId} tahun ${currentYear}${v.isMonthly ? ` bulan ${v.bulan}` : ''} belum ada. Isi lewat halaman data atau import dulu.` },
      { status: 404 }
    );
  }
  ```
- If an AI user asks Gemini to update/enter data for a new month or new year that has no existing record, the preview dry-run in `/api/chat` succeeds, but when clicking "Terapkan", `/api/chat/confirm-mutation` executes `.update(...)`.
- Because no row exists yet, `updatedRows.length === 0`, and the API returns a 404 error instead of inserting the row.
- In `supabase_schema.sql` and migrations (v7, v10, v12, v14):
  - Monthly tables (`data_umum`, `data_rekap_dawis`, `data_bumil`) have unique constraint: `UNIQUE (dusun_id, tahun, bulan)`.
  - Yearly tables (`data_pokja1`, `data_pokja2`, `data_pokja3`, `data_pokja4`) have unique constraint: `UNIQUE (dusun_id, tahun)`.

---

### Observation 1.4: 7 Redundant Supabase Overfetches in `app/api/rekap/route.js`
- **File**: `app/api/rekap/route.js`
  - **Lines 69–165**:
    - Lines 69–75: fetches `umumList` for `tahun` (and `bulan`) from `data_umum`.
    - Line 106: fetches `p1List` for `tahun` from `data_pokja1`.
    - Line 113: fetches `p2List` for `tahun` from `data_pokja2`.
    - Line 125: fetches `p3List` for `tahun` from `data_pokja3`.
    - Line 133: fetches `p4List` for `tahun` from `data_pokja4`.
    - Lines 141–147: fetches `bumilList` for `tahun` from `data_bumil` (with partial columns `tahun, dusun_id, ibu_hamil, ibu_melahirkan, ibu_nifas, bayi_lahir_l, bayi_lahir_p`).
    - Lines 159–165: fetches `dawisList` for `tahun` from `data_rekap_dawis`.
  - **Lines 264–295 (`tableChecks`)**:
    ```javascript
    const tableChecks = await Promise.all(
      selectedTables.map(async (tableName) => {
        const allKeys = getTableKeys(tableName);
        const hidden = hiddenKeysPerTable[tableName] || new Set();
        const keys = allKeys.filter((k) => !hidden.has(k));

        const fetchRows = (year) => {
          const buildQuery = () => supabase.from(tableName).select('*').eq('tahun', year);
          return MONTHLY_TABLES.has(tableName)
            ? queryWithOptionalMonth(buildQuery, bulan)
            : buildQuery();
        };

        const [{ data: currentRows }, { data: previousRows }] = await Promise.all([
          fetchRows(tahun),
          fetchRows(Number(tahun) - 1),
        ]);
    ```
  - For all 7 operational tables, `fetchRows(tahun)` queries Supabase a second time for the exact same year and month that was already fetched in lines 69–165. This generates 7 extra HTTP round trips on every dashboard page load.

---

### Observation 1.5: Production URL Safety Guard in `e2e/auth.setup.mjs`
- **Files**:
  - `playwright.config.mjs:9–11`:
    ```javascript
    export function isProductionUrl(url) {
      return /lumbungdatapkk\.vercel\.app|supabase\.co/i.test(url || '');
    }
    ```
  - `e2e/auth.setup.mjs:17–57`:
    ```javascript
    setup('authenticate + discover', async ({ page, baseURL }) => {
      const user = process.env.E2E_USER || 'admin';
      const pass = process.env.E2E_PASS || 'admin123';
      ...
      await page.goto('/login');
    ```
  - Currently, `e2e/auth.setup.mjs` receives `baseURL` from Playwright but never invokes `isProductionUrl(baseURL)`.
  - If a developer or CI environment inadvertently sets `E2E_BASE_URL=https://lumbungdatapkk.vercel.app`, the E2E suite will attempt authentication and navigation against production without explicit opt-in.

---

## 2. Logic Chain

```
[Observation 1.1]
Blind cast Number(r[c.key] || 0) in buildExcel, buildWord, buildPdf
    │
    ▼
If c.type === 'text' (e.g. keterangan) or string value
Number("text") -> NaN
    │
    ├─> Excel: NaN written to cell, corrupts numFmt '#,##0'
    ├─> Word: String(NaN) -> renders "NaN"
    └─> PDF: Number("text").toLocaleString('id-ID') -> renders "NaN"
    │
    ▼
Resolution 1:
Check c.type === 'text' || (raw != null && raw !== '' && Number.isNaN(Number(raw)))
If text: sanitizeCellText(raw ?? '') for Excel; String(raw ?? '') for Word/PDF.
If numeric: Number(raw || 0).
Extract shared sanitizeCellText to lib/export/sanitize.js.

──────────────────────────────────────────────────────────────────────────

[Observation 1.2]
fetchDusunData & buildTableSection unconditionally sum all rows when bulan == null
    │
    ▼
data_umum & data_rekap_dawis are snapshot/stock tables, not cumulative events
    │
    ▼
Summing 12 monthly rows inflates KK, Jiwa, Balita, RT/RW, Dawis by 12x
Dashboard _performDownload also omits bulan parameter in fetch URL
    │
    ▼
Resolution 2:
1. Define SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis']).
2. In annual export (bulan == null), select latest available month record per dusun for snapshot tables.
3. In Word export, parse ?bulan=MM and query specific month if provided.
4. In DashboardPage, append &bulan=${bulan} when downloading Excel/Word.

──────────────────────────────────────────────────────────────────────────

[Observation 1.3]
confirm-mutation executes .update(v.sanitizedUpdates).eq('dusun_id', v.dusunId).eq('tahun', currentYear)
    │
    ▼
If record does not exist for that period, updatedRows.length === 0 -> returns 404
    │
    ▼
PostgreSQL constraints: UNIQUE(dusun_id, tahun, bulan) for monthly, UNIQUE(dusun_id, tahun) for yearly
    │
    ▼
Resolution 3:
Replace .update() with .upsert(payload, { onConflict: v.isMonthly ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun' })
Allows instant creation & editing of new period rows via AI.

──────────────────────────────────────────────────────────────────────────

[Observation 1.4]
rekap/route.js fetches umumList, p1List..p4List, bumilList, dawisList in lines 69-165
    │
    ▼
tableChecks loops selectedTables and runs fetchRows(tahun) again (lines 277-280)
    │
    ▼
7 redundant Supabase queries per dashboard load
    │
    ▼
Resolution 4:
1. Upgrade bumilList query to .select('*').
2. Map prefetchedCurrent = { data_umum, data_pokja1..4, data_rekap_dawis, data_bumil }.
3. Use prefetchedCurrent[tableName] as currentRows in tableChecks; only fetch previousRows (year - 1).
Saves 7 network round trips per request.

──────────────────────────────────────────────────────────────────────────

[Observation 1.5]
isProductionUrl exported in playwright.config.mjs but not called in e2e/auth.setup.mjs
    │
    ▼
Risk of running E2E suite against production domain without opt-in
    │
    ▼
Resolution 5:
Import isProductionUrl in e2e/auth.setup.mjs.
Guard: if (isProductionUrl(baseURL) && process.env.E2E_ALLOW_PROD_READ !== '1') throw Error(...).
```

---

## 3. Caveats

1. **Cumulative Event Tables vs. Snapshot Tables**:
   - `data_bumil` tracks events happening in that month (e.g. `ibu_melahirkan`, `bayi_lahir_l`, `bayi_lahir_p`, `bayi_mati_l`, `bayi_mati_p`). For annual export (`bulan == null`), summing these events across months is valid and intentional to show annual totals.
   - However, `data_umum` and `data_rekap_dawis` contain snapshot counts (KK, Jiwa, RT/RW, Dasawisma, Balita, Rumah Sehat). They must NOT be summed across months; the latest available month per dusun must be used.
2. **Missing Month Data Handling in Snapshots**:
   - If a dusun has data only in March and June, the latest month is June. Sorting rows by `bulan` descending ensures we always take the most recent state. If a dusun has 0 rows for the entire year, it returns empty defaults.
3. **Database Constraints for Upsert**:
   - Supabase PostgREST requires an explicit composite unique constraint or index matching the `onConflict` columns. In this schema:
     - Monthly: `data_umum_dusun_tahun_bulan_uniq`, `data_rekap_dawis_dusun_tahun_bulan_uniq`, `data_bumil` unique `(dusun_id, tahun, bulan)`.
     - Yearly: `data_pokja1..4` unique `(dusun_id, tahun)`.
   - Matching `onConflict: v.isMonthly ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun'` precisely satisfies PostgreSQL's `ON CONFLICT` requirement.
4. **Read-Only Scope Compliance**:
   - As an explorer agent, no repository code was edited. Concrete code implementations are detailed in Section 4 for implementers.

---

## 4. Conclusion & Concrete Implementation Proposals

### Proposal 4.1: Fix NaN & Formula Injection in `app/api/reports/build/route.js`

1. **Create Shared Sanitizer (`lib/export/sanitize.js`)**:
   ```javascript
   /**
    * @file lib/export/sanitize.js
    * Sanitizes text to prevent CSV/Excel formula injection (=, +, -, @, \t, \r).
    */
   export function sanitizeCellText(val) {
     if (val == null) return '';
     if (typeof val === 'number') return val;
     const str = String(val);
     // Numeric strings are safe
     if (!Number.isNaN(Number(str)) && str.trim() !== '') return str;
     // Prefix dangerous formula triggers with a single quote
     if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
     return str;
   }
   ```

2. **In `app/api/reports/build/route.js`**:
   - Import `sanitizeCellText` from `@/lib/export/sanitize`.
   - Helper cell resolver:
     ```javascript
     function resolveCellValue(raw, col) {
       const isText = col.type === 'text' || (raw != null && raw !== '' && typeof raw !== 'number' && Number.isNaN(Number(raw)));
       if (isText) {
         return { isText: true, textVal: sanitizeCellText(raw ?? '') };
       }
       const numVal = raw == null || raw === '' ? 0 : Number(raw);
       return { isText: false, numVal: Number.isNaN(numVal) ? 0 : numVal };
     }
     ```
   - **`buildExcel` (lines 185–201)**:
     ```javascript
     sheet.rows.forEach((r, i) => {
       const rowVals = [
         i + 1,
         r._dusun_nama || r._desa_nama,
         r.tahun,
         ...sheet.columns.map((c) => {
           const res = resolveCellValue(r[c.key], c);
           return res.isText ? res.textVal : res.numVal;
         }),
       ];
       const rr = ws.addRow(rowVals);
       rr.eachCell((c, colNum) => {
         c.font = { size: 10 };
         c.border = BORDER;
         if (colNum > 3 && typeof c.value === 'number') {
           c.alignment = { horizontal: 'right' };
           c.numFmt = '#,##0';
         } else if (colNum > 3) {
           c.alignment = { horizontal: 'left' };
         }
       });
     });
     ```
   - **`buildWord` (lines 235–242)**:
     ```javascript
     const dataRows = sheet.rows.map((r, i) => new TableRow({
       children: [
         i + 1, r._dusun_nama || r._desa_nama, r.tahun,
         ...sheet.columns.map((c) => {
           const res = resolveCellValue(r[c.key], c);
           return res.isText ? res.textVal : String(res.numVal);
         }),
       ].map((v, colIdx) => new TableCell({
         children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })], alignment: colIdx > 2 && !sheet.columns[colIdx - 3]?.type ? AlignmentType.RIGHT : AlignmentType.CENTER })],
         borders: cellBorder,
       })),
     }));
     ```
   - **`buildPdf` (lines 327–335)**:
     ```javascript
     const cells = [
       String(i + 1), r._dusun_nama || r._desa_nama || '-', String(r.tahun),
       ...sheet.columns.map((c) => {
         const res = resolveCellValue(r[c.key], c);
         return res.isText ? res.textVal : res.numVal.toLocaleString('id-ID');
       }),
     ];
     ```

---

### Proposal 4.2: Fix Annual Stock Inflation & Month Forwarding

1. **In `app/api/export/excel/route.js` (`fetchDusunData`, lines 61–100)**:
   ```javascript
   const SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis']);

   async function fetchDusunData(table, tahun, bulan = null, dusunByName) {
     const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);
     const isMonthly = TABLES_WITH_MONTH.has(table);
     const isSnapshot = SNAPSHOT_TABLES.has(table);

     let q = supabase.from(table).select('*').eq('tahun', tahun);
     if (isMonthly && bulan != null) q = q.eq('bulan', bulan);
     const { data: rows } = await q;

     const map = {};
     for (const dusunNama of Object.keys(dusunByName)) {
       map[dusunNama] = {};
     }

     if (isMonthly && bulan == null && isSnapshot) {
       // SNAPSHOT TABLE ANNUAL EXPORT: Pick latest available month per dusun
       const sortedRows = (rows || []).slice().sort((a, b) => (Number(a.bulan) || 0) - (Number(b.bulan) || 0));
       for (const row of sortedRows) {
         const id = unitIdOf(row);
         const dusunName = Object.keys(dusunByName).find((nama) => dusunByName[nama].id === id);
         if (dusunName) {
           map[dusunName] = row; // Later month overwrites earlier month
         }
       }
       return map;
     }

     // Cumulative flow tables (data_bumil) or specified bulan
     for (const row of rows || []) {
       const id = unitIdOf(row);
       const dusunName = Object.keys(dusunByName).find((nama) => dusunByName[nama].id === id);
       if (!dusunName) continue;

       if (isMonthly && bulan == null) {
         // Cumulative sum for event tables
         const existing = map[dusunName];
         for (const [k, v] of Object.entries(row)) {
           if (METADATA_KEYS.has(k)) {
             if (existing[k] == null) existing[k] = v;
             continue;
           }
           const trimmed = typeof v === 'string' ? v.trim() : v;
           const num = Number(trimmed);
           if (trimmed !== '' && trimmed !== null && !isNaN(num) && Number.isFinite(num)) {
             existing[k] = (Number(existing[k]) || 0) + num;
           } else if (existing[k] == null) {
             existing[k] = v;
           }
         }
       } else {
         map[dusunName] = row;
       }
     }
     return map;
   }
   ```

2. **In `app/api/export/word/route.js`**:
   - Parse `bulan`:
     ```javascript
     const bulan = searchParams.get('bulan') ? Number(searchParams.get('bulan')) : null;
     ```
   - In `buildTableSection(secDef, tahun, dusunList, bulan)`:
     ```javascript
     const SNAPSHOT_TABLES = new Set(['data_umum', 'data_rekap_dawis']);
     const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);
     const isMonthly = TABLES_WITH_MONTH.has(secDef.table);

     let q = supabase.from(secDef.table).select('*').eq('tahun', tahun);
     if (isMonthly && bulan != null) q = q.eq('bulan', bulan);
     const { data: tableData } = await q;
     const allData = tableData || [];
     ```
   - Inside `dusunList.forEach((d, idx) => { ... })`:
     ```javascript
     const rows = allData.filter((r) => (r.dusun_id ?? r.desa_id) === d.id);
     let targetRow = null;
     if (isMonthly && bulan == null && SNAPSHOT_TABLES.has(secDef.table)) {
       // Pick latest available month row
       targetRow = rows.slice().sort((a, b) => (Number(b.bulan) || 0) - (Number(a.bulan) || 0))[0] || null;
     }

     const aggregated = {};
     secDef.flatKeys.forEach((k) => {
       if (targetRow) {
         aggregated[k] = Number(targetRow[k]) || 0;
       } else {
         let sum = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
         if (sum === 0 && secDef.table === 'data_bumil') {
           if (k === 'jml_rt') sum = dawisRows.reduce((s, r) => s + (Number(r.jml_rt) || 0), 0);
           if (k === 'jml_rw') sum = dawisRows.reduce((s, r) => s + (Number(r.jml_rw) || 0), 0);
           if (k === 'jml_dasa_wisma') sum = dawisRows.reduce((s, r) => s + (Number(r.jml_dawis) || 0), 0);
         }
         aggregated[k] = sum;
       }
     });

     if (hasKet) {
       const ketText = targetRow ? (targetRow.keterangan || '') : rows.map((r) => r.keterangan).filter(Boolean).join('; ');
       cells.push(dataCell(ketText));
     }
     ```
   - Update Word filename and title:
     ```javascript
     const stamp = `${tahun}${bulan != null ? `_Bulan_${String(bulan).padStart(2, '0')}` : ''}`;
     'Content-Disposition': `attachment; filename="Data_Kegiatan_PKK_${stamp}.docx"`,
     ```

3. **In `app/dashboard/page.js` (`_performDownload`)**:
   ```javascript
   const _performDownload = async (type) => {
     setDownloading(type);
     try {
       const params = new URLSearchParams({ tahun: String(tahun) });
       if (bulan) params.set('bulan', String(bulan));
       const res = await fetch(`/api/export/${type}?${params.toString()}`);
       if (!res.ok) throw new Error('Gagal mengunduh');
       const blob = await res.blob();
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       const monthSuffix = bulan ? `_Bulan_${String(bulan).padStart(2, '0')}` : '';
       a.download = type === 'excel'
         ? `Rekapitulasi_PKK_Belikurip_${tahun}${monthSuffix}.xlsx`
         : `Data_Kegiatan_PKK_${tahun}${monthSuffix}.docx`;
       document.body.appendChild(a);
       a.click();
       a.remove();
       window.URL.revokeObjectURL(url);
     } catch (err) { ... }
     setDownloading(null);
   };
   ```

---

### Proposal 4.3: Implement Upsert in `app/api/chat/confirm-mutation/route.js`

Replace lines 62–78 with:
```javascript
    const payload = {
      ...v.sanitizedUpdates,
      dusun_id: v.dusunId,
      tahun: currentYear,
    };
    if (v.isMonthly) {
      payload.bulan = v.bulan;
    }

    const onConflict = v.isMonthly ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun';

    const { data: upsertedRows, error } = await supabase
      .from(v.tableName)
      .upsert(payload, { onConflict })
      .select('id');

    if (error) {
      return NextResponse.json({ error: `Gagal menyimpan ke database: ${error.message}` }, { status: 500 });
    }
```
*Rationale*:
- Eliminates 404 error when setting up data for a new month/year via AI chat.
- Complies directly with the unique indexes and schema definition.

---

### Proposal 4.4: Eliminate 7 Redundant Supabase Overfetches in `app/api/rekap/route.js`

1. In lines 141–147, change `bumilList` select from partial columns to `select('*')`:
   ```javascript
   const { data: bumilList } = await queryWithOptionalMonth(
     () => supabase
       .from('data_bumil')
       .select('*')
       .eq('tahun', tahun),
     bulan
   );
   ```
2. Build `prefetchedCurrent` mapping:
   ```javascript
   const prefetchedCurrent = {
     data_umum: umumList || [],
     data_pokja1: p1List || [],
     data_pokja2: p2List || [],
     data_pokja3: p3List || [],
     data_pokja4: p4List || [],
     data_rekap_dawis: dawisList || [],
     data_bumil: bumilList || [],
   };
   ```
3. In `tableChecks` (lines 264–295), eliminate the second query for `currentRows`:
   ```javascript
   const tableChecks = await Promise.all(
     selectedTables.map(async (tableName) => {
       const allKeys = getTableKeys(tableName);
       const hidden = hiddenKeysPerTable[tableName] || new Set();
       const keys = allKeys.filter((k) => !hidden.has(k));

       const fetchPreviousYearRows = () => {
         const buildQuery = () => supabase.from(tableName).select('*').eq('tahun', Number(tahun) - 1);
         return MONTHLY_TABLES.has(tableName)
           ? queryWithOptionalMonth(buildQuery, bulan)
           : buildQuery();
       };

       const currentRows = prefetchedCurrent[tableName] || [];
       const { data: previousRows } = await fetchPreviousYearRows();

       const currentMap = {};
       const previousMap = {};

       currentRows.forEach((row) => {
         const id = unitIdOf(row);
         if (id != null) currentMap[id] = row;
       });
       (previousRows || []).forEach((row) => {
         const id = unitIdOf(row);
         if (id != null) previousMap[id] = row;
       });

       return { table: tableName, keys, currentMap, previousMap };
     })
   );
   ```
*Performance Impact*: Reduces Supabase queries per dashboard request by 7 queries (from ~16 queries to ~9 queries, a >40% decrease in network overhead).

---

### Proposal 4.5: Enforce Production Guard in `e2e/auth.setup.mjs`

In `e2e/auth.setup.mjs`:
```javascript
import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import { writeArtifact, ARTIFACT_DIR } from './lib/helpers.mjs';
import { isProductionUrl } from '../playwright.config.mjs';

export const STORAGE_STATE = `${ARTIFACT_DIR}/storage-state.json`;

setup('authenticate + discover', async ({ page, baseURL }) => {
  if (isProductionUrl(baseURL) && process.env.E2E_ALLOW_PROD_READ !== '1') {
    throw new Error(
      `[SECURITY GUARD] E2E execution aborted: baseURL "${baseURL}" is a production environment. Set E2E_ALLOW_PROD_READ=1 to permit read-only execution.`
    );
  }

  const user = process.env.E2E_USER || 'admin';
  const pass = process.env.E2E_PASS || 'admin123';
  ...
```

---

## 5. Verification Method

To independently verify these findings and the proposed fixes:

1. **Test Suite Baseline Check**:
   ```bash
   npm test
   ```
   *Expected Result*: All 31 test suites pass with 268 passing tests.

2. **File & Line Inspections**:
   - Verify `app/api/reports/build/route.js:190, 237, 329` for unhandled string-to-number casting.
   - Verify `app/api/export/excel/route.js:79–95` and `app/api/export/word/route.js:471` for unconditional `reduce` / aggregation across months for stock tables.
   - Verify `app/dashboard/page.js:201` for omitted `bulan` parameter.
   - Verify `app/api/chat/confirm-mutation/route.js:62–78` for `.update(...)` returning 404 when period rows don't exist.
   - Verify `app/api/rekap/route.js:277–280` for redundant `fetchRows(tahun)`.
   - Verify `playwright.config.mjs:9` exports `isProductionUrl`, but `e2e/auth.setup.mjs` has no reference to it.

3. **Invalidation Conditions**:
   - If PostgreSQL table schemas lack the unique constraints `(dusun_id, tahun, bulan)` or `(dusun_id, tahun)`, `upsert` would fail with an invalid conflict target error (verified above: migrations v10, v12, v14 confirm exact composite constraints exist).
   - If `data_bumil` completeness check required columns that aren't returned, changing line 144 to `.select('*')` ensures all columns are present without loss.
