/**
 * Helpers for tables that became monthly after a migration.
 *
 * Production databases can briefly lag behind the code. When the `bulan`
 * column is not present yet, read endpoints should fall back to the legacy
 * yearly query instead of failing the whole dashboard.
 */

const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);

export function isMissingColumnError(error, columnName = 'bulan') {
  if (!error) return false;

  const column = String(columnName).toLowerCase();
  const text = [
    error.code,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!text.includes(column)) return false;

  return (
    MISSING_COLUMN_CODES.has(error.code) ||
    text.includes('does not exist') ||
    text.includes('could not find') ||
    text.includes('schema cache') ||
    text.includes('undefined column')
  );
}

export async function queryWithOptionalMonth(buildQuery, bulan) {
  const month = Number(bulan);
  const monthlyResult = await buildQuery().eq('bulan', month);

  if (isMissingColumnError(monthlyResult.error, 'bulan')) {
    return buildQuery();
  }

  return monthlyResult;
}
