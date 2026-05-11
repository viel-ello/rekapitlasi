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

export function buildDesaRanking(rows, desaList, metricKey) {
  const rowMap = {};
  (rows || []).forEach((row) => {
    rowMap[row.desa_id] = row;
  });

  return (desaList || [])
    .map((desa) => ({
      id: desa.id,
      nama: desa.nama,
      value: toNumericValue(rowMap[desa.id]?.[metricKey]),
    }))
    .sort((a, b) => b.value - a.value || String(a.nama).localeCompare(String(b.nama)));
}

export function buildStatsSummary(rows, columns, desaList) {
  const totals = buildColumnTotals(rows, columns);
  const totalValue = totals.reduce((sum, item) => sum + item.total, 0);
  const filledDesaIds = new Set((rows || []).map((row) => row.desa_id).filter(Boolean));

  return {
    totalDesa: (desaList || []).length,
    filledDesa: filledDesaIds.size,
    indicatorCount: columns.length,
    totalValue,
    totals,
  };
}
