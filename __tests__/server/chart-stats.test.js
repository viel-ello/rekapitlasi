/**
 * @file Chart aggregation tests
 */

describe('chart aggregation helpers', () => {
  test('buildColumnTotals sums numeric columns', () => {
    const { buildColumnTotals } = require('@/lib/chartStats');
    const rows = [
      { jml_kk: 10, jml_jiwa_l: 4 },
      { jml_kk: 7, jml_jiwa_l: 6 },
    ];
    const columns = [
      { key: 'jml_kk', label: 'KK' },
      { key: 'jml_jiwa_l', label: 'Jiwa L' },
    ];

    expect(buildColumnTotals(rows, columns)).toEqual([
      { key: 'jml_kk', label: 'KK', total: 17 },
      { key: 'jml_jiwa_l', label: 'Jiwa L', total: 10 },
    ]);
  });

  test('buildColumnTotals treats empty and non-number values as zero', () => {
    const { buildColumnTotals } = require('@/lib/chartStats');
    const rows = [
      { jml_kk: '', jml_jiwa_l: null },
      { jml_kk: 'abc', jml_jiwa_l: undefined },
      { jml_kk: 5, jml_jiwa_l: 3 },
    ];

    const totals = buildColumnTotals(rows, [
      { key: 'jml_kk', label: 'KK' },
      { key: 'jml_jiwa_l', label: 'Jiwa L' },
    ]);

    expect(totals[0].total).toBe(5);
    expect(totals[1].total).toBe(3);
  });

  test('buildDesaRanking sorts desa by selected indicator value', () => {
    const { buildDesaRanking } = require('@/lib/chartStats');
    const desa = [
      { id: 1, nama: 'A' },
      { id: 2, nama: 'B' },
      { id: 3, nama: 'C' },
    ];
    const rows = [
      { desa_id: 1, jml_kk: 4 },
      { desa_id: 2, jml_kk: 10 },
      { desa_id: 3, jml_kk: 7 },
    ];

    expect(buildDesaRanking(rows, desa, 'jml_kk').map(item => item.nama)).toEqual(['B', 'C', 'A']);
  });
});
