/**
 * @file Data validation helpers (pure functions)
 * Used by: PokjaDataPage (client), import preview (server)
 */

/**
 * Validate a single cell value
 *
 * v6: kolom data sekarang fleksibel (angka atau teks). Validator hanya
 * menandai kolom kosong sebagai info, dan lonjakan tidak wajar (kalau angka)
 * sebagai warning. String non-numerik dianggap valid.
 *
 * @param {string} key
 * @param {number|string} value
 * @param {number|string|null} prevYearValue
 * @returns {{ valid: boolean, warning: string|null, severity: 'error'|'warning'|'info'|null }}
 */
export function validateCell(key, value, prevYearValue = null) {
  // Empty
  if (value === '' || value === null || value === undefined) {
    return { valid: true, warning: 'Kolom belum diisi', severity: 'info' };
  }

  const num = Number(value);

  // Non-numeric (huruf/teks) — boleh, tidak warning
  if (Number.isNaN(num)) {
    return { valid: true, warning: null, severity: null };
  }

  // Negative
  if (num < 0) {
    return { valid: false, warning: 'Nilai tidak boleh negatif', severity: 'error' };
  }

  // Spike detection (>3x previous year, only if prev > 0)
  const prevNum = Number(prevYearValue);
  if (Number.isFinite(prevNum) && prevNum > 0 && num > prevNum * 3) {
    return {
      valid: true,
      warning: `Lonjakan tidak wajar: ${num.toLocaleString('id-ID')} vs tahun lalu ${prevNum.toLocaleString('id-ID')} (>${Math.round(num / prevNum)}x)`,
      severity: 'warning',
    };
  }

  return { valid: true, warning: null, severity: null };
}

/**
 * Validate an entire row
 * @param {Object} row - { [columnKey]: value }
 * @param {Array} columns - [{ key, label }]
 * @param {Object|null} prevYearRow - same shape as row, for spike detection
 * @returns {Object} { [columnKey]: { valid, warning, severity } }
 */
export function validateRow(row, columns, prevYearRow = null) {
  const result = {};
  for (const col of columns) {
    const value = row?.[col.key];
    const prev = prevYearRow?.[col.key] ?? null;
    result[col.key] = validateCell(col.key, value, prev);
  }
  return result;
}

/**
 * Count issues in a validation result
 * @param {Object} rowValidation - output of validateRow
 * @returns {{ errors: number, warnings: number, infos: number }}
 */
export function countIssues(rowValidation) {
  let errors = 0, warnings = 0, infos = 0;
  for (const v of Object.values(rowValidation)) {
    if (v.severity === 'error') errors++;
    else if (v.severity === 'warning') warnings++;
    else if (v.severity === 'info') infos++;
  }
  return { errors, warnings, infos };
}
