import { supabase } from '@/lib/supabase';
import { ROLE_TABLE_MAP } from '@/lib/excel/sheetMap';
import { validateRow, countIssues } from '@/lib/validation';
import { getTableKeys, isKnownOperationalTable } from '@/lib/dataQuality';
import { normalizeTableName } from '@/lib/auth';

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function toIntegerValue(value) {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : NaN;
  const parsed = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : NaN;
}

function sanitizeIncomingFields(fields, validKeys) {
  const incoming = {};
  const invalid = [];

  for (const key of Object.keys(fields || {})) {
    if (!validKeys.includes(key)) continue;
    if (key === 'keterangan') {
      // text field — pass-through, no numeric coercion
      incoming[key] = String(fields[key] ?? '').slice(0, 1000);
      continue;
    }
    const numericValue = toIntegerValue(fields[key]);
    if (!Number.isFinite(numericValue)) {
      invalid.push(key);
      continue;
    }
    incoming[key] = numericValue;
  }

  return { incoming, invalid };
}

function hasChanged(current, incoming) {
  if (!current) return true;
  return Object.entries(incoming).some(([key, value]) => {
    if (key === 'keterangan') return String(current[key] || '') !== String(value || '');
    return Number(current[key] || 0) !== Number(value || 0);
  });
}

/**
 * Build diff preview untuk import Excel. Output structure tetap (dusunName/desaName
 * sebagai alias) supaya UI lama tidak break.
 *
 * @param {Array} parsedData - sheets hasil parse.
 * @param {number} tahun - tahun target.
 * @param {object} user - user dari JWT (untuk allowedTables).
 * @param {number|null} [bulan] - bulan target untuk tabel bulanan (data_umum,
 *   data_rekap_dawis, data_bumil). Wajib untuk membandingkan terhadap periode
 *   yang benar. Kalau null, diperlakukan sebagai snapshot Desember (12).
 */
export async function buildImportDiff(parsedData, tahun, user, bulan = null) {
  const allowedTables = ROLE_TABLE_MAP[user.role] || [];
  const allowedSet = new Set(allowedTables);
  const MONTHLY_TABLES = new Set(['data_umum', 'data_rekap_dawis', 'data_bumil']);
  // Bulan efektif untuk tabel bulanan: pakai yang dipilih user, fallback 12.
  const effectiveBulan = bulan == null ? 12 : Number(bulan);

  const { data: dusunList, error: dusunError } = await supabase
    .from('dusun')
    .select('id, nama')
    .eq('is_active', 1);

  if (dusunError) throw dusunError;

  const dusunMap = {};
  (dusunList || []).forEach((dusun) => {
    dusunMap[normalizeName(dusun.nama)] = dusun;
  });

  const diff = [];

  for (const sheet of parsedData || []) {
    const canonicalTable = normalizeTableName(sheet.table);
    const validKeys = getTableKeys(canonicalTable);
    const rows = [];
    const counts = { insert: 0, update: 0, skip: 0, error: 0 };
    const sheetAllowed = allowedSet.has(canonicalTable) || allowedSet.has(sheet.table);

    if (!isKnownOperationalTable(canonicalTable) || validKeys.length === 0) {
      rows.push({
        dusunName: sheet.sheetName || canonicalTable || 'Sheet tidak dikenal',
        desaName: sheet.sheetName || canonicalTable || 'Sheet tidak dikenal',
        action: 'error',
        reason: 'Tabel tujuan tidak dikenal atau tidak diizinkan untuk import',
      });
      counts.error++;
      diff.push({
        sheetName: sheet.sheetName || canonicalTable || 'Sheet',
        tableName: canonicalTable,
        allowed: false,
        counts,
        rows,
        unmatchedDesa: sheet.unmatched || [],
        unmatchedDusun: sheet.unmatched || [],
      });
      continue;
    }

    if (!sheetAllowed) {
      rows.push({
        dusunName: sheet.sheetName || canonicalTable,
        desaName: sheet.sheetName || canonicalTable,
        action: 'error',
        reason: `Role ${user.role} tidak memiliki izin menulis ke ${canonicalTable}`,
      });
      counts.error++;
      diff.push({
        sheetName: sheet.sheetName || canonicalTable,
        tableName: canonicalTable,
        allowed: false,
        counts,
        rows,
        unmatchedDesa: sheet.unmatched || [],
        unmatchedDusun: sheet.unmatched || [],
      });
      continue;
    }

    let query = supabase.from(canonicalTable).select('*').eq('tahun', tahun);
    if (MONTHLY_TABLES.has(canonicalTable)) {
      query = query.eq('bulan', effectiveBulan);
    }

    const { data: existingData, error: existingError } = await query;
    if (existingError) throw existingError;

    const existingMap = {};
    (existingData || []).forEach((record) => {
      // Tabel mungkin masih punya kolom desa_id legacy; pakai dusun_id kalau ada.
      const unitId = record.dusun_id ?? record.desa_id;
      if (unitId != null) existingMap[unitId] = record;
    });

    for (const row of sheet.rows || []) {
      const unitName = row.dusunName ?? row.desaName;
      const dusun = dusunMap[normalizeName(unitName)];

      if (!dusun) {
        rows.push({
          dusunName: unitName,
          desaName: unitName,
          action: 'error',
          reason: 'Dusun tidak ditemukan di sistem',
        });
        counts.error++;
        continue;
      }

      const { incoming, invalid } = sanitizeIncomingFields(row.fields, validKeys);
      if (invalid.length > 0) {
        rows.push({
          dusunName: dusun.nama,
          desaName: dusun.nama,
          dusunId: dusun.id,
          desaId: dusun.id,
          action: 'error',
          reason: `Nilai bukan angka pada kolom: ${invalid.join(', ')}`,
        });
        counts.error++;
        continue;
      }

      const validation = validateRow(
        incoming,
        validKeys.map((key) => ({ key, label: key })),
        existingMap[dusun.id]
      );
      const issues = countIssues(validation);
      const issueCount = issues.errors + issues.warnings;

      if (issues.errors > 0) {
        rows.push({
          dusunName: dusun.nama,
          desaName: dusun.nama,
          dusunId: dusun.id,
          desaId: dusun.id,
          action: 'error',
          reason: 'Ada nilai tidak valid',
          incoming,
          validation,
          issues,
        });
        counts.error++;
        continue;
      }

      const current = existingMap[dusun.id];
      if (!current) {
        rows.push({
          dusunName: dusun.nama,
          desaName: dusun.nama,
          dusunId: dusun.id,
          desaId: dusun.id,
          action: 'insert',
          incoming,
          validation,
          issues,
          issueCount,
        });
        counts.insert++;
      } else if (hasChanged(current, incoming)) {
        rows.push({
          dusunName: dusun.nama,
          desaName: dusun.nama,
          dusunId: dusun.id,
          desaId: dusun.id,
          action: 'update',
          current,
          incoming,
          validation,
          issues,
          issueCount,
        });
        counts.update++;
      } else {
        rows.push({
          dusunName: dusun.nama,
          desaName: dusun.nama,
          dusunId: dusun.id,
          desaId: dusun.id,
          action: 'skip',
          reason: 'Data sama persis',
          validation,
          issues,
          issueCount,
        });
        counts.skip++;
      }
    }

    diff.push({
      sheetName: sheet.sheetName,
      tableName: canonicalTable,
      allowed: true,
      counts,
      rows,
      unmatchedDesa: sheet.unmatched || [],
      unmatchedDusun: sheet.unmatched || [],
    });
  }

  return { diff, dusunList: dusunList || [], desaList: dusunList || [] };
}

/**
 * Filter sheets dari diff hasil preview menjadi hanya sheet+row siap di-upsert.
 *
 * @param {Array} diff
 * @param {{ [tableName: string]: number[] } | null} [selectedDusunIds]
 *   Optional: hanya simpan baris yang `dusunId` ada di array ini per tabel.
 *   Backward-compat: kalau caller masih kirim `selectedDesaIds` (alias), tetap diterima.
 */
export function sheetsFromDiff(diff, selectedDusunIds) {
  const selection = selectedDusunIds || null;
  return (diff || [])
    .map((sheet) => {
      const allow = selection && Array.isArray(selection[sheet.tableName])
        ? new Set(selection[sheet.tableName])
        : null;
      return {
        sheetName: sheet.sheetName,
        table: sheet.tableName,
        rows: (sheet.rows || [])
          .filter((row) => {
            if (row.action !== 'insert' && row.action !== 'update') return false;
            if (!allow) return true;
            const id = row.dusunId ?? row.desaId;
            return id != null && allow.has(id);
          })
          .map((row) => ({
            dusunName: row.dusunName ?? row.desaName,
            desaName: row.dusunName ?? row.desaName, // alias backward-compat
            fields: row.incoming || {},
          })),
        unmatched: sheet.unmatchedDusun || sheet.unmatchedDesa || [],
      };
    })
    .filter((sheet) => sheet.rows.length > 0);
}
