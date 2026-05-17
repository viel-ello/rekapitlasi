/**
 * @file Parse Excel file into structured data
 * Pure function — no side effects, no database calls.
 * Output rows pakai `dusunName` sebagai canonical, `desaName` sebagai alias backward-compat.
 */

import ExcelJS from 'exceljs';
import { SHEET_MAP } from './sheetMap';
import { matchDusun } from './matchDesa';

const MAX_ROWS_PER_SHEET = 500;

/**
 * Parse Excel file buffer ke struktur data per sheet.
 *
 * @param {Buffer} buffer
 * @param {Array<{id: number, nama: string, nomor_urut: number}>} unitList — Daftar dusun dari DB.
 * @returns {Promise<{ sheets: SheetResult[], errors: string[] }>}
 */
export async function parseExcel(buffer, unitList) {
  const wb = new ExcelJS.Workbook();

  try {
    await wb.xlsx.load(buffer);
  } catch (e) {
    throw new Error(
      'File bukan format Excel yang valid (.xlsx). ' +
      'Pastikan file tidak rusak dan merupakan format Excel standar.'
    );
  }

  const sheets = [];
  const errors = [];

  for (const [sheetName, config] of Object.entries(SHEET_MAP)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;

    // Find header row (kolom 1 berisi "No")
    let dataStartRow = 0;
    ws.eachRow((row, rowNum) => {
      const first = String(row.getCell(1).value || '').trim();
      if (first === 'No') dataStartRow = rowNum + 1;
    });

    if (!dataStartRow) {
      errors.push(`Sheet "${sheetName}": Header "No" tidak ditemukan, sheet dilewati`);
      continue;
    }

    const rows = [];
    const unmatched = [];
    let rowCount = 0;

    for (let ri = dataStartRow; ri <= ws.rowCount; ri++) {
      if (rowCount >= MAX_ROWS_PER_SHEET) {
        errors.push(`Sheet "${sheetName}": Melebihi batas ${MAX_ROWS_PER_SHEET} baris, sisa baris dilewati`);
        break;
      }

      const row = ws.getRow(ri);
      const dusunNama = String(row.getCell(2).value || '').trim();

      // Skip empty rows dan summary rows
      if (!dusunNama || dusunNama.toUpperCase() === 'JUMLAH') continue;

      // Match nama dusun
      const match = matchDusun(dusunNama, unitList);

      if (!match.matched) {
        unmatched.push(dusunNama);
        continue;
      }

      // Extract field values berdasarkan SHEET_MAP keys
      const fields = {};
      config.keys.forEach((key, ki) => {
        const val = row.getCell(ki + 3).value; // Col 3+ (1=No, 2=Nama)
        // `keterangan` adalah text, sisanya integer
        if (key === 'keterangan') {
          fields[key] = val == null ? '' : String(val).trim();
        } else {
          fields[key] = typeof val === 'number' ? val : (parseInt(val, 10) || 0);
        }
      });

      const canonicalName = match.dusun?.nama || match.desa?.nama || dusunNama;
      const canonicalId = match.dusun?.id ?? match.desa?.id;

      rows.push({
        dusunName: canonicalName,
        dusunId: canonicalId,
        // Backward-compat alias
        desaName: canonicalName,
        desaId: canonicalId,
        confidence: match.confidence,
        fields,
      });

      rowCount++;
    }

    sheets.push({
      sheetName,
      table: config.table,
      rows,
      unmatched,
    });
  }

  return { sheets, errors };
}
