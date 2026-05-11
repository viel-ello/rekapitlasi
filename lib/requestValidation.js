import { DATA_PAGES } from '@/lib/dataPages';
import { supabase } from '@/lib/supabase';

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;
const MAX_NUMERIC_VALUE = 100000000;
const MAX_CUSTOM_TEXT_LENGTH = 500;
const MAX_IMPORT_SHEETS = 10;
const MAX_IMPORT_ROWS_PER_SHEET = 500;
const MAX_IMPORT_TOTAL_ROWS = 3500;
const MAX_IMPORT_FIELDS_PER_ROW = 100;

const DATA_PAGE_LIST = Object.values(DATA_PAGES);
const TABLE_COLUMNS = Object.fromEntries(
  DATA_PAGE_LIST.map((page) => [page.tableName, page.columns.map((column) => column.key)])
);
const VALID_TABLES = new Set(Object.keys(TABLE_COLUMNS));

export const VALID_ROLES = new Set(['admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'sekretaris', 'user']);

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

export async function sanitizeDataWritePayload(tableName, body, { requireMonth = false } = {}) {
  if (!isValidTableName(tableName)) {
    return { error: 'Nama tabel tidak valid' };
  }
  if (!isPlainObject(body)) {
    return { error: 'Payload harus berupa object JSON' };
  }

  const standardKeys = new Set(getTableColumnKeys(tableName));
  const allowedTopLevelKeys = new Set(['desa_id', 'tahun', 'bulan', 'custom_columns', ...standardKeys]);
  const unknownKeys = Object.keys(body).filter((key) => !allowedTopLevelKeys.has(key));
  if (unknownKeys.length > 0) {
    return { error: `Field tidak dikenal: ${unknownKeys.join(', ')}` };
  }

  const desaId = toBoundedInteger(body.desa_id, 'desa_id', { min: 1, max: 2147483647 });
  if (desaId.error) return { error: desaId.error };

  const year = parseYear(body.tahun);
  if (year.error) return { error: year.error };

  const sanitized = {
    desa_id: desaId.value,
    tahun: year.value,
  };

  if (requireMonth) {
    const month = parseMonth(body.bulan);
    if (month.error) return { error: month.error };
    sanitized.bulan = month.value;
  } else if (body.bulan !== undefined) {
    return { error: 'Field bulan tidak berlaku untuk tabel ini' };
  }

  const invalidValues = [];
  for (const key of standardKeys) {
    if (body[key] === undefined) continue;
    const parsed = toBoundedInteger(body[key], key);
    if (parsed.error) {
      invalidValues.push(key);
      continue;
    }
    sanitized[key] = parsed.value;
  }

  if (invalidValues.length > 0) {
    return { error: `Nilai tidak valid pada kolom: ${invalidValues.join(', ')}` };
  }

  if (body.custom_columns !== undefined) {
    if (!isPlainObject(body.custom_columns)) {
      return { error: 'custom_columns harus berupa object' };
    }

    const dynamicColumnMap = await getDynamicColumnMap(tableName);
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

  const hasWritableField = Object.keys(sanitized).some((key) => !['desa_id', 'tahun', 'bulan'].includes(key));
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
      if (!isPlainObject(row) || typeof row.desaName !== 'string' || !isPlainObject(row.fields)) {
        return { error: `Format baris pada sheet ${sheet.sheetName || sheet.table} tidak valid` };
      }
      if (Object.keys(row.fields).length > MAX_IMPORT_FIELDS_PER_ROW) {
        return { error: `Terlalu banyak kolom pada sheet ${sheet.sheetName || sheet.table}` };
      }
    }
  }

  return { ok: true };
}
