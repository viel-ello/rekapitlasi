import { validateRow, countIssues } from '@/lib/validation';
import { SHEET_MAP } from '@/lib/excel/sheetMap';
import { DATA_PAGES } from '@/lib/dataPages';

export const COMPLETENESS_STATUS = {
  COMPLETE: 'lengkap',
  INCOMPLETE: 'belum_lengkap',
  NEEDS_CHECK: 'perlu_dicek',
};
export const STATUS_LABELS = {
  [COMPLETENESS_STATUS.COMPLETE]: 'Lengkap',
  [COMPLETENESS_STATUS.INCOMPLETE]: 'Belum lengkap',
  [COMPLETENESS_STATUS.NEEDS_CHECK]: 'Perlu dicek',
};

/**
 * Tabel operasional yang dipantau completeness-nya.
 * `data_kegiatan_warga` dipertahankan sebagai alias untuk `data_rekap_dawis`
 * supaya import file lama & code legacy tidak break selama transition.
 */
export const OPERATIONAL_TABLES = [
  { table: 'data_umum', label: 'Data Umum', sheetName: 'DATA UMUM' },
  { table: 'data_pokja1', label: 'Pokja I', sheetName: 'POKJA I' },
  { table: 'data_pokja2', label: 'Pokja II', sheetName: 'POKJA II' },
  { table: 'data_pokja3', label: 'Pokja III', sheetName: 'POKJA III' },
  { table: 'data_pokja4', label: 'Pokja IV', sheetName: 'POKJA IV' },
  { table: 'data_rekap_dawis', label: 'Rekapitulasi Dawis', sheetName: 'REKAP DAWIS' },
  // Backward-compat alias
  { table: 'data_kegiatan_warga', label: 'Rekapitulasi Dawis', sheetName: 'REKAP DAWIS', aliasOf: 'data_rekap_dawis' },
  { table: 'data_bumil', label: 'Bumil', sheetName: 'DATA BUMIL' },
];

/** Normalisasi alias: kalau caller masih kirim `data_kegiatan_warga`, treat as `data_rekap_dawis`. */
function canonicalTable(tableName) {
  return tableName === 'data_kegiatan_warga' ? 'data_rekap_dawis' : tableName;
}

export function getTableKeys(tableName) {
  const canonical = canonicalTable(tableName);
  const dataPage = Object.values(DATA_PAGES).find((page) => page.tableName === canonical);
  if (dataPage) return dataPage.columns.map((column) => column.key);

  const sheet = Object.values(SHEET_MAP).find((item) => item.table === canonical);
  return sheet?.keys || [];
}

export function isKnownOperationalTable(tableName) {
  return OPERATIONAL_TABLES.some((item) => item.table === tableName);
}

function hasAnyFilledValue(row, keys) {
  if (!row) return false;
  return keys.some((key) => {
    const value = row[key];
    return value !== null && value !== undefined && value !== '';
  });
}

export function evaluateRecordCompleteness(row, keys, previousRow = null) {
  if (!row || !hasAnyFilledValue(row, keys)) {
    return {
      status: COMPLETENESS_STATUS.INCOMPLETE,
      label: STATUS_LABELS[COMPLETENESS_STATUS.INCOMPLETE],
      issues: { errors: 0, warnings: 0, infos: keys.length },
      issueCount: keys.length,
    };
  }

  const columns = keys.map((key) => ({ key, label: key }));
  const validation = validateRow(row, columns, previousRow);
  const issues = countIssues(validation);

  if (issues.errors > 0 || issues.warnings > 0) {
    return {
      status: COMPLETENESS_STATUS.NEEDS_CHECK,
      label: STATUS_LABELS[COMPLETENESS_STATUS.NEEDS_CHECK],
      issues,
      issueCount: issues.errors + issues.warnings + issues.infos,
    };
  }

  // Hanya "info" (kolom kosong) tidak menjadikan status INCOMPLETE.
  // Record dianggap lengkap selama tidak ada error/warning,
  // karena banyak kolom memang bersifat opsional per tahun.
  return {
    status: COMPLETENESS_STATUS.COMPLETE,
    label: STATUS_LABELS[COMPLETENESS_STATUS.COMPLETE],
    issues,
    issueCount: 0,
  };
}

export function mergeStatus(statuses) {
  if (!statuses.length) return COMPLETENESS_STATUS.INCOMPLETE;
  if (statuses.some((status) => status === COMPLETENESS_STATUS.NEEDS_CHECK)) {
    return COMPLETENESS_STATUS.NEEDS_CHECK;
  }
  if (statuses.every((status) => status === COMPLETENESS_STATUS.COMPLETE)) {
    return COMPLETENESS_STATUS.COMPLETE;
  }
  return COMPLETENESS_STATUS.INCOMPLETE;
}
