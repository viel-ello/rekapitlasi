/**
 * @file Import parsed Excel data to Supabase.
 *
 * Server-side resolves dusunId dari nama (anti client tampering).
 * Backward-compat: terima `row.desaName` sebagai alias untuk `row.dusunName`.
 * Tabel `data_kegiatan_warga` di-normalize ke `data_rekap_dawis`.
 */

import { supabase } from '@/lib/supabase';
import { normalizeTableName, ROLE_SCOPE } from '@/lib/auth';

/**
 * Batch upsert parsed sheet data into Supabase.
 *
 * @param {Array<SheetResult>} parsedSheets — Output from parseExcel().sheets
 * @param {number} tahun — Target year (already validated by caller)
 * @param {string[]} allowedTables — Tables the user's role can write to
 * @param {Array<{id: number, nama: string}>} dusunList — Dusun list from DB (re-resolution)
 * @param {{ role?: string, dusun_id?: number|null }} [user] — User untuk row-level enforcement (kader-dusun)
 * @returns {Promise<Array<SheetImportResult>>}
 */
export async function importToSupabase(parsedSheets, tahun, allowedTables, dusunList, user = null) {
  const results = [];

  // Row-level scope: role kader-dusun hanya boleh import baris dusun miliknya.
  const isOwnDusunScope = user && ROLE_SCOPE[user.role] === 'own_dusun';
  const ownDusunId = isOwnDusunScope ? Number(user.dusun_id) : null;

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
    let rowLevelSkipped = 0;

    // Guard: kader-dusun tanpa assignment dusun tidak boleh import sama sekali.
    if (isOwnDusunScope && (ownDusunId == null || Number.isNaN(ownDusunId))) {
      results.push({
        sheet: sheet.sheetName,
        table: canonicalTable,
        success: 0,
        failed: 0,
        skipped: true,
        reason: 'Akun kader-dusun belum di-assign dusun. Hubungi admin.',
        unmatched: sheet.unmatched || [],
      });
      continue;
    }

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

      // Row-level enforcement: kader-dusun hanya boleh baris dusun miliknya.
      if (isOwnDusunScope && Number(dusun.id) !== ownDusunId) {
        rowLevelSkipped++;
        continue;
      }

      const record = {
        dusun_id: dusun.id,
        tahun,
        ...row.fields,
        updated_at: new Date().toISOString(),
      };

      // Tabel per-bulan: bulk import → default ke Desember kalau row tidak
      // membawa info bulan eksplisit.
      if (canonicalTable === 'data_bumil' || canonicalTable === 'data_rekap_dawis' || canonicalTable === 'data_umum') {
        record.bulan = row.bulan ?? 12;
      }

      records.push(record);
    }

    if (records.length === 0) {
      const reasons = [];
      if (resolveErrors.length > 0) {
        reasons.push(`Nama dusun tidak bisa di-resolve: ${resolveErrors.join(', ')}`);
      }
      if (rowLevelSkipped > 0) {
        reasons.push(`${rowLevelSkipped} baris dusun lain dilewati (akses kader-dusun dibatasi ke dusun Anda)`);
      }
      results.push({
        sheet: sheet.sheetName,
        table: canonicalTable,
        success: 0,
        failed: resolveErrors.length,
        skipped: rowLevelSkipped > 0 && resolveErrors.length === 0,
        error: reasons.length > 0 ? reasons.join('. ') : 'Tidak ada data untuk diimport',
        unmatched: [...(sheet.unmatched || []), ...resolveErrors],
      });
      continue;
    }

    // 3. Batch upsert
    const TABLES_WITH_MONTH = new Set(['data_bumil', 'data_rekap_dawis', 'data_umum']);
    const onConflict = TABLES_WITH_MONTH.has(canonicalTable) ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun';
    const { error } = await supabase
      .from(canonicalTable)
      .upsert(records, { onConflict });

    results.push({
      sheet: sheet.sheetName,
      table: canonicalTable,
      success: error ? 0 : records.length,
      failed: error ? records.length : 0,
      rowLevelSkipped: rowLevelSkipped || undefined,
      error: error?.message || null,
      unmatched: [...(sheet.unmatched || []), ...resolveErrors],
    });
  }

  return results;
}
