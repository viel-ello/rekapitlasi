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

export const OPERATIONAL_TABLES = [
  { table: 'data_umum', label: 'Data Umum', sheetName: 'DATA UMUM' },
  { table: 'data_pokja1', label: 'Pokja I', sheetName: 'POKJA I' },
  { table: 'data_pokja2', label: 'Pokja II', sheetName: 'POKJA II' },
  { table: 'data_pokja3', label: 'Pokja III', sheetName: 'POKJA III' },
  { table: 'data_pokja4', label: 'Pokja IV', sheetName: 'POKJA IV' },
  { table: 'data_kegiatan_warga', label: 'Kegiatan Warga', sheetName: 'KEGIATAN WARGA' },
  { table: 'data_bumil', label: 'Bumil', sheetName: 'DATA BUMIL' },
];

const EXTRA_TABLE_KEYS = {
  data_kegiatan_warga: [
    'jml_dusun', 'jml_rw', 'jml_rt', 'jml_dawis', 'jml_krt', 'jml_kk',
    'jml_anggota_l', 'jml_anggota_p', 'balita_l', 'balita_p', 'pus', 'wus',
    'ibu_hamil', 'ibu_menyusui', 'lansia', 'rumah_sehat', 'rumah_kurang_sehat',
    'punya_tempat_sampah', 'punya_spal', 'stiker_p4k', 'air_pdam', 'air_sumur',
    'air_sungai', 'air_dll', 'jamban', 'makan_beras', 'makan_non_beras',
    'ikut_up2k', 'ikut_pekarangan', 'ikut_industri', 'ikut_kesling', 'jkn_bpjs',
  ],
};

export function getTableKeys(tableName) {
  const dataPage = Object.values(DATA_PAGES).find((page) => page.tableName === tableName);
  if (dataPage) return dataPage.columns.map((column) => column.key);

  const sheet = Object.values(SHEET_MAP).find((item) => item.table === tableName);
  return sheet?.keys || EXTRA_TABLE_KEYS[tableName] || [];
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

  if (issues.infos > 0) {
    return {
      status: COMPLETENESS_STATUS.INCOMPLETE,
      label: STATUS_LABELS[COMPLETENESS_STATUS.INCOMPLETE],
      issues,
      issueCount: issues.infos,
    };
  }

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
