/**
 * @file Parse Excel file into structured data
 * Pure function — no side effects, no database calls
 * Input: file buffer + desa list → Output: structured sheet data
 */

import ExcelJS from 'exceljs';
import { SHEET_MAP } from './sheetMap';
import { matchDesa } from './matchDesa';

const MAX_ROWS_PER_SHEET = 500;

/**
 * Parse an Excel file buffer into structured data grouped by sheet.
 * Does NOT write to database — pure data transformation.
 *
 * @param {Buffer} buffer — The Excel file content
 * @param {Array<{id: number, nama: string, nomor_urut: number}>} desaList — Known desa from DB
 * @returns {Promise<{ sheets: SheetResult[], errors: string[] }>}
 *
 * @typedef {Object} SheetResult
 * @property {string} sheetName — Original sheet name (e.g. "DATA UMUM")
 * @property {string} table — Target DB table (e.g. "data_umum")
 * @property {Array<{ desaName: string, desaId: number, fields: Object }>} rows — Matched rows
 * @property {string[]} unmatched — Desa names that couldn't be matched
 */
export async function parseExcel(buffer, desaList) {
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

    // Find the header row (row containing "No" in column 1)
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
      const desaNama = String(row.getCell(2).value || '').trim();

      // Skip empty rows and summary rows
      if (!desaNama || desaNama.toUpperCase() === 'JUMLAH') continue;

      // Match desa name
      const match = matchDesa(desaNama, desaList);

      if (!match.matched) {
        unmatched.push(desaNama);
        continue;
      }

      // Extract field values based on SHEET_MAP column keys
      const fields = {};
      config.keys.forEach((key, ki) => {
        const val = row.getCell(ki + 3).value; // Column 3 onwards (1=No, 2=Desa)
        fields[key] = typeof val === 'number' ? val : (parseInt(val) || 0);
      });

      rows.push({
        desaName: match.desa.nama,  // Canonical name from DB (used for re-resolve on server)
        desaId: match.desa.id,      // For preview only, re-resolved on confirm
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
