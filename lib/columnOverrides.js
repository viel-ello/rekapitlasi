/**
 * @file Helper untuk menerapkan override kolom (rename/hide) ke definisi standar.
 * Pakai di client (DataStatsPage, PokjaDataPage, BumilDataPage) maupun server bila diperlukan.
 */

/**
 * Apply override kolom ke array columns.
 * @param {Array<{key: string, label: string}>} columns  Kolom dari DATA_PAGES.
 * @param {Array<{column_key: string, label_override?: string, is_hidden?: number}>} overrides  Dari API.
 * @returns {Array<{key: string, label: string, hidden: boolean, originalLabel: string, renamed: boolean}>}
 */
export function applyColumnOverrides(columns, overrides) {
  const overrideMap = {};
  (overrides || []).forEach((o) => {
    overrideMap[o.column_key] = o;
  });

  return (columns || []).map((col) => {
    const ov = overrideMap[col.key];
    const hidden = Boolean(ov?.is_hidden);
    const labelOverride = ov?.label_override && ov.label_override.trim() ? ov.label_override.trim() : null;
    return {
      ...col,
      label: labelOverride || col.label,
      originalLabel: col.label,
      hidden,
      renamed: Boolean(labelOverride),
    };
  });
}

/**
 * Ambil kolom yang visible (tidak hidden) untuk UI input/stats/export.
 * Server tidak pakai ini untuk validasi write — penyembunyian hanya di layer UI.
 */
export function getVisibleColumns(columns, overrides) {
  return applyColumnOverrides(columns, overrides).filter((c) => !c.hidden);
}
