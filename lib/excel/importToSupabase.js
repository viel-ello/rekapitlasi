/**
 * @file Import parsed Excel data to Supabase
 * Service function — HAS side effects (database writes)
 * Re-resolves desaId on server side to prevent client tampering
 */

import { supabase } from '@/lib/supabase';

/**
 * Batch upsert parsed sheet data into Supabase.
 * Re-resolves desaId from desaName to prevent client-side tampering.
 *
 * @param {Array<SheetResult>} parsedSheets — Output from parseExcel().sheets
 * @param {number} tahun — Target year (already validated by caller)
 * @param {string[]} allowedTables — Tables the user's role can write to
 * @param {Array<{id: number, nama: string}>} desaList — Desa list from DB (for re-resolution)
 * @returns {Promise<Array<SheetImportResult>>}
 *
 * @typedef {Object} SheetImportResult
 * @property {string} sheet — Sheet name
 * @property {string} table — DB table name
 * @property {number} success — Number of rows successfully upserted
 * @property {number} failed — Number of rows that failed
 * @property {boolean} [skipped] — True if sheet was skipped due to access denial
 * @property {string} [reason] — Reason for skip
 * @property {string} [error] — Error message if batch failed
 * @property {string[]} unmatched — Desa names that couldn't be matched
 */
export async function importToSupabase(parsedSheets, tahun, allowedTables, desaList) {
  const results = [];

  for (const sheet of parsedSheets) {
    // 1. Check role-based access
    if (!allowedTables.includes(sheet.table)) {
      results.push({
        sheet: sheet.sheetName,
        table: sheet.table,
        success: 0,
        failed: 0,
        skipped: true,
        reason: `Akses ditolak: role Anda tidak diizinkan menulis ke ${sheet.sheetName}`,
        unmatched: sheet.unmatched || [],
      });
      continue;
    }

    // 2. Re-resolve desaId from desaName (don't trust client-sent IDs)
    const records = [];
    const resolveErrors = [];

    for (const row of sheet.rows) {
      const desa = desaList.find(d => d.nama.toLowerCase() === row.desaName.toLowerCase());
      if (!desa) {
        resolveErrors.push(row.desaName);
        continue;
      }

      const record = {
        desa_id: desa.id,  // Server-resolved, not from client
        tahun,
        ...row.fields,
        updated_at: new Date().toISOString(),
      };

      // data_bumil uses monthly breakdown; bulk import → aggregate to December
      // This is intentional: the Excel export produces annual summaries,
      // and data_bumil has a UNIQUE(desa_id, tahun, bulan) constraint.
      // December is used as the annual aggregate slot.
      if (sheet.table === 'data_bumil') {
        record.bulan = 12;
      }

      records.push(record);
    }

    if (records.length === 0) {
      results.push({
        sheet: sheet.sheetName,
        table: sheet.table,
        success: 0,
        failed: resolveErrors.length,
        error: resolveErrors.length > 0
          ? `Nama desa tidak bisa di-resolve: ${resolveErrors.join(', ')}`
          : 'Tidak ada data untuk diimport',
        unmatched: [...(sheet.unmatched || []), ...resolveErrors],
      });
      continue;
    }

    // 3. Batch upsert (single round-trip per sheet)
    const onConflict = sheet.table === 'data_bumil' ? 'desa_id,tahun,bulan' : 'desa_id,tahun';
    const { error } = await supabase
      .from(sheet.table)
      .upsert(records, { onConflict });

    results.push({
      sheet: sheet.sheetName,
      table: sheet.table,
      success: error ? 0 : records.length,
      failed: error ? records.length : 0,
      error: error?.message || null,
      unmatched: [...(sheet.unmatched || []), ...resolveErrors],
    });
  }

  return results;
}
