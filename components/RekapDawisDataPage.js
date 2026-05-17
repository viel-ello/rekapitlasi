'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { FloppyDisk, Lock, Search, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { DataPageIcon } from '@/components/DataPageIcon';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';
import { validateRow, countIssues } from '@/lib/validation';
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut';
import PeriodWorkflowBadge from '@/components/PeriodWorkflowBadge';

/**
 * Rekapitulasi Dawis — layout pixel-perfect sesuai Annex F.
 * 34 kolom, 4-level header dengan grup besar:
 *   Identitas (kolom 3-7) flat
 *   Jml Angg keluarga (kolom 8-18): Total L/P, Balita L/P, PUS, WUS, Ibu Hamil, Ibu menyusui, Lansia, 3 Buta, Berkebutuhan khusus
 *   Jumlah Rumah (kolom 19-24): Sehat, Tidak sehat, Memiliki tempt sampah, Memiliki spal, Memiliki jamban, Menempel stiker
 *   Sumber Air Keluarga (kolom 25-28): PDAM, Sumber, Sungai, Dll
 *   Makanan (kolom 29-30): Beras, Non Beras
 *   Wrg yg mengikuti (kolom 31-33): UP2K, Pemanfaatan lahan, Kes lngk
 *   KET (JKN/BPJS) (kolom 34) flat
 */

const REKAP_DAWIS_TITLE = 'CATATAN DATA DAN KEGIATAN WARGA';
const REKAP_DAWIS_ORG = 'TP PKK DESA BELIKURIP KECAMATAN BATURETNO';

const REKAP_DAWIS_GROUPS = [
  // Single-cell columns (di-render dengan rowSpan=3 di header)
  { kind: 'leaf', key: 'jml_rw', label: 'Jml RW' },
  { kind: 'leaf', key: 'jml_rt', label: 'Jml RT' },
  { kind: 'leaf', key: 'jml_dawis', label: 'Jml dawis' },
  { kind: 'leaf', key: 'jml_krt', label: 'Jml KRT' },
  { kind: 'leaf', key: 'jml_kk', label: 'Jml KK' },
  // Group: Jml Angg keluarga
  {
    kind: 'group',
    title: 'Jml Angg keluarga',
    children: [
      {
        title: 'Total',
        children: [
          { key: 'jml_anggota_l', label: 'L' },
          { key: 'jml_anggota_p', label: 'P' },
        ],
      },
      {
        title: 'Balita',
        children: [
          { key: 'balita_l', label: 'L' },
          { key: 'balita_p', label: 'P' },
        ],
      },
      { key: 'pus', label: 'PUS' },
      { key: 'wus', label: 'WUS' },
      { key: 'ibu_hamil', label: 'Ibu Hamil' },
      { key: 'ibu_menyusui', label: 'Ibu menyusui' },
      { key: 'lansia', label: 'Lansia' },
      { key: 'tiga_buta', label: '3 Buta' },
      { key: 'berkebutuhan_khusus', label: 'Berkebutuhan khusus' },
    ],
  },
  // Group: Jumlah Rumah
  {
    kind: 'group',
    title: 'Jumlah Rumah',
    children: [
      { key: 'rumah_sehat', label: 'Sehat' },
      { key: 'rumah_kurang_sehat', label: 'Tidak sehat' },
      { key: 'punya_tempat_sampah', label: 'Memiliki tempt sampah' },
      { key: 'punya_spal', label: 'Memiliki spal' },
      { key: 'jamban', label: 'Memiliki jamban' },
      { key: 'stiker_p4k', label: 'Menempel stiker' },
    ],
  },
  // Group: Sumber Air Keluarga
  {
    kind: 'group',
    title: 'Sumber Air Keluarga',
    children: [
      { key: 'air_pdam', label: 'PDAM' },
      { key: 'air_sumur', label: 'Sumber' },
      { key: 'air_sungai', label: 'Sungai' },
      { key: 'air_dll', label: 'Dll' },
    ],
  },
  // Group: Makanan
  {
    kind: 'group',
    title: 'Makanan',
    children: [
      { key: 'makan_beras', label: 'Beras' },
      { key: 'makan_non_beras', label: 'Non Beras' },
    ],
  },
  // Group: Wrg yg mengikuti
  {
    kind: 'group',
    title: 'Wrg yg mengikuti',
    children: [
      { key: 'ikut_up2k', label: 'UP2K' },
      { key: 'ikut_pekarangan', label: 'Pemanfaatan lahan' },
      { key: 'ikut_kesling', label: 'Kes lngk' },
    ],
  },
  // KET single-cell
  { kind: 'leaf', key: 'jkn_bpjs', label: 'KET (JKN/BPJS)' },
];

/** Resolve groups dengan applied column overrides; skip kolom hidden. */
function resolveGroups(columns) {
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const out = [];

  for (const g of REKAP_DAWIS_GROUPS) {
    if (g.kind === 'leaf') {
      const col = byKey.get(g.key);
      if (!col || col.hidden) continue;
      out.push({
        kind: 'leaf',
        ...col,
        label: col.renamed ? col.label : g.label,
        fullLabel: col.label,
      });
      continue;
    }

    // group
    const children = [];
    for (const child of g.children) {
      if (child.key) {
        const col = byKey.get(child.key);
        if (!col || col.hidden) continue;
        children.push({
          kind: 'leaf-in-group',
          ...col,
          label: col.renamed ? col.label : child.label,
          fullLabel: col.label,
        });
      } else {
        // sub-group (Total/Balita)
        const subChildren = [];
        for (const leaf of child.children) {
          const col = byKey.get(leaf.key);
          if (!col || col.hidden) continue;
          subChildren.push({
            ...col,
            label: col.renamed ? col.label : leaf.label,
            fullLabel: col.label,
          });
        }
        if (subChildren.length === 0) continue;
        children.push({
          kind: 'sub-group',
          title: child.title,
          children: subChildren,
          colSpan: subChildren.length,
        });
      }
    }
    if (children.length === 0) continue;
    const colSpan = children.reduce((sum, c) => sum + (c.kind === 'sub-group' ? c.colSpan : 1), 0);
    out.push({ kind: 'group', title: g.title, children, colSpan });
  }
  return out;
}

function flattenLeaves(groups) {
  const leaves = [];
  for (const g of groups) {
    if (g.kind === 'leaf') {
      leaves.push(g);
    } else {
      for (const child of g.children) {
        if (child.kind === 'sub-group') {
          for (const leaf of child.children) leaves.push(leaf);
        } else {
          leaves.push(child);
        }
      }
    }
  }
  return leaves;
}

export default function RekapDawisDataPage({ config }) {
  const [dusun, setDusun] = useState([]);
  const [data, setData] = useState({});
  const [prevYearData, setPrevYearData] = useState({});
  const [tahun, setTahun] = useState(new Date().getFullYear());

  const [saving, setSaving] = useState(null);
  const [saveStatus, setSaveStatus] = useState({});
  const [toast, setToast] = useState(null);

  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userDusunId, setUserDusunId] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(config.columns, overrides).filter((c) => !c.hidden),
    [config.columns, overrides]
  );
  const groups = useMemo(() => resolveGroups(effectiveColumns), [effectiveColumns]);
  const leaves = useMemo(() => flattenLeaves(groups), [groups]);

  useEffect(() => { fetchDusun(); checkPermission(); fetchOverrides(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dusun.length > 0) {
      fetchData(tahun);
      fetchData(tahun - 1, true);
    }
  }, [tahun, dusun]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const res = await fetch('/api/dusun');
      if (res.ok) setDusun(await res.json());
    } catch { /* silent */ }
  };

  const fetchOverrides = async () => {
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${config.tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch { /* silent */ }
  };

  const fetchData = async (targetYear, isPrev = false) => {
    const res = await fetch(`${config.apiEndpoint}?tahun=${targetYear}`);
    if (!res.ok) return;
    const rows = await res.json();
    const map = {};
    (rows || []).forEach((r) => {
      const id = r.dusun_id ?? r.desa_id;
      if (id != null) map[id] = r;
    });
    if (isPrev) setPrevYearData(map);
    else { setData(map); setSaveStatus({}); }
  };

  const handleChange = (dusunId, key, value) => {
    if (!canEdit) return;
    if (userDusunId != null && Number(dusunId) !== Number(userDusunId)) return;
    setData((prev) => ({
      ...prev,
      [dusunId]: { ...(prev[dusunId] || {}), dusun_id: dusunId, [key]: value === '' ? '' : Number(value) },
    }));
    setSaveStatus((prev) => ({ ...prev, [dusunId]: 'dirty' }));
  };

  const getRowIssueCount = (dusunId) => {
    const validation = validateRow(data[dusunId] || {}, leaves, prevYearData[dusunId] || null);
    const issues = countIssues(validation);
    return issues.errors + issues.warnings;
  };

  const _doSaveRow = async (dusunId) => {
    const rowData = data[dusunId] || {};
    const payload = { dusun_id: dusunId, tahun };
    config.columns.forEach((col) => { payload[col.key] = Number(rowData[col.key] || 0); });
    const res = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan');
    }
  };

  const saveRow = useCallback(async (dusunId) => {
    if (!canEdit) return;
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
    setTimeout(() => setToast(null), 3500);
    setTimeout(() => setSaveStatus((prev) => ({ ...prev, [dusunId]: null })), 5000);
  }, [data, prevYearData, tahun, canEdit, config, leaves]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAll = async () => {
    if (!canEdit) return;
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
    setToast({ type: fail === 0 ? 'success' : 'error', message: `Berhasil ${ok}${fail > 0 ? `, gagal ${fail}` : ''}` });
    setTimeout(() => setToast(null), 4000);
  };

  useKeyboardShortcut({ 'ctrl+s': saveAll }, { enabled: canEdit });

  const filteredDusun = dusun.filter((d) => d.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  const dirtyCount = Object.values(saveStatus).filter((s) => s === 'dirty').length;
  const getTotal = (key) => dusun.reduce((sum, d) => sum + (Number(data[d.id]?.[key]) || 0), 0);
  const isDusunEditable = (id) => canEdit && (userDusunId == null || Number(id) === Number(userDusunId));

  // Header rendering ───────────────────────────────────────────────────────
  // Total kolom di tabel = 2 (NO + Nama Dusun) + sum(leaves) + 0 (KET sudah di-leaf)
  const dataColCount = leaves.length;
  const totalCols = 2 + dataColCount;

  // Row 1: NO + Nama Dusun (rowSpan=3) + group titles + leaf top-level
  // Row 2: sub-groups (Total/Balita) + rowspan=2 untuk leaf di bawah group
  // Row 3: leaf labels (L/P)

  const renderHeaderRow1 = () => {
    const cells = [];
    cells.push(<th key="no" rowSpan={3} className="sticky left-0 z-30 bg-gray-50" style={{ minWidth: 36 }}>NO</th>);
    cells.push(<th key="nama" rowSpan={3} className="sticky bg-gray-50" style={{ left: 36, minWidth: 130, zIndex: 30 }}>Nama Dusun</th>);

    for (const g of groups) {
      if (g.kind === 'leaf') {
        cells.push(
          <th key={g.key} rowSpan={3} className="text-center" style={{ minWidth: 70 }} title={g.fullLabel || g.label}>
            {g.label}
            {g.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
          </th>
        );
      } else {
        cells.push(
          <th key={g.title} colSpan={g.colSpan} className="text-center">
            {g.title}
          </th>
        );
      }
    }
    return <tr>{cells}</tr>;
  };

  const renderHeaderRow2 = () => {
    const cells = [];
    for (const g of groups) {
      if (g.kind === 'leaf') continue; // sudah rowSpan=3
      for (const child of g.children) {
        if (child.kind === 'sub-group') {
          cells.push(<th key={`${g.title}-${child.title}`} colSpan={child.colSpan} className="text-center" style={{ minWidth: 60 }}>{child.title}</th>);
        } else {
          // leaf in group → rowSpan=2 (turun ke baris 3 juga)
          cells.push(
            <th key={child.key} rowSpan={2} className="text-center align-bottom" style={{ minWidth: 64, writingMode: child.label.length > 10 ? 'vertical-rl' : 'horizontal-tb', transform: child.label.length > 10 ? 'rotate(180deg)' : 'none', height: child.label.length > 10 ? 80 : 'auto' }} title={child.fullLabel || child.label}>
              {child.label}
              {child.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
            </th>
          );
        }
      }
    }
    return <tr>{cells}</tr>;
  };

  const renderHeaderRow3 = () => {
    const cells = [];
    for (const g of groups) {
      if (g.kind === 'leaf') continue;
      for (const child of g.children) {
        if (child.kind === 'sub-group') {
          for (const leaf of child.children) {
            cells.push(
              <th key={leaf.key} className="text-center" style={{ minWidth: 50 }} title={leaf.fullLabel || leaf.label}>
                {leaf.label}
              </th>
            );
          }
        }
        // leaf-in-group sudah rowSpan=2, skip di row 3
      }
    }
    return <tr>{cells}</tr>;
  };

  // Row 4: column number reference (1, 2, 3, ...)
  const renderHeaderRow4 = () => {
    const cells = [];
    for (let i = 1; i <= totalCols; i++) {
      const stickyStyle = i === 1
        ? { position: 'sticky', left: 0, zIndex: 30, background: '#f9fafb', minWidth: 36 }
        : i === 2
          ? { position: 'sticky', left: 36, zIndex: 30, background: '#f9fafb', minWidth: 130 }
          : undefined;
      cells.push(
        <th key={i} className="text-center text-[10px] text-gray-500 font-medium" style={stickyStyle}>{i}</th>
      );
    }
    return <tr>{cells}</tr>;
  };

  // Mobile card — accordion dengan group as section
  const MobileCard = ({ d, i }) => {
    const [expanded, setExpanded] = useState(false);
    const rowData = data[d.id] || {};
    const prevRowData = prevYearData[d.id] || null;
    const validation = validateRow(rowData, leaves, prevRowData);
    const { errors, warnings } = countIssues(validation);
    const isSaving = saving === d.id;
    const isSaved = saveStatus[d.id] === 'saved';
    const isDirty = saveStatus[d.id] === 'dirty';
    const isError = saveStatus[d.id] === 'error';
    const dusunEditable = isDusunEditable(d.id);
    const filledCount = leaves.filter((c) => Number(rowData[c.key] || 0) > 0).length;

    return (
      <div className={`bg-white rounded-xl border ${isDirty ? 'border-amber-200' : 'border-gray-200'} mb-3 shadow-sm overflow-hidden`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          style={{ minHeight: 56 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md flex-shrink-0">{i + 1}</span>
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
          <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
            {groups.map((g) => {
              if (g.kind === 'leaf') {
                const valObj = validation[g.key] || { valid: true };
                const hasError = valObj.severity === 'error';
                const hasWarning = valObj.severity === 'warning';
                return (
                  <div key={g.key} className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex flex-col col-span-2">
                      <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1">{g.label}</label>
                      {dusunEditable ? (
                        <input type="number" inputMode="numeric"
                          className={`w-full text-base py-2.5 px-3 rounded-lg border outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${hasError ? 'border-red-300 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
                          style={{ minHeight: 44 }}
                          value={rowData[g.key] ?? ''} onChange={(e) => handleChange(d.id, g.key, e.target.value)} onBlur={() => saveRow(d.id)} min="0" />
                      ) : (
                        <div className="text-base font-medium text-gray-800 py-2.5 px-3">{(rowData[g.key] || 0).toLocaleString('id-ID')}</div>
                      )}
                    </div>
                  </div>
                );
              }
              // group
              const childLeaves = g.children.flatMap((c) => c.kind === 'sub-group' ? c.children : [c]);
              return (
                <div key={g.title}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">{g.title}</div>
                  <div className="grid grid-cols-2 gap-3">
                    {childLeaves.map((leaf) => {
                      const valObj = validation[leaf.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      return (
                        <div key={leaf.key} className="flex flex-col">
                          <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1" title={leaf.fullLabel || leaf.label}>{leaf.fullLabel || leaf.label}</label>
                          {dusunEditable ? (
                            <input type="number" min="0"
                              className={`w-full text-sm py-1.5 px-2 rounded-md border outline-none focus:ring-2 focus:ring-primary-500 ${hasError ? 'border-red-300 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}
                              value={rowData[leaf.key] ?? ''} onChange={(e) => handleChange(d.id, leaf.key, e.target.value)} onBlur={() => saveRow(d.id)} />
                          ) : (
                            <div className="text-sm font-medium text-gray-800">{(rowData[leaf.key] || 0).toLocaleString('id-ID')}</div>
                          )}
                          {(hasError || hasWarning) && <span className={`text-[10px] mt-0.5 ${hasError ? 'text-red-500' : 'text-amber-500'}`}>{valObj.warning}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {dusunEditable && (
              <button
                onClick={() => saveRow(d.id)}
                disabled={isSaving}
                className={`w-full mt-2 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${isSaved ? 'bg-green-100 text-green-700' : isError ? 'bg-red-100 text-red-700' : isDirty ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {isSaving ? <>Menyimpan...</> : isSaved ? <><CheckCircle className="w-4 h-4" /> Tersimpan</> : <><FloppyDisk className="w-4 h-4" /> Simpan Perubahan</>}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

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

      {/* Header sesuai gambar */}
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
            <PeriodWorkflowBadge tableName={config.tableName} tahun={tahun} userRole={userRole} canEdit={canEdit} onStatusChange={() => fetchData(tahun)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button onClick={saveAll} disabled={saving === 'all'} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50">
              {saving === 'all' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
              Simpan Semua
            </button>
          )}
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none shadow-sm">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Title block sesuai gambar */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-center text-sm font-bold uppercase leading-snug text-gray-900">
          <div>{REKAP_DAWIS_TITLE}</div>
          <div>{REKAP_DAWIS_ORG}</div>
          <div>TAHUN {tahun}</div>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
        <input type="text" placeholder="Cari dusun..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm" />
      </div>

      {canEdit && dirtyCount > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <ExclamationCircle className="w-4 h-4" />
            <span>{dirtyCount} dusun memiliki perubahan belum tersimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData(tahun)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Batalkan</button>
            <button onClick={saveAll} disabled={saving === 'all'} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
              {saving === 'all' ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile */}
      <div className="md:hidden">
        {filteredDusun.map((d, i) => <MobileCard key={d.id} d={d} i={i} />)}
        {filteredDusun.length === 0 && <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Dusun tidak ditemukan</div>}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="data-table-wrapper" style={{ maxHeight: '78vh' }}>
          <table className="data-table">
            <thead>
              {renderHeaderRow1()}
              {renderHeaderRow2()}
              {renderHeaderRow3()}
              {renderHeaderRow4()}
            </thead>
            <tbody>
              {filteredDusun.map((d, i) => {
                const rowData = data[d.id] || {};
                const prevRowData = prevYearData[d.id] || null;
                const validation = validateRow(rowData, leaves, prevRowData);
                const dusunEditable = isDusunEditable(d.id);
                return (
                  <tr key={d.id} className="group">
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, textAlign: 'center' }} className="group-hover:bg-primary-50/50">{i + 1}</td>
                    <td className="col-desa group-hover:bg-primary-50/50" style={{ left: 36 }}>{d.nama}</td>
                    {leaves.map((col) => {
                      const valObj = validation[col.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      const inputClass = `cell-input ${hasError ? '!bg-red-50 !border-red-300' : hasWarning ? '!bg-amber-50 !border-amber-300' : ''}`;
                      return (
                        <td key={col.key} className="relative">
                          {dusunEditable ? (
                            <input type="number" className={inputClass} value={rowData[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value)} onBlur={() => saveRow(d.id)} min="0" title={valObj.warning || col.fullLabel || col.label} aria-label={`${d.nama} ${col.fullLabel || col.label}`} />
                          ) : (
                            <span className="block text-center px-2 py-1 text-gray-500" title={valObj.warning || ''}>
                              {(rowData[col.key] || 0).toLocaleString('id-ID')}
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
                <tr><td colSpan={totalCols} className="text-center py-8 text-gray-500">Dusun tidak ditemukan</td></tr>
              )}
              {filteredDusun.length > 0 && (
                <tr className="row-total">
                  <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 1 }}></td>
                  <td className="col-desa" style={{ left: 36, background: '#f0fdf4' }}>Jumlah</td>
                  {leaves.map((col) => <td key={col.key} className="text-center font-bold">{getTotal(col.key).toLocaleString('id-ID')}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
