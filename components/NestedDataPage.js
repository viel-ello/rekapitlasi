'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { FloppyDisk, Lock, Search, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { DataPageIcon } from '@/components/DataPageIcon';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';
import { validateRow, countIssues } from '@/lib/validation';
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut';
import PeriodWorkflowBadge from '@/components/PeriodWorkflowBadge';
import EditModeSwitcher from '@/components/EditModeSwitcher';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import TableSkeleton from '@/components/TableSkeleton';
import { useEditMode } from '@/lib/useEditMode';
import { MONTHS } from '@/lib/dataPages';
import { captureScrollState, restoreScrollState } from '@/lib/preserveScroll';
import { getDusunCached } from '@/lib/fetchDusun';

/**
 * Komponen generic untuk tabel dengan multi-row header arbitrary depth.
 *
 * Props:
 *   - config: object DATA_PAGES standar
 *   - tree: array of nodes — definisi struktur header
 *     Setiap node: { kind: 'leaf', key, label, vertical?, type? } atau
 *                  { kind: 'group', label, children: [...] }
 *   - titleBlock: opsional, JSX untuk title block di atas tabel (e.g., DATA UMUM + identity)
 *   - rotateThreshold: opsional, jumlah kolom min yang akan trigger vertical text (default: pakai vertical flag explicit di leaf)
 */

// Resolve tree: skip hidden columns; apply override label
function resolveTree(nodes, byKey) {
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

// Annotate _leafCount dan _maxDepth pada setiap node
function annotate(nodes) {
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

function flattenLeaves(nodes) {
  const leaves = [];
  for (const n of nodes) {
    if (n.kind === 'leaf') leaves.push(n);
    else leaves.push(...flattenLeaves(n.children));
  }
  return leaves;
}

// Build header rows: rows[level - 1] = [{node, rowSpan, colSpan}, ...]
function buildHeaderRows(nodes, totalDepth) {
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

function VerticalText({ children, height = 130 }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          whiteSpace: 'nowrap',
          fontSize: 10,
          fontWeight: 600,
          padding: '4px 0',
          lineHeight: 1.1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function HeaderCellLabel({ node }) {
  if (node.kind === 'leaf' && node.vertical) {
    return (
      <VerticalText>
        {node.label}
        {node.renamed && <span className="ml-1 text-amber-500">*</span>}
      </VerticalText>
    );
  }
  if (node.kind === 'leaf') {
    return (
      <span style={{ fontSize: 11, fontWeight: 600 }}>
        {node.label}
        {node.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
      </span>
    );
  }
  return <span style={{ fontSize: 11, fontWeight: 700 }}>{node.label}</span>;
}

export default function NestedDataPage({
  config, tree, titleBlock,
  unitLabel = 'Nama Dusun', unitColumnLabel,
  headerTheme,
}) {
  const { mode, setMode, isWord } = useEditMode();
  const theme = {
    bg: headerTheme?.bg || '#f9fafb',
    fg: headerTheme?.fg || '#111827',
    borderColor: headerTheme?.borderColor || '#d1d5db',
  };
  const [dusun, setDusun] = useState([]);
  const [data, setData] = useState({});
  const [prevYearData, setPrevYearData] = useState({});
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(null);
  const [saveStatus, setSaveStatus] = useState({});
  const [toast, setToast] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userDusunId, setUserDusunId] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Filter "hanya bermasalah" — hanya tampilkan dusun dengan error/warning.
  const [onlyIssues, setOnlyIssues] = useState(false);
  // State expanded mobile card di parent supaya tidak reset tiap re-render
  // (kalau di local MobileCard, akan unmount setiap kali parent re-render
  // karena MobileCard di-define inline → React anggap component baru).
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // Buffer perubahan input yang belum di-save. Pakai ref supaya saat user
  // ngetik tidak trigger re-render — input tetap responsif & focus tidak
  // hilang. Map dusunId -> { columnKey: stringValue }.
  const pendingChangesRef = useRef(new Map());
  // Set dusunId yang punya pending changes. Update hanya saat transisi
  // clean→dirty (sekali per dusun) — bukan tiap karakter.
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  // Versi data dari server (increment saat fetch ulang). Dipakai sebagai key
  // di input supaya input uncontrolled re-mount saat data fresh masuk
  // (mis. setelah save sukses atau ganti tahun/bulan).
  const [dataVersion, setDataVersion] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  // Tick untuk memaksa recompute total footer dari buffer input terbaru
  // (input uncontrolled tidak trigger re-render saat user ngetik).
  const [recalcTick, setRecalcTick] = useState(0);
  // Untuk tabel per-bulan: set bulan (1-12) yang sudah punya minimal 1 baris data.
  const [monthsWithData, setMonthsWithData] = useState(() => new Set());
  const { years } = useYears();

  const hasMonth = !!config.hasMonth;

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(config.columns, overrides).filter((c) => !c.hidden),
    [config.columns, overrides]
  );

  const { resolvedTree, leaves, totalDepth, headerRows } = useMemo(() => {
    const byKey = new Map(effectiveColumns.map((c) => [c.key, c]));
    const resolvedTree = resolveTree(tree, byKey);
    const { maxDepth } = annotate(resolvedTree);
    const leaves = flattenLeaves(resolvedTree);
    const headerRows = buildHeaderRows(resolvedTree, maxDepth);
    return { resolvedTree, leaves, totalDepth: maxDepth, headerRows };
  }, [effectiveColumns, tree]);

  useEffect(() => { fetchDusun(); checkPermission(); fetchOverrides(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dusun.length > 0) {
      fetchData(tahun);
      fetchData(tahun - 1, true);
      if (hasMonth) fetchMonthsWithData(tahun);
    }
  }, [tahun, bulan, dusun]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPermission = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const me = await res.json();
        setUserRole(me.role);
        setCanEdit(me.permissions.includes(config.tableName));
        setUserDusunId(me.dusun_id ?? null);
      }
    } catch { setCanEdit(false); }
  };

  const fetchDusun = async () => {
    try {
      const list = await getDusunCached();
      if (list.length) setDusun(list);
    } catch { /* silent */ }
  };

  const fetchOverrides = async () => {
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${config.tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch { /* silent */ }
  };

  // Tabel per-bulan: ambil semua baris tahun ini (tanpa filter bulan) lalu
  // kumpulkan bulan mana saja yang sudah punya data → untuk penanda di dropdown.
  const fetchMonthsWithData = async (targetYear) => {
    try {
      const res = await fetch(`${config.apiEndpoint}?tahun=${targetYear}`);
      if (!res.ok) return;
      const rows = await res.json();
      const set = new Set();
      (rows || []).forEach((r) => { if (r.bulan != null) set.add(Number(r.bulan)); });
      setMonthsWithData(set);
    } catch { /* silent */ }
  };

  const fetchData = async (targetYear, isPrev = false) => {
    const params = new URLSearchParams({ tahun: String(targetYear) });
    if (hasMonth) params.set('bulan', String(bulan));
    const res = await fetch(`${config.apiEndpoint}?${params.toString()}`);
    if (!res.ok) return;
    const rows = await res.json();
    const map = {};
    (rows || []).forEach((r) => {
      const id = r.dusun_id ?? r.desa_id;
      if (id != null) map[id] = r;
    });
    if (isPrev) setPrevYearData(map);
    else {
      setData(map);
      setSaveStatus({});
      setInitialLoading(false);
      // Clear pending buffer + dirty marker — data dari server jadi truth baru.
      pendingChangesRef.current = new Map();
      setDirtyIds(new Set());
      // Bump version — input uncontrolled akan re-mount dengan defaultValue baru.
      setDataVersion((v) => v + 1);
    }
  };

  // handleChange v2: tulis ke ref (tidak trigger re-render). Hanya update
  // state `dirtyIds` saat transisi pertama clean→dirty per dusun.
  const handleChange = (dusunId, key, value) => {
    if (!canEdit) return;
    if (userDusunId != null && Number(dusunId) !== Number(userDusunId)) return;
    const map = pendingChangesRef.current;
    let row = map.get(dusunId);
    if (!row) {
      row = {};
      map.set(dusunId, row);
    }
    row[key] = value;
    // Tandai dusun sebagai dirty (sekali per dusun, tidak per karakter).
    setDirtyIds((prev) => {
      if (prev.has(dusunId)) return prev;
      const next = new Set(prev);
      next.add(dusunId);
      return next;
    });
    // Clear status saved/error sebelumnya (biar banner status update).
    setSaveStatus((prev) => {
      if (!prev[dusunId]) return prev;
      const next = { ...prev };
      delete next[dusunId];
      return next;
    });
  };

  // Helper: ambil snapshot data row final (server data + pending changes overlay).
  const getRowSnapshot = (dusunId) => {
    const base = data[dusunId] || {};
    const pending = pendingChangesRef.current.get(dusunId);
    return pending ? { ...base, ...pending, dusun_id: dusunId } : { ...base, dusun_id: dusunId };
  };

  const getRowIssueCount = (dusunId) => {
    const validation = validateRow(getRowSnapshot(dusunId), leaves, prevYearData[dusunId] || null);
    const issues = countIssues(validation);
    return issues.errors + issues.warnings;
  };

  const _doSaveRow = async (dusunId) => {
    const rowData = getRowSnapshot(dusunId);
    const payload = { dusun_id: dusunId, tahun };
    if (hasMonth) payload.bulan = bulan;
    config.columns.forEach((col) => {
      // v6: semua kolom kirim sebagai string. Server simpan as-is.
      payload[col.key] = String(rowData[col.key] ?? '');
    });
    const res = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan');
    }
    // Commit pending changes ke `data` state lalu hapus dari buffer & dirty set.
    const pending = pendingChangesRef.current.get(dusunId);
    if (pending) {
      setData((prev) => ({
        ...prev,
        [dusunId]: { ...(prev[dusunId] || {}), ...pending, dusun_id: dusunId },
      }));
      pendingChangesRef.current.delete(dusunId);
    }
    setDirtyIds((prev) => {
      if (!prev.has(dusunId)) return prev;
      const next = new Set(prev);
      next.delete(dusunId);
      return next;
    });
  };

  const saveRow = useCallback(async (dusunId) => {
    if (!canEdit) return;
    const scrollSnapshot = captureScrollState();
    setSaving(dusunId);
    try {
      await _doSaveRow(dusunId);
      setSaveStatus((prev) => ({ ...prev, [dusunId]: 'saved' }));
      const issues = getRowIssueCount(dusunId);
      setToast({ type: issues > 0 ? 'warning' : 'success', message: issues > 0 ? `Disimpan dengan ${issues} peringatan` : 'Berhasil disimpan' });
    } catch (err) {
      setSaveStatus((prev) => ({ ...prev, [dusunId]: 'error' }));
      setToast({ type: 'error', message: err.message });
    }
    setSaving(null);
    restoreScrollState(scrollSnapshot);
    if (hasMonth) { setMonthsWithData((prev) => new Set(prev).add(bulan)); }
    setTimeout(() => setToast(null), 3500);
    setTimeout(() => setSaveStatus((prev) => ({ ...prev, [dusunId]: null })), 5000);
  }, [data, prevYearData, tahun, bulan, canEdit, config, leaves, hasMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAll = async () => {
    if (!canEdit) return;
    const scrollSnapshot = captureScrollState();
    const targets = userDusunId != null ? dusun.filter((d) => d.id === Number(userDusunId)) : dusun;
    const warningCount = targets.reduce((sum, d) => sum + getRowIssueCount(d.id), 0);
    if (warningCount > 0 && !window.confirm(`Ada ${warningCount} peringatan validasi. Tetap simpan semua?`)) return;
    setSaving('all');
    let ok = 0, fail = 0;
    for (const d of targets) {
      try { await _doSaveRow(d.id); setSaveStatus((p) => ({ ...p, [d.id]: 'saved' })); ok++; }
      catch { setSaveStatus((p) => ({ ...p, [d.id]: 'error' })); fail++; }
    }
    setSaving(null);
    restoreScrollState(scrollSnapshot);
    if (hasMonth && ok > 0) { setMonthsWithData((prev) => new Set(prev).add(bulan)); }
    setToast({ type: fail === 0 ? 'success' : 'error', message: `Berhasil ${ok}${fail > 0 ? `, gagal ${fail}` : ''}` });
    setTimeout(() => setToast(null), 4000);
  };

  useKeyboardShortcut({ 'ctrl+s': saveAll }, { enabled: canEdit });

  const filteredDusun = dusun.filter((d) => d.nama.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((d) => !onlyIssues || getRowIssueCount(d.id) > 0);
  const dirtyCount = dirtyIds.size;

  // Peringatkan user sebelum menutup/refresh tab kalau masih ada perubahan
  // yang belum disimpan (pendingChangesRef belum di-commit).
  useEffect(() => {
    if (dirtyCount === 0) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyCount]);

  // "Batalkan" — buang pending changes + refresh data dari server.
  const cancelPending = () => {
    pendingChangesRef.current = new Map();
    setDirtyIds(new Set());
    fetchData(tahun);
  };
  const getTotal = (key) => dusun.reduce((sum, d) => {
    // Total pakai snapshot (server data + pending changes overlay)
    const snap = getRowSnapshot(d.id);
    const num = Number(snap?.[key]);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
  const isDusunEditable = (id) => canEdit && (userDusunId == null || Number(id) === Number(userDusunId));

  const totalCols = 2 + leaves.length;

  // Toggle expanded state per dusun (state hidup di parent agar tidak reset
  // tiap kali user ngetik di input — re-render parent jangan unmount card).
  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mobile card render
  const MobileCard = ({ d, i }) => {
    const expanded = expandedIds.has(d.id);
    const rowData = data[d.id] || {};
    const prevRowData = prevYearData[d.id] || null;
    const validation = validateRow(rowData, leaves, prevRowData);
    const { errors, warnings } = countIssues(validation);
    const isSaving = saving === d.id;
    const isSaved = saveStatus[d.id] === 'saved';
    const isDirty = dirtyIds.has(d.id);
    const isError = saveStatus[d.id] === 'error';
    const dusunEditable = isDusunEditable(d.id);
    const filledCount = leaves.filter((c) => Number(rowData[c.key] || 0) > 0).length;

    return (
      <div className={`bg-white rounded-xl border ${isDirty ? 'border-amber-200' : 'border-gray-200'} mb-3 shadow-sm overflow-hidden`} id={`dusun-card-${d.id}`}>
        <button onClick={() => toggleExpanded(d.id)} className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left" style={{ minHeight: 56 }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{i + 1}</span>
            <div className="min-w-0">
              <div className="font-bold text-gray-800 truncate">{d.nama}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{filledCount}/{leaves.length} kolom terisi</span>
                {isDirty && <span className="text-amber-600 font-semibold">• Belum disimpan</span>}
                {isSaved && <span className="text-green-600 font-semibold">• Tersimpan</span>}
                {isError && <span className="text-red-600 font-semibold">• Gagal simpan</span>}
                {!dusunEditable && canEdit && <span className="text-gray-400">• Hanya lihat</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(errors > 0 || warnings > 0) && (
              <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${errors > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                <ExclamationCircle className="w-3 h-3" /> {errors || warnings}
              </span>
            )}
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
            {leaves.map((leaf) => {
              const valObj = validation[leaf.key] || { valid: true };
              const hasError = valObj.severity === 'error';
              const hasWarning = valObj.severity === 'warning';
              const isText = leaf.type === 'text';
              return (
                <div key={leaf.key} className={`flex flex-col ${isText ? 'col-span-2' : ''}`}>
                  <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1" title={leaf.fullLabel || leaf.label}>{leaf.fullLabel || leaf.label}</label>
                  {dusunEditable ? (
                    isText ? (
                      <textarea rows={2}
                        key={`${d.id}-${leaf.key}-${dataVersion}`}
                        className="w-full text-base py-2.5 px-3 rounded-lg border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-primary-500"
                        defaultValue={rowData[leaf.key] ?? ''}
                        onChange={(e) => handleChange(d.id, leaf.key, e.target.value)} />
                    ) : (
                      <input type="text" inputMode="decimal"
                        key={`${d.id}-${leaf.key}-${dataVersion}`}
                        className={`w-full text-sm py-1.5 px-2 rounded-md border outline-none focus:ring-2 focus:ring-primary-500 ${hasError ? 'border-red-300 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}
                        defaultValue={rowData[leaf.key] ?? ''}
                        onChange={(e) => handleChange(d.id, leaf.key, e.target.value)}
                        placeholder="0" />
                    )
                  ) : (
                    <div className="text-sm font-medium text-gray-800">{isText ? (rowData[leaf.key] || '-') : (rowData[leaf.key] ?? '-')}</div>
                  )}
                  {(hasError || hasWarning) && <span className={`text-[10px] mt-0.5 ${hasError ? 'text-red-500' : 'text-amber-500'}`}>{valObj.warning}</span>}
                </div>
              );
            })}

            {dusunEditable && (
              <button onClick={() => saveRow(d.id)} disabled={isSaving}
                className={`w-full mt-2 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${isSaved ? 'bg-green-100 text-green-700' : isError ? 'bg-red-100 text-red-700' : isDirty ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {isSaving ? 'Menyimpan...' : isSaved ? <><CheckCircle className="w-4 h-4" /> Tersimpan</> : <><FloppyDisk className="w-4 h-4" /> Simpan Perubahan</>}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const numColLabel = unitColumnLabel || 'Nama Dusun';

  if (initialLoading) {
    return <TableSkeleton rows={9} cols={Math.min(leaves.length || 6, 8)} />;
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          toast.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ExclamationCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DataPageIcon name={config.icon} className="w-6 h-6" /> {config.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            {config.subtitle}
            {!canEdit && userRole && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full border border-amber-200">
                <Lock className="w-3 h-3" /> Hanya Lihat
              </span>
            )}
            {userDusunId != null && canEdit && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                Scope: {dusun.find((d) => d.id === Number(userDusunId))?.nama || `Dusun #${userDusunId}`}
              </span>
            )}
          </p>
          <div className="mt-2">
            <PeriodWorkflowBadge tableName={config.tableName} tahun={tahun} bulan={hasMonth ? bulan : null} userRole={userRole} canEdit={canEdit} onStatusChange={() => fetchData(tahun)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EditModeSwitcher mode={mode} onChange={setMode} />
          {canEdit && (
            <button onClick={saveAll} disabled={saving === 'all'} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50">
              {saving === 'all' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
              Simpan Semua
            </button>
          )}
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none shadow-sm">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {hasMonth && (
            <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none shadow-sm" aria-label="Pilih bulan" title="Bulan bertanda ● sudah memiliki data">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{monthsWithData.has(i + 1) ? `● ${m}` : m}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Title block (custom per page) */}
      {titleBlock && titleBlock(tahun, hasMonth ? bulan : undefined)}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
          <input type="text" placeholder={`Cari ${unitLabel.toLowerCase()}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm" />
        </div>
        <button
          type="button"
          onClick={() => setOnlyIssues((v) => !v)}
          aria-pressed={onlyIssues}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            onlyIssues ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ExclamationCircle className="w-4 h-4" /> Hanya bermasalah
        </button>
      </div>

      {canEdit && dirtyCount > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <ExclamationCircle className="w-4 h-4" />
            <span>{dirtyCount} {unitLabel.toLowerCase()} memiliki perubahan belum tersimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancelPending} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Batalkan</button>
            <button onClick={saveAll} disabled={saving === 'all'} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
              {saving === 'all' ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          </div>
        </div>
      )}

      <div className="md:hidden">
        {filteredDusun.length > 1 && (
          <div className="sticky top-16 z-20 mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 shadow-sm">
            <span className="text-xs font-medium text-gray-500 flex-shrink-0">Lompat ke:</span>
            <select
              value=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (!id) return;
                setExpandedIds((prev) => new Set(prev).add(id));
                setTimeout(() => {
                  document.getElementById(`dusun-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              aria-label="Lompat ke dusun"
            >
              <option value="">Pilih dusun...</option>
              {filteredDusun.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </div>
        )}
        {filteredDusun.map((d, i) => <MobileCard key={d.id} d={d} i={i} />)}
        {filteredDusun.length === 0 && <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">{unitLabel} tidak ditemukan</div>}
      </div>

      <div className="hidden md:block nested-table bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
        {canEdit && (
          <div className="flex items-center justify-end gap-2 mb-2">
            <span className="text-[11px] text-gray-400">Total di bawah dihitung dari data yang sudah disimpan.</span>
            <button
              onClick={() => setRecalcTick((t) => t + 1)}
              className="px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
              title="Hitung ulang total dari nilai yang sedang Anda ketik (termasuk yang belum disimpan)"
            >
              Hitung ulang total
            </button>
          </div>
        )}
        <div data-preserve-scroll style={{ overflow: 'auto', maxHeight: '78vh' }}>
          <table style={{
            borderCollapse: 'collapse',
            tableLayout: isWord ? 'auto' : 'fixed',
            width: 'max-content',
            minWidth: '100%',
          }}>
            <thead>
              {/* Row 1 — termasuk No + Nama dengan rowSpan = totalDepth */}
              <tr style={{ background: theme.bg, color: theme.fg }}>
                <th rowSpan={totalDepth} style={{
                  position: 'sticky', left: 0, zIndex: 30, background: theme.bg, color: theme.fg,
                  minWidth: 36, padding: 6, border: `1px solid ${theme.borderColor}`, verticalAlign: 'middle',
                }}>No</th>
                <th rowSpan={totalDepth} style={{
                  position: 'sticky', left: 36, zIndex: 30, background: theme.bg, color: theme.fg,
                  minWidth: 130, padding: 6, border: `1px solid ${theme.borderColor}`, verticalAlign: 'middle',
                }}>{numColLabel}</th>
                {headerRows[0].map((c, i) => (
                  <th key={`r1-${i}`}
                    rowSpan={c.rowSpan}
                    colSpan={c.colSpan}
                    style={{
                      padding: c.node.kind === 'leaf' && c.node.vertical ? 0 : 6,
                      border: `1px solid ${theme.borderColor}`,
                      textAlign: 'center', verticalAlign: 'middle',
                      minWidth: c.node.kind === 'leaf' && c.node.vertical ? 32 : 60,
                      background: theme.bg, color: theme.fg,
                    }}
                    title={c.node.fullLabel || c.node.label}
                  >
                    <HeaderCellLabel node={c.node} />
                  </th>
                ))}
              </tr>
              {headerRows.slice(1).map((row, idx) => (
                <tr key={`hr-${idx + 2}`} style={{ background: theme.bg, color: theme.fg }}>
                  {row.map((c, i) => (
                    <th key={`r${idx + 2}-${i}`}
                      rowSpan={c.rowSpan}
                      colSpan={c.colSpan}
                      style={{
                        padding: c.node.kind === 'leaf' && c.node.vertical ? 0 : 4,
                        border: `1px solid ${theme.borderColor}`,
                        textAlign: 'center', verticalAlign: 'middle',
                        minWidth: c.node.kind === 'leaf' && c.node.vertical ? 32 : 60,
                        background: theme.bg, color: theme.fg,
                      }}
                      title={c.node.fullLabel || c.node.label}
                    >
                      <HeaderCellLabel node={c.node} />
                    </th>
                  ))}
                </tr>
              ))}
              {/* Last row — column numbers full width */}
              <tr style={{ background: theme.bg, color: theme.fg }}>
                {Array.from({ length: totalCols }, (_, i) => {
                  const idx = i + 1;
                  const sticky =
                    idx === 1 ? { position: 'sticky', left: 0, zIndex: 30, background: theme.bg, minWidth: 36 } :
                    idx === 2 ? { position: 'sticky', left: 36, zIndex: 30, background: theme.bg, minWidth: 130 } :
                    undefined;
                  return (
                    <th key={`num-${idx}`} style={{
                      ...sticky,
                      border: `1px solid ${theme.borderColor}`,
                      textAlign: 'center', verticalAlign: 'middle',
                      fontSize: 10, fontWeight: 500, color: theme.fg, opacity: 0.85,
                      padding: '2px 4px',
                      background: theme.bg,
                    }}>{idx}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredDusun.map((d, i) => {
                const rowData = data[d.id] || {};
                const prevRowData = prevYearData[d.id] || null;
                const validation = validateRow(rowData, leaves, prevRowData);
                const dusunEditable = isDusunEditable(d.id);
                return (
                  <tr key={d.id} className="group">
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, textAlign: 'center', padding: 4, border: '1px solid #e5e7eb' }} className="group-hover:bg-primary-50/50">{i + 1}</td>
                    <td style={{ position: 'sticky', left: 36, background: '#fff', zIndex: 1, padding: '4px 8px', border: '1px solid #e5e7eb', fontWeight: 500 }} className="group-hover:bg-primary-50/50">{d.nama}</td>
                    {leaves.map((col) => {
                      const valObj = validation[col.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      const isText = col.type === 'text';
                      // Word mode: cell lebih lega, textarea auto-grow.
                      const cellMinWidth = isWord
                        ? (isText ? 220 : 120)
                        : (col.vertical ? 32 : 50);
                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: 2,
                            minWidth: cellMinWidth,
                            border: '1px solid #e5e7eb',
                            verticalAlign: 'top',
                            whiteSpace: isWord ? 'normal' : 'nowrap',
                          }}
                        >
                          {dusunEditable ? (
                            isWord ? (
                              <AutoGrowTextarea
                                key={`${d.id}-${col.key}-${dataVersion}`}
                                defaultValue={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                                placeholder={isText ? '' : '0'}
                                className="w-full text-[13px] py-1.5 px-2 rounded-md border outline-none focus:ring-2 focus:ring-primary-500"
                                style={{
                                  border: hasError ? '1px solid #fca5a5' : hasWarning ? '1px solid #fcd34d' : '1px solid #e5e7eb',
                                  background: hasError ? '#fef2f2' : hasWarning ? '#fffbeb' : '#fff',
                                  textAlign: isText ? 'left' : 'center',
                                  fontFamily: 'inherit',
                                  lineHeight: 1.4,
                                }}
                                title={valObj.warning || col.fullLabel || col.label}
                              />
                            ) : isText ? (
                              <input type="text"
                                key={`${d.id}-${col.key}-${dataVersion}`}
                                style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }}
                                defaultValue={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value)} />
                            ) : (
                              <input
                                key={`${d.id}-${col.key}-${dataVersion}`}
                                type="text"
                                inputMode="decimal"
                                style={{
                                  width: '100%', padding: '2px 4px', fontSize: 12, textAlign: 'center',
                                  border: hasError ? '1px solid #fca5a5' : hasWarning ? '1px solid #fcd34d' : '1px solid #e5e7eb',
                                  borderRadius: 4,
                                  background: hasError ? '#fef2f2' : hasWarning ? '#fffbeb' : '#fff',
                                  outline: 'none',
                                }}
                                defaultValue={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                                placeholder="0"
                                title={valObj.warning || col.fullLabel || col.label}
                              />
                            )
                          ) : (
                            <span style={{
                              display: 'block',
                              textAlign: isText ? 'left' : 'center',
                              fontSize: 12,
                              color: '#6b7280',
                              whiteSpace: isWord ? 'normal' : 'nowrap',
                              padding: isWord ? '4px 6px' : 0,
                            }} title={valObj.warning || ''}>
                              {isText ? (rowData[col.key] || '-') : (rowData[col.key] ?? '-')}
                              {hasWarning && <ExclamationCircle className="w-3 h-3 text-amber-500 inline ml-1" />}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filteredDusun.length === 0 && (
                <tr><td colSpan={totalCols} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>{unitLabel} tidak ditemukan</td></tr>
              )}
              {filteredDusun.length > 0 && (
                <tr style={{ background: '#f0fdf4' }} data-recalc={recalcTick}>
                  <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 1, border: '1px solid #d1fae5' }}></td>
                  <td style={{ position: 'sticky', left: 36, background: '#f0fdf4', zIndex: 1, padding: '6px 8px', border: '1px solid #d1fae5', fontWeight: 700, color: '#065f46' }}>JUMLAH</td>
                  {leaves.map((col) => (
                    <td key={col.key} style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, padding: 4, border: '1px solid #d1fae5', color: '#065f46' }}>
                      {col.type === 'text' ? '-' : getTotal(col.key).toLocaleString('id-ID')}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
