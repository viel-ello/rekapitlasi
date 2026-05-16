import { supabase } from '@/lib/supabase';
import { ROLE_TABLE_MAP } from '@/lib/excel/sheetMap';
import { validateRow, countIssues } from '@/lib/validation';
import { getTableKeys, isKnownOperationalTable } from '@/lib/dataQuality';

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
  return Object.entries(incoming).some(([key, value]) => Number(current[key] || 0) !== Number(value || 0));
}

export async function buildImportDiff(parsedData, tahun, user) {
  const allowedTables = ROLE_TABLE_MAP[user.role] || [];
  const { data: desaList, error: desaError } = await supabase
    .from('desa')
    .select('id, nama')
    .eq('is_active', 1);

  if (desaError) throw desaError;

  const desaMap = {};
  (desaList || []).forEach((desa) => {
    desaMap[normalizeName(desa.nama)] = desa;
  });

  const diff = [];

  for (const sheet of parsedData || []) {
    const tableName = sheet.table;
    const validKeys = getTableKeys(tableName);
    const rows = [];
    const counts = { insert: 0, update: 0, skip: 0, error: 0 };
    const sheetAllowed = allowedTables.includes(tableName);

    if (!isKnownOperationalTable(tableName) || validKeys.length === 0) {
      rows.push({
        desaName: sheet.sheetName || tableName || 'Sheet tidak dikenal',
        action: 'error',
        reason: 'Tabel tujuan tidak dikenal atau tidak diizinkan untuk import',
      });
      counts.error++;
      diff.push({
        sheetName: sheet.sheetName || tableName || 'Sheet',
        tableName,
        allowed: false,
        counts,
        rows,
        unmatchedDesa: sheet.unmatched || [],
      });
      continue;
    }

    if (!sheetAllowed) {
      rows.push({
        desaName: sheet.sheetName || tableName,
        action: 'error',
        reason: `Role ${user.role} tidak memiliki izin menulis ke ${tableName}`,
      });
      counts.error++;
      diff.push({
        sheetName: sheet.sheetName || tableName,
        tableName,
        allowed: false,
        counts,
        rows,
        unmatchedDesa: sheet.unmatched || [],
      });
      continue;
    }

    let query = supabase.from(tableName).select('*').eq('tahun', tahun);
    if (tableName === 'data_bumil') {
      query = query.eq('bulan', 12);
    }

    const { data: existingData, error: existingError } = await query;
    if (existingError) throw existingError;

    const existingMap = {};
    (existingData || []).forEach((record) => {
      existingMap[record.desa_id] = record;
    });

    for (const row of sheet.rows || []) {
      const desaName = row.desaName;
      const desa = desaMap[normalizeName(desaName)];

      if (!desa) {
        rows.push({
          desaName,
          action: 'error',
          reason: 'Desa tidak ditemukan di sistem',
        });
        counts.error++;
        continue;
      }

      const { incoming, invalid } = sanitizeIncomingFields(row.fields, validKeys);
      if (invalid.length > 0) {
        rows.push({
          desaName: desa.nama,
          desaId: desa.id,
          action: 'error',
          reason: `Nilai bukan angka pada kolom: ${invalid.join(', ')}`,
        });
        counts.error++;
        continue;
      }

      const validation = validateRow(incoming, validKeys.map((key) => ({ key, label: key })), existingMap[desa.id]);
      const issues = countIssues(validation);
      const issueCount = issues.errors + issues.warnings;

      if (issues.errors > 0) {
        rows.push({
          desaName: desa.nama,
          desaId: desa.id,
          action: 'error',
          reason: 'Ada nilai tidak valid',
          incoming,
          validation,
          issues,
        });
        counts.error++;
        continue;
      }

      const current = existingMap[desa.id];
      if (!current) {
        rows.push({
          desaName: desa.nama,
          desaId: desa.id,
          action: 'insert',
          incoming,
          validation,
          issues,
          issueCount,
        });
        counts.insert++;
      } else if (hasChanged(current, incoming)) {
        rows.push({
          desaName: desa.nama,
          desaId: desa.id,
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
          desaName: desa.nama,
          desaId: desa.id,
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
      tableName,
      allowed: true,
      counts,
      rows,
      unmatchedDesa: sheet.unmatched || [],
    });
  }

  return { diff, desaList: desaList || [] };
}

/**
 * Filter sheets dari diff hasil preview menjadi hanya sheet+row yang siap di-upsert.
 *
 * @param {Array} diff
 * @param {{ [tableName: string]: number[] } | null} [selectedDesaIds]
 *   Optional: hanya simpan baris yang `desaId` ada di array ini per tabel.
 *   Kalau null/undefined → simpan semua baris insert/update.
 */
export function sheetsFromDiff(diff, selectedDesaIds) {
  return (diff || []).map((sheet) => {
    const allow = selectedDesaIds && Array.isArray(selectedDesaIds[sheet.tableName])
      ? new Set(selectedDesaIds[sheet.tableName])
      : null;
    return {
      sheetName: sheet.sheetName,
      table: sheet.tableName,
      rows: (sheet.rows || [])
        .filter((row) => (row.action === 'insert' || row.action === 'update') && (!allow || (row.desaId && allow.has(row.desaId))))
        .map((row) => ({
          desaName: row.desaName,
          fields: row.incoming || {},
        })),
      unmatched: sheet.unmatchedDesa || [],
    };
  }).filter((sheet) => sheet.rows.length > 0);
}
