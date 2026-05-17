/**
 * @file Import parsed Excel data to Supabase.
 *
 * Server-side resolves dusunId dari nama (anti client tampering).
 * Backward-compat: terima `row.desaName` sebagai alias untuk `row.dusunName`.
 * Tabel `data_kegiatan_warga` di-normalize ke `data_rekap_dawis`.
 */

import { supabase } from '@/lib/supabase';
import { normalizeTableName } from '@/lib/auth';

/**
 * Batch upsert parsed sheet data into Supabase.
 *
 * @param {Array<SheetResult>} parsedSheets — Output from parseExcel().sheets
 * @param {number} tahun — Target year (already validated by caller)
 * @param {string[]} allowedTables — Tables the user's role can write to
 * @param {Array<{id: number, nama: string}>} dusunList — Dusun list from DB (re-resolution)
 * @returns {Promise<Array<SheetImportResult>>}
 */
export async function importToSupabase(parsedSheets, tahun, allowedTables, dusunList) {
  const results = [];

  for (const sheet of parsedSheets) {
    const canonicalTable = normalizeTableName(sheet.table);

    // 1. Role-based access
    const allowedSet = new Set(allowedTables);
    if (!allowedSet.has(canonicalTable) && !allowedSet.has(sheet.table)) {
      results.push({
        sheet: sheet.sheetName,
        table: canonicalTable,
        success: 0,
        failed: 0,
        skipped: true,
        reason: `Akses ditolak: role Anda tidak diizinkan menulis ke ${sheet.sheetName}`,
        unmatched: sheet.unmatched || [],
      });
      continue;
    }

    // 2. Resolve dusunId dari nama (server-side, anti tamper)
    const records = [];
    const resolveErrors = [];

    for (const row of sheet.rows) {
      const unitName = row.dusunName ?? row.desaName;
      if (typeof unitName !== 'string') {
        resolveErrors.push('(nama dusun kosong)');
        continue;
      }
      const dusun = dusunList.find(
        (d) => d.nama.toLowerCase() === unitName.toLowerCase()
      );
      if (!dusun) {
        resolveErrors.push(unitName);
        continue;
      }

      const record = {
        dusun_id: dusun.id,
        tahun,
        ...row.fields,
        updated_at: new Date().toISOString(),
      };

      // data_bumil pakai breakdown bulanan; bulk import → aggregate ke Desember.
      if (canonicalTable === 'data_bumil') {
        record.bulan = 12;
      }

      records.push(record);
    }

    if (records.length === 0) {
      results.push({
        sheet: sheet.sheetName,
        table: canonicalTable,
        success: 0,
        failed: resolveErrors.length,
        error: resolveErrors.length > 0
          ? `Nama dusun tidak bisa di-resolve: ${resolveErrors.join(', ')}`
          : 'Tidak ada data untuk diimport',
        unmatched: [...(sheet.unmatched || []), ...resolveErrors],
      });
      continue;
    }

    // 3. Batch upsert
    const onConflict = canonicalTable === 'data_bumil' ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun';
    const { error } = await supabase
      .from(canonicalTable)
      .upsert(records, { onConflict });

    results.push({
      sheet: sheet.sheetName,
      table: canonicalTable,
      success: error ? 0 : records.length,
      failed: error ? records.length : 0,
      error: error?.message || null,
      unmatched: [...(sheet.unmatched || []), ...resolveErrors],
    });
  }

  return results;
}
