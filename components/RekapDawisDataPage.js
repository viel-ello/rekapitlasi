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
 * Rekapitulasi Dawis — layout sesuai Annex F (gambar referensi).
 *
 * Struktur header 3 baris:
 *  Row 1: NO | Nama Dusun | Jml RW | Jml RT | Jml dawis | Jml KRT | Jml KK | <group titles> | KET
 *  Row 2: <sub-titles inside group>
 *  Row 3: <leaf labels: L/P>
 *  Row 4: column numbers 1..34
 *
 * Total kolom = 34. Setiap leaf jadi kolom data.
 */

const REKAP_DAWIS_TITLE = 'CATATAN DATA DAN KEGIATAN WARGA';
const REKAP_DAWIS_ORG = 'TP PKK DESA BELIKURIP KECAMATAN BATURETNO';

// Layout struktural (kunci ke key DB). label=teks tampilan; vertical=true → label di-rotate 90°.
const LAYOUT = [
  // Kolom 3-7: leaf langsung di bawah Row 1
  { kind: 'leaf', key: 'jml_rw', label: 'Jml RW' },
  { kind: 'leaf', key: 'jml_rt', label: 'Jml RT' },
  { kind: 'leaf', key: 'jml_dawis', label: 'Jml dawis' },
  { kind: 'leaf', key: 'jml_krt', label: 'Jml KRT' },
  { kind: 'leaf', key: 'jml_kk', label: 'Jml KK' },
  // Kolom 8-18: Jml Angg keluarga (11 kolom)
  {
    kind: 'group',
    title: 'Jml Angg keluarga',
    children: [
      { kind: 'sub', title: 'Total', leaves: [
        { key: 'jml_anggota_l', label: 'L' },
        { key: 'jml_anggota_p', label: 'P' },
      ]},
      { kind: 'sub', title: 'Balita', leaves: [
        { key: 'balita_l', label: 'L' },
        { key: 'balita_p', label: 'P' },
      ]},
      { kind: 'leaf', key: 'pus', label: 'PUS' },
      { kind: 'leaf', key: 'wus', label: 'WUS' },
      { kind: 'leaf', key: 'ibu_hamil', label: 'Ibu Hamil', vertical: true },
      { kind: 'leaf', key: 'ibu_menyusui', label: 'Ibu menyusui', vertical: true },
      { kind: 'leaf', key: 'lansia', label: 'Lansia' },
      { kind: 'leaf', key: 'tiga_buta', label: '3 Buta' },
      { kind: 'leaf', key: 'berkebutuhan_khusus', label: 'Berkebutuhan khusus', vertical: true },
    ],
  },
  // Kolom 19-24: Jumlah Rumah (6 kolom, kebanyakan vertical)
  {
    kind: 'group',
    title: 'Jumlah Rumah',
    children: [
      { kind: 'leaf', key: 'rumah_sehat', label: 'Sehat', vertical: true },
      { kind: 'leaf', key: 'rumah_kurang_sehat', label: 'Tidak sehat', vertical: true },
      { kind: 'leaf', key: 'punya_tempat_sampah', label: 'Memiliki tempt sampah', vertical: true },
      { kind: 'leaf', key: 'punya_spal', label: 'Memiliki spal', vertical: true },
      { kind: 'leaf', key: 'jamban', label: 'Memiliki jamban', vertical: true },
      { kind: 'leaf', key: 'stiker_p4k', label: 'Menempel stiker', vertical: true },
    ],
  },
  // Kolom 25-28: Sumber Air Keluarga
  {
    kind: 'group',
    title: 'Sumber Air Keluarga',
    children: [
      { kind: 'leaf', key: 'air_pdam', label: 'PDAM' },
      { kind: 'leaf', key: 'air_sumur', label: 'Sumber' },
      { kind: 'leaf', key: 'air_sungai', label: 'Sungai' },
      { kind: 'leaf', key: 'air_dll', label: 'Dll' },
    ],
  },
  // Kolom 29-30: Makanan
  {
    kind: 'group',
    title: 'Makanan',
    children: [
      { kind: 'leaf', key: 'makan_beras', label: 'Beras' },
      { kind: 'leaf', key: 'makan_non_beras', label: 'Non Beras' },
    ],
  },
  // Kolom 31-33: Wrg yg mengikuti
  {
    kind: 'group',
    title: 'Wrg yg mengikuti',
    children: [
      { kind: 'leaf', key: 'ikut_up2k', label: 'UP2K' },
      { kind: 'leaf', key: 'ikut_pekarangan', label: 'Pemanfaatan lahan', vertical: true },
      { kind: 'leaf', key: 'ikut_kesling', label: 'Kes lngk' },
    ],
  },
  // Kolom 34: KET (JKN/BPJS) flat
  { kind: 'leaf', key: 'jkn_bpjs', label: 'KET (JKN/BPJS)' },
];

// Resolve LAYOUT dengan applied column overrides; skip kolom hidden
function resolveLayout(columns) {
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const apply = (def) => {
    const col = byKey.get(def.key);
    if (!col || col.hidden) return null;
    return {
      ...def,
      ...col,
      label: col.renamed ? col.label : def.label,
      fullLabel: col.label,
    };
  };

  const resolved = [];
  for (const item of LAYOUT) {
    if (item.kind === 'leaf') {
      const r = apply(item);
      if (r) resolved.push(r);
      continue;
    }
    // group
    const children = [];
    for (const c of item.children) {
      if (c.kind === 'leaf') {
        const r = apply(c);
        if (r) children.push(r);
      } else if (c.kind === 'sub') {
        const subLeaves = c.leaves.map(apply).filter(Boolean);
        if (subLeaves.length > 0) {
          children.push({ kind: 'sub', title: c.title, leaves: subLeaves });
        }
      }
    }
    if (children.length > 0) {
      const colSpan = children.reduce((s, c) => s + (c.kind === 'sub' ? c.leaves.length : 1), 0);
      resolved.push({ kind: 'group', title: item.title, children, colSpan });
    }
  }
  return resolved;
}

function flattenLeaves(layout) {
  const leaves = [];
  for (const item of layout) {
    if (item.kind === 'leaf') leaves.push(item);
    else for (const c of item.children) {
      if (c.kind === 'sub') for (const l of c.leaves) leaves.push(l);
      else leaves.push(c);
    }
  }
  return leaves;
}

// Hitung berapa "level" header diperlukan (3 kalau ada sub-group, 2 kalau cuma group)
function maxHeaderDepth(layout) {
  let depth = 1;
  for (const item of layout) {
    if (item.kind === 'group') {
      depth = Math.max(depth, 2);
      for (const c of item.children) {
        if (c.kind === 'sub') depth = Math.max(depth, 3);
      }
    }
  }
  return depth;
}

// Tampilkan label vertical (di-rotate 90° via CSS transform pada inner span — robust di table)
function VerticalLabel({ children, height = 110 }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '4px 0' }}>
      <div
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          whiteSpace: 'nowrap',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        {children}
      </div>
    </div>
  );
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
  const layout = useMemo(() => resolveLayout(effectiveColumns), [effectiveColumns]);
  const leaves = useMemo(() => flattenLeaves(layout), [layout]);
  const headerDepth = useMemo(() => maxHeaderDepth(layout), [layout]);

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

  // Render label leaf — rotated kalau vertical=true
  const LeafLabel = ({ leaf, height }) => {
    if (leaf.vertical) {
      return <VerticalLabel height={height || 110}>{leaf.label}{leaf.renamed && <span className="ml-1 text-amber-500">*</span>}</VerticalLabel>;
    }
    return (
      <span style={{ fontSize: 11, fontWeight: 600 }}>
        {leaf.label}{leaf.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
      </span>
    );
  };

  // Total kolom = 2 (NO+Nama) + leaves.length
  const totalCols = 2 + leaves.length;
  const verticalRowHeight = 130;

  // Build header row 1: NO(rowSpan=depth), Nama(rowSpan=depth), then layout items
  const renderHeaderRow1 = () => (
    <tr>
      <th rowSpan={headerDepth + 1} className="bg-gray-50 sticky left-0" style={{ minWidth: 36, zIndex: 30, padding: 6 }}>NO</th>
      <th rowSpan={headerDepth + 1} className="bg-gray-50 sticky" style={{ left: 36, minWidth: 130, zIndex: 30, padding: 6 }}>Nama Dusun</th>
      {layout.map((item) => {
        if (item.kind === 'leaf') {
          return (
            <th key={item.key} rowSpan={headerDepth + 1} className="text-center" style={{ minWidth: item.vertical ? 36 : 70, padding: 4 }} title={item.fullLabel || item.label}>
              <LeafLabel leaf={item} height={item.vertical ? verticalRowHeight + 60 : undefined} />
            </th>
          );
        }
        return (
          <th key={item.title} colSpan={item.colSpan} className="text-center" style={{ padding: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{item.title}</span>
          </th>
        );
      })}
    </tr>
  );

  // Row 2: sub-titles for groups, OR rowSpan=2 for direct leaves under group
  const renderHeaderRow2 = () => {
    const cells = [];
    for (const item of layout) {
      if (item.kind === 'leaf') continue;
      for (const child of item.children) {
        if (child.kind === 'sub') {
          cells.push(
            <th key={`${item.title}-${child.title}`} colSpan={child.leaves.length} className="text-center" style={{ minWidth: 50, padding: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{child.title}</span>
            </th>
          );
        } else {
          // leaf in group → rowSpan=2 (turun ke row 3 juga)
          cells.push(
            <th key={child.key} rowSpan={2} className="text-center align-bottom" style={{ minWidth: child.vertical ? 36 : 60, padding: 2, height: child.vertical ? verticalRowHeight : 'auto' }} title={child.fullLabel || child.label}>
              <LeafLabel leaf={child} height={child.vertical ? verticalRowHeight - 10 : undefined} />
            </th>
          );
        }
      }
    }
    return <tr>{cells}</tr>;
  };

  // Row 3: leaf labels under sub-groups (e.g., L/P)
  const renderHeaderRow3 = () => {
    const cells = [];
    for (const item of layout) {
      if (item.kind === 'leaf') continue;
      for (const child of item.children) {
        if (child.kind === 'sub') {
          for (const leaf of child.leaves) {
            cells.push(
              <th key={leaf.key} className="text-center" style={{ minWidth: 44, padding: 4 }} title={leaf.fullLabel || leaf.label}>
                <LeafLabel leaf={leaf} />
              </th>
            );
          }
        }
        // leaf-in-group sudah rowSpan=2, skip di row 3
      }
    }
    return <tr>{cells}</tr>;
  };

  // Row 4: column number reference
  const renderHeaderRow4 = () => {
    const cells = [];
    for (let i = 1; i <= totalCols; i++) {
      const sticky =
        i === 1 ? { position: 'sticky', left: 0, zIndex: 30, background: '#f9fafb', minWidth: 36 } :
        i === 2 ? { position: 'sticky', left: 36, zIndex: 30, background: '#f9fafb', minWidth: 130 } :
        undefined;
      cells.push(
        <th key={`num-${i}`} className="text-center" style={{ ...sticky, fontSize: 10, color: '#6b7280', fontWeight: 500, padding: '2px 0' }}>{i}</th>
      );
    }
    return <tr>{cells}</tr>;
  };

  // Mobile card render
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
        <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left" style={{ minHeight: 56 }}>
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
          <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
            {layout.map((item) => {
              if (item.kind === 'leaf') {
                const valObj = validation[item.key] || { valid: true };
                const hasError = valObj.severity === 'error';
                const hasWarning = valObj.severity === 'warning';
                return (
                  <div key={item.key} className="flex flex-col">
                    <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1">{item.label}</label>
                    {dusunEditable ? (
                      <input type="number" inputMode="numeric"
                        className={`w-full text-base py-2.5 px-3 rounded-lg border outline-none focus:ring-2 focus:ring-primary-500 ${hasError ? 'border-red-300 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
                        style={{ minHeight: 44 }}
                        value={rowData[item.key] ?? ''} onChange={(e) => handleChange(d.id, item.key, e.target.value)} onBlur={() => saveRow(d.id)} min="0" />
                    ) : (
                      <div className="text-base font-medium text-gray-800 py-2.5 px-3">{(rowData[item.key] || 0).toLocaleString('id-ID')}</div>
                    )}
                  </div>
                );
              }
              const childLeaves = item.children.flatMap((c) => c.kind === 'sub' ? c.leaves : [c]);
              return (
                <div key={item.title}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">{item.title}</div>
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

      <div className="md:hidden">
        {filteredDusun.map((d, i) => <MobileCard key={d.id} d={d} i={i} />)}
        {filteredDusun.length === 0 && <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Dusun tidak ditemukan</div>}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
        <div style={{ overflow: 'auto', maxHeight: '78vh' }}>
          <table className="data-table" style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              {renderHeaderRow1()}
              {headerDepth >= 2 && renderHeaderRow2()}
              {headerDepth >= 3 && renderHeaderRow3()}
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
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, textAlign: 'center', padding: 4 }} className="group-hover:bg-primary-50/50">{i + 1}</td>
                    <td className="col-desa group-hover:bg-primary-50/50" style={{ left: 36, padding: '4px 8px' }}>{d.nama}</td>
                    {leaves.map((col) => {
                      const valObj = validation[col.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      const inputClass = `cell-input ${hasError ? '!bg-red-50 !border-red-300' : hasWarning ? '!bg-amber-50 !border-amber-300' : ''}`;
                      return (
                        <td key={col.key} className="relative" style={{ padding: 2, minWidth: col.vertical ? 36 : 50 }}>
                          {dusunEditable ? (
                            <input type="number" className={inputClass} style={{ width: '100%', padding: '2px 4px', fontSize: 12, textAlign: 'center' }}
                              value={rowData[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value)} onBlur={() => saveRow(d.id)} min="0" title={valObj.warning || col.fullLabel || col.label} />
                          ) : (
                            <span className="block text-center" style={{ fontSize: 12, color: '#6b7280' }} title={valObj.warning || ''}>
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
                  <td className="col-desa" style={{ left: 36, background: '#f0fdf4', padding: '6px 8px' }}>Jumlah</td>
                  {leaves.map((col) => <td key={col.key} className="text-center font-bold" style={{ fontSize: 12, padding: 4 }}>{getTotal(col.key).toLocaleString('id-ID')}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
