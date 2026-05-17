/**
 * @file Chart aggregation helpers — operasi summary untuk dashboard.
 *
 * Migration note: unit data sekarang `dusun` (sebelumnya `desa`). Helper terima
 * parameter dengan nama generic `unitList` di internal, tapi tetap export
 * fungsi lama (`buildDesaRanking`) sebagai alias untuk backward-compat satu
 * release.
 */

export function toNumericValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function buildColumnTotals(rows, columns) {
  return columns.map((column) => ({
    key: column.key,
    label: column.label,
    total: (rows || []).reduce((sum, row) => sum + toNumericValue(row?.[column.key]), 0),
  }));
}

/**
 * Ranking unit (dusun atau desa lama) berdasarkan metric tertentu.
 * Row bisa pakai `dusun_id` (canonical) atau `desa_id` (legacy).
 */
export function buildUnitRanking(rows, unitList, metricKey) {
  const rowMap = {};
  (rows || []).forEach((row) => {
    const unitId = row.dusun_id ?? row.desa_id;
    if (unitId != null) rowMap[unitId] = row;
  });

  return (unitList || [])
    .map((unit) => ({
      id: unit.id,
      nama: unit.nama,
      value: toNumericValue(rowMap[unit.id]?.[metricKey]),
    }))
    .sort((a, b) => b.value - a.value || String(a.nama).localeCompare(String(b.nama)));
}

/** Backward-compat alias — caller lama yang masih panggil buildDesaRanking. */
export const buildDesaRanking = buildUnitRanking;
/** Alias canonical baru. */
export const buildDusunRanking = buildUnitRanking;

/**
 * Stats summary untuk dashboard.
 * Row bisa pakai `dusun_id` (canonical) atau `desa_id` (legacy).
 */
export function buildStatsSummary(rows, columns, unitList) {
  const totals = buildColumnTotals(rows, columns);
  const totalValue = totals.reduce((sum, item) => sum + item.total, 0);
  const filledUnitIds = new Set(
    (rows || [])
      .map((row) => row.dusun_id ?? row.desa_id)
      .filter((id) => id != null)
  );

  return {
    totalDusun: (unitList || []).length,
    totalDesa: (unitList || []).length, // alias backward-compat
    filledDusun: filledUnitIds.size,
    filledDesa: filledUnitIds.size,
    indicatorCount: columns.length,
    totalValue,
    totals,
  };
}
