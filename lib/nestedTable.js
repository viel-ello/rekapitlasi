/**
 * @file Helper murni untuk membangun header tabel bersarang (NestedDataPage).
 * Di-extract dari komponen supaya bisa di-test & dipakai ulang. Tidak ada
 * dependency React — semua fungsi murni.
 */

/** Resolve tree: skip hidden columns; apply override label. */
export function resolveTree(nodes, byKey) {
  const out = [];
  for (const node of nodes) {
    if (node.kind === 'leaf') {
      const col = byKey.get(node.key);
      if (!col || col.hidden) continue;
      out.push({
        ...node,
        ...col,
        label: col.renamed ? col.label : node.label,
        fullLabel: col.label,
      });
    } else {
      const children = resolveTree(node.children, byKey);
      if (children.length === 0) continue;
      out.push({ kind: 'group', label: node.label, children });
    }
  }
  return out;
}

/** Annotate _leafCount dan _maxDepth pada setiap node. */
export function annotate(nodes) {
  let totalLeaves = 0;
  let maxDepth = 1;
  function walk(n, depth) {
    if (n.kind === 'leaf') {
      n._leafCount = 1;
      n._depth = depth;
      maxDepth = Math.max(maxDepth, depth);
      totalLeaves += 1;
      return 1;
    }
    let sum = 0;
    let mDepth = depth;
    for (const c of n.children) {
      sum += walk(c, depth + 1);
      mDepth = Math.max(mDepth, c._maxDepth ?? c._depth ?? depth + 1);
    }
    n._leafCount = sum;
    n._depth = depth;
    n._maxDepth = mDepth;
    maxDepth = Math.max(maxDepth, mDepth);
    return sum;
  }
  for (const n of nodes) walk(n, 1);
  return { totalLeaves, maxDepth };
}

/** Ratakan semua leaf node jadi array. */
export function flattenLeaves(nodes) {
  const leaves = [];
  for (const n of nodes) {
    if (n.kind === 'leaf') leaves.push(n);
    else leaves.push(...flattenLeaves(n.children));
  }
  return leaves;
}

/** Build header rows: rows[level - 1] = [{node, rowSpan, colSpan}, ...]. */
export function buildHeaderRows(nodes, totalDepth) {
  const rows = Array.from({ length: totalDepth }, () => []);
  function visit(n, level) {
    if (n.kind === 'leaf') {
      // leaf di-render di `level` dengan rowSpan = (totalDepth - level + 1)
      // supaya tembus ke baris terakhir header.
      rows[level - 1].push({
        node: n,
        rowSpan: totalDepth - level + 1,
        colSpan: 1,
      });
      return;
    }
    rows[level - 1].push({
      node: n,
      rowSpan: 1,
      colSpan: n._leafCount,
    });
    for (const c of n.children) visit(c, level + 1);
  }
  for (const n of nodes) visit(n, 1);
  return rows;
}
