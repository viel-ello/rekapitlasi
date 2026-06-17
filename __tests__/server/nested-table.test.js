/**
 * @file Test helper murni nested table header (lib/nestedTable.js).
 */
const { resolveTree, annotate, flattenLeaves, buildHeaderRows } = require('@/lib/nestedTable');

const tree = [
  { kind: 'leaf', key: 'a', label: 'A' },
  {
    kind: 'group', label: 'G',
    children: [
      { kind: 'leaf', key: 'b', label: 'B' },
      { kind: 'leaf', key: 'c', label: 'C' },
    ],
  },
];

function byKeyAll() {
  return new Map([
    ['a', { key: 'a', label: 'A' }],
    ['b', { key: 'b', label: 'B' }],
    ['c', { key: 'c', label: 'C' }],
  ]);
}

describe('nestedTable helpers', () => {
  test('resolveTree menyimpan node yang visible, skip hidden', () => {
    const byKey = byKeyAll();
    byKey.set('b', { key: 'b', label: 'B', hidden: true });
    const resolved = resolveTree(tree, byKey);
    const leaves = flattenLeaves(resolved);
    expect(leaves.map((l) => l.key)).toEqual(['a', 'c']);
  });

  test('resolveTree membuang grup yang semua anaknya hidden', () => {
    const byKey = byKeyAll();
    byKey.set('b', { key: 'b', label: 'B', hidden: true });
    byKey.set('c', { key: 'c', label: 'C', hidden: true });
    const resolved = resolveTree(tree, byKey);
    // Grup G hilang karena semua leaf-nya hidden; sisa hanya leaf 'a'.
    expect(resolved).toHaveLength(1);
    expect(resolved[0].key).toBe('a');
  });

  test('annotate menghitung totalLeaves & maxDepth', () => {
    const resolved = resolveTree(tree, byKeyAll());
    const { totalLeaves, maxDepth } = annotate(resolved);
    expect(totalLeaves).toBe(3);
    expect(maxDepth).toBe(2);
  });

  test('buildHeaderRows menghasilkan jumlah baris = totalDepth', () => {
    const resolved = resolveTree(tree, byKeyAll());
    const { maxDepth } = annotate(resolved);
    const rows = buildHeaderRows(resolved, maxDepth);
    expect(rows).toHaveLength(maxDepth);
    // Baris pertama: leaf 'a' (rowSpan 2) + grup 'G' (colSpan 2)
    expect(rows[0].length).toBe(2);
  });

  test('resolveTree pakai label override saat renamed', () => {
    const byKey = new Map([
      ['a', { key: 'a', label: 'Label Baru', renamed: true }],
    ]);
    const resolved = resolveTree([{ kind: 'leaf', key: 'a', label: 'A' }], byKey);
    expect(resolved[0].label).toBe('Label Baru');
    expect(resolved[0].fullLabel).toBe('Label Baru');
  });
});
