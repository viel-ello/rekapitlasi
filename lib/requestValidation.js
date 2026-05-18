import { DATA_PAGES } from '@/lib/dataPages';
import { supabase } from '@/lib/supabase';
import { normalizeTableName } from '@/lib/auth';

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;
const MAX_NUMERIC_VALUE = 100000000;
const MAX_CUSTOM_TEXT_LENGTH = 500;
const MAX_KETERANGAN_LENGTH = 1000;
const MAX_IMPORT_SHEETS = 10;
const MAX_IMPORT_ROWS_PER_SHEET = 500;
const MAX_IMPORT_TOTAL_ROWS = 3500;
const MAX_IMPORT_FIELDS_PER_ROW = 100;

const DATA_PAGE_LIST = Object.values(DATA_PAGES);

/**
 * Build TABLE_COLUMNS map: { tableName -> [keys] }.
 * Termasuk alias `data_kegiatan_warga` supaya legacy caller tetap valid.
 */
function buildTableColumns() {
  const map = {};
  for (const page of DATA_PAGE_LIST) {
    map[page.tableName] = page.columns.map((column) => column.key);
  }
  // Backward-compat alias
  if (map.data_rekap_dawis) {
    map.data_kegiatan_warga = map.data_rekap_dawis;
  }
  return map;
}

const TABLE_COLUMNS = buildTableColumns();
const TABLE_COLUMN_TYPES = (() => {
  const map = {};
  for (const page of DATA_PAGE_LIST) {
    const types = {};
    for (const col of page.columns) types[col.key] = col.type || 'number';
    map[page.tableName] = types;
  }
  if (map.data_rekap_dawis) {
    map.data_kegiatan_warga = map.data_rekap_dawis;
  }
  return map;
})();

const VALID_TABLES = new Set(Object.keys(TABLE_COLUMNS));

/**
 * Roles yang valid (table-level dan row-level scope dari kader-dusun).
 */
export const VALID_ROLES = new Set([
  'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'user',
  'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
  'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan',
]);

export function isValidTableName(tableName) {
  return VALID_TABLES.has(tableName);
}

export function getValidTableNames() {
  return [...VALID_TABLES];
}

export function getTableColumnKeys(tableName) {
  return TABLE_COLUMNS[tableName] || [];
}

export function toBoundedInteger(value, label, { min = 0, max = MAX_NUMERIC_VALUE } = {}) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
    return {
      error: `${label} harus berupa angka bulat antara ${min} dan ${max}`,
    };
  }
  return { value: numericValue };
}

export function parseYear(value) {
  return toBoundedInteger(value, 'Tahun', { min: MIN_YEAR, max: MAX_YEAR });
}

export function parseMonth(value) {
  return toBoundedInteger(value, 'Bulan', { min: 1, max: 12 });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function getDynamicColumnMap(tableName) {
  const { data, error } = await supabase
    .from('table_schemas')
    .select('column_key, column_type')
    .eq('table_name', tableName);

  if (error) throw error;
  return new Map((data || []).map((column) => [column.column_key, column.column_type || 'text']));
}

/**
 * Sanitize body untuk endpoint write (POST/PATCH) tabel data.
 *
 * Backward-compat: terima `desa_id` sebagai alias untuk `dusun_id`. Hasil
 * sanitized tetap pakai `dusun_id` (canonical).
 *
 * Catatan: handler caller bertanggung jawab untuk overwrite `dusun_id` ke
 * `user.dusun_id` untuk role kader-dusun (anti-tamper).
 */
export async function sanitizeDataWritePayload(tableName, body, { requireMonth = false } = {}) {
  if (!isValidTableName(tableName)) {
    return { error: 'Nama tabel tidak valid' };
  }
  if (!isPlainObject(body)) {
    return { error: 'Payload harus berupa object JSON' };
  }

  const standardKeys = new Set(getTableColumnKeys(tableName));
  const allowedTopLevelKeys = new Set([
    'dusun_id', 'desa_id', 'tahun', 'bulan', 'custom_columns', ...standardKeys,
  ]);
  const unknownKeys = Object.keys(body).filter((key) => !allowedTopLevelKeys.has(key));
  if (unknownKeys.length > 0) {
    return { error: `Field tidak dikenal: ${unknownKeys.join(', ')}` };
  }

  // Accept dusun_id (canonical) atau desa_id (legacy alias).
  const unitIdRaw = body.dusun_id ?? body.desa_id;
  const unitId = toBoundedInteger(unitIdRaw, 'dusun_id', { min: 1, max: 2147483647 });
  if (unitId.error) return { error: unitId.error };

  const year = parseYear(body.tahun);
  if (year.error) return { error: year.error };

  const sanitized = {
    dusun_id: unitId.value,
    tahun: year.value,
  };

  if (requireMonth) {
    const month = parseMonth(body.bulan);
    if (month.error) return { error: month.error };
    sanitized.bulan = month.value;
  } else if (body.bulan !== undefined) {
    return { error: 'Field bulan tidak berlaku untuk tabel ini' };
  }

  const types = TABLE_COLUMN_TYPES[tableName] || {};
  const invalidValues = [];
  for (const key of standardKeys) {
    if (body[key] === undefined) continue;
    if (types[key] === 'text') {
      // Text fields seperti `keterangan`: trim + cap length, no numeric coercion
      const text = String(body[key] ?? '').slice(0, MAX_KETERANGAN_LENGTH);
      sanitized[key] = text;
      continue;
    }
    // v6: kolom data sekarang fleksibel — bisa angka atau teks. Server simpan
    // sebagai string. Validasi: cap length 100 char, sanitize control chars.
    const raw = body[key];
    if (raw === null || raw === undefined) {
      sanitized[key] = '';
      continue;
    }
    if (typeof raw !== 'string' && typeof raw !== 'number') {
      invalidValues.push(key);
      continue;
    }
    const text = String(raw).replace(/[\x00-\x1F\x7F]/g, '').slice(0, 100);
    sanitized[key] = text;
  }

  if (invalidValues.length > 0) {
    return { error: `Nilai tidak valid pada kolom: ${invalidValues.join(', ')}` };
  }

  if (body.custom_columns !== undefined) {
    if (!isPlainObject(body.custom_columns)) {
      return { error: 'custom_columns harus berupa object' };
    }

    const canonicalTable = normalizeTableName(tableName);
    const dynamicColumnMap = await getDynamicColumnMap(canonicalTable);
    const sanitizedCustomColumns = {};

    for (const [key, value] of Object.entries(body.custom_columns)) {
      const columnType = dynamicColumnMap.get(key);
      if (!columnType) {
        return { error: `Kolom dinamis tidak dikenal: ${key}` };
      }

      if (columnType === 'number') {
        const parsed = toBoundedInteger(value, key);
        if (parsed.error) return { error: parsed.error };
        sanitizedCustomColumns[key] = parsed.value;
      } else {
        sanitizedCustomColumns[key] = String(value ?? '').trim().slice(0, MAX_CUSTOM_TEXT_LENGTH);
      }
    }

    sanitized.custom_columns = sanitizedCustomColumns;
  }

  const hasWritableField = Object.keys(sanitized).some(
    (key) => !['dusun_id', 'tahun', 'bulan'].includes(key)
  );
  if (!hasWritableField) {
    return { error: 'Minimal satu kolom data harus dikirim' };
  }

  return { data: sanitized };
}

export function validateImportPayload(parsedData) {
  if (!Array.isArray(parsedData)) {
    return { error: 'Data import harus berupa array sheet' };
  }
  if (parsedData.length > MAX_IMPORT_SHEETS) {
    return { error: `Maksimal ${MAX_IMPORT_SHEETS} sheet per import` };
  }

  let totalRows = 0;
  for (const sheet of parsedData) {
    if (!isPlainObject(sheet)) {
      return { error: 'Setiap sheet harus berupa object' };
    }
    if (!isValidTableName(sheet.table)) {
      return { error: `Tabel import tidak valid: ${sheet.table || '-'}` };
    }
    if (!Array.isArray(sheet.rows)) {
      return { error: `Rows pada sheet ${sheet.sheetName || sheet.table} harus berupa array` };
    }
    if (sheet.rows.length > MAX_IMPORT_ROWS_PER_SHEET) {
      return { error: `Sheet ${sheet.sheetName || sheet.table} melebihi ${MAX_IMPORT_ROWS_PER_SHEET} baris` };
    }

    totalRows += sheet.rows.length;
    if (totalRows > MAX_IMPORT_TOTAL_ROWS) {
      return { error: `Total baris import melebihi ${MAX_IMPORT_TOTAL_ROWS}` };
    }

    for (const row of sheet.rows) {
      if (!isPlainObject(row)) {
        return { error: `Format baris pada sheet ${sheet.sheetName || sheet.table} tidak valid` };
      }
      // Accept either dusunName or desaName (legacy)
      const unitName = row.dusunName ?? row.desaName;
      if (typeof unitName !== 'string' || !isPlainObject(row.fields)) {
        return { error: `Format baris pada sheet ${sheet.sheetName || sheet.table} tidak valid` };
      }
      if (Object.keys(row.fields).length > MAX_IMPORT_FIELDS_PER_ROW) {
        return { error: `Terlalu banyak kolom pada sheet ${sheet.sheetName || sheet.table}` };
      }
    }
  }

  return { ok: true };
}
