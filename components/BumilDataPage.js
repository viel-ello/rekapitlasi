'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { FloppyDisk, Lock, Search, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { MONTHS } from '@/lib/dataPages';
import { DataPageIcon } from '@/components/DataPageIcon';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';
import { validateRow, countIssues } from '@/lib/validation';
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut';
import PeriodWorkflowBadge from '@/components/PeriodWorkflowBadge';
import EditModeSwitcher from '@/components/EditModeSwitcher';
import ConfirmModal from '@/components/ConfirmModal';
import DensityToggle from '@/components/DensityToggle';
import TableSkeleton from '@/components/TableSkeleton';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import { useEditMode } from '@/lib/useEditMode';
import { useDensity } from '@/lib/useDensity';
import { captureScrollState, restoreScrollState } from '@/lib/preserveScroll';
import { getDusunCached } from '@/lib/fetchDusun';

const BUMIL_FORM_TITLE = 'REKAPITULASI DATA/BUKU CATATAN IBU HAMIL,MELAHIRKAN,NIFAS,IBU MENINGGAL,KELAHIRAN BAYI,BAYI MENINGGAL DAN KEMATIAN BALITA';
const BUMIL_ORG_TITLE = 'TP PKK DESA BELIKURIP';

// Layout sesuai Annex A — gunakan akte_l/akte_p (kolom baru), bukan akte_ada/akte_tidak.
const BUMIL_COLUMN_GROUPS = [
  {
    title: 'JUMLAH',
    children: [
      { key: 'jml_rt', label: 'RT' },
      { key: 'jml_rw', label: 'RW' },
      { key: 'jml_dasa_wisma', label: 'Dawis' },
    ],
  },
  {
    title: 'JUMLAH IBU',
    children: [
      { key: 'ibu_hamil', label: 'Hamil' },
      { key: 'ibu_melahirkan', label: 'Melahirkan' },
      { key: 'ibu_nifas', label: 'Nifas' },
      { key: 'ibu_meninggal', label: 'Meninggal' },
    ],
  },
  {
    title: 'JUMLAH BAYI',
    children: [
      {
        title: 'Lahir',
        children: [
          { key: 'bayi_lahir_l', label: 'L' },
          { key: 'bayi_lahir_p', label: 'P' },
        ],
      },
      {
        title: 'Akte Kelahiran',
        children: [
          { key: 'akte_l', label: 'L' },
          { key: 'akte_p', label: 'P' },
        ],
      },
      {
        title: 'Meninggal',
        children: [
          { key: 'bayi_meninggal_l', label: 'L' },
          { key: 'bayi_meninggal_p', label: 'P' },
        ],
      },
    ],
  },
  {
    title: 'Jml Balita Meninggal',
    children: [
      { key: 'balita_meninggal_l', label: 'L' },
      { key: 'balita_meninggal_p', label: 'P' },
    ],
  },
];

function resolveBumilGroups(columns) {
  const byKey = new Map(columns.map((column) => [column.key, column]));

  return BUMIL_COLUMN_GROUPS.map((group) => {
    const children = group.children
      .map((child) => {
        if (child.key) {
          const column = byKey.get(child.key);
          if (!column) return null;
          return {
            ...column,
            label: column.renamed ? column.label : child.label,
            fullLabel: column.label,
          };
        }

        const nestedChildren = child.children
          .map((leaf) => {
            const column = byKey.get(leaf.key);
            if (!column) return null;
            return {
              ...column,
              label: column.renamed ? column.label : leaf.label,
              fullLabel: column.label,
            };
          })
          .filter(Boolean);

        if (nestedChildren.length === 0) return null;
        return {
          title: child.title,
          children: nestedChildren,
          colSpan: nestedChildren.length,
        };
      })
      .filter(Boolean);

    const colSpan = children.reduce((sum, child) => sum + (child.key ? 1 : child.colSpan), 0);
    if (colSpan === 0) return null;

    return {
      title: group.title,
      children,
      colSpan,
    };
  }).filter(Boolean);
}

function flattenBumilGroups(groups) {
  return groups.flatMap((group) => group.children.flatMap((child) => child.key ? [child] : child.children));
}

export default function BumilDataPage({ config }) {
  const { mode, setMode, isWord } = useEditMode();
  const { density, setDensity, isCompact } = useDensity();
  const [dusun, setDusun] = useState([]);
  const [data, setData] = useState({});
  const [prevData, setPrevData] = useState({});
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
  const [monthsWithData, setMonthsWithData] = useState(() => new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [confirmSaveAll, setConfirmSaveAll] = useState(null);

  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(config.columns, overrides).filter((c) => !c.hidden),
    [config.columns, overrides]
  );
  const bumilGroups = useMemo(() => resolveBumilGroups(effectiveColumns), [effectiveColumns]);
  const visibleColumns = useMemo(() => flattenBumilGroups(bumilGroups), [bumilGroups]);

  useEffect(() => { fetchDusun(); checkPermission(); fetchOverrides(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (dusun.length > 0) { fetchData(); fetchPrevData(); fetchMonthsWithData(); } }, [tahun, bulan, dusun]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPermission = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const me = await res.json();
        setUserRole(me.role);
        setCanEdit(me.permissions.includes(config.tableName));
        setUserDusunId(me.dusun_id ?? null);
      }
    } catch (err) {
      console.error('Permission check failed', err);
      setCanEdit(false);
    }
  };

  const fetchDusun = async () => {
    try {
      const list = await getDusunCached();
      if (list.length) setDusun(list);
    } catch (err) { console.error('Failed to fetch dusun', err); }
  };

  const fetchOverrides = async () => {
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${config.tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch (err) { console.error('Failed to fetch overrides', err); }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${config.apiEndpoint}?tahun=${tahun}&bulan=${bulan}`);
      if (!res.ok) return;
      const rows = await res.json();
      const map = {};
      (rows || []).forEach((r) => {
        const id = r.dusun_id ?? r.desa_id;
        if (id != null) map[id] = r;
      });
      setData(map);
      setSaveStatus({});
      setInitialLoading(false);
    } catch (err) { console.error('Failed to fetch data', err); setInitialLoading(false); }
  };

  const fetchPrevData = async () => {
    try {
      const res = await fetch(`${config.apiEndpoint}?tahun=${tahun - 1}&bulan=${bulan}`);
      if (!res.ok) return;
      const rows = await res.json();
      const map = {};
      (rows || []).forEach((r) => {
        const id = r.dusun_id ?? r.desa_id;
        if (id != null) map[id] = r;
      });
      setPrevData(map);
    } catch { /* silent */ }
  };

  // Kumpulkan bulan mana saja yang sudah punya data (untuk penanda di dropdown).
  const fetchMonthsWithData = async () => {
    try {
      const res = await fetch(`${config.apiEndpoint}?tahun=${tahun}`);
      if (!res.ok) return;
      const rows = await res.json();
      const set = new Set();
      (rows || []).forEach((r) => { if (r.bulan != null) set.add(Number(r.bulan)); });
      setMonthsWithData(set);
    } catch { /* silent */ }
  };

  const handleChange = (dusunId, key, value, type = 'text') => {
    if (!canEdit) return;
    if (userDusunId != null && Number(dusunId) !== Number(userDusunId)) return;
    // v6: simpan as-is (string), supaya kolom angka boleh diisi huruf juga.
    setData((prev) => ({
      ...prev,
      [dusunId]: {
        ...(prev[dusunId] || {}),
        dusun_id: dusunId,
        [key]: value,
      },
    }));
    setSaveStatus((prev) => ({ ...prev, [dusunId]: 'dirty' }));
  };

  const getRowIssueCount = (dusunId) => {
    const validation = validateRow(data[dusunId] || {}, visibleColumns, prevData[dusunId] || null);
    const issues = countIssues(validation);
    return issues.errors + issues.warnings;
  };

  const _doSaveRow = async (dusunId) => {
    const rowData = data[dusunId] || {};
    const payload = { dusun_id: dusunId, tahun, bulan };
    config.columns.forEach((col) => {
      // v6: kirim semua sebagai string. Server simpan as-is.
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
  };

  const saveRow = useCallback(async (dusunId) => {
    if (!canEdit) return;
    const scrollSnapshot = captureScrollState();
    setSaving(dusunId);
    try {
      await _doSaveRow(dusunId);
      setSaveStatus((prev) => ({ ...prev, [dusunId]: 'saved' }));
      const issues = getRowIssueCount(dusunId);
      setToast({
        type: issues > 0 ? 'warning' : 'success',
        message: issues > 0 ? `Data disimpan dengan ${issues} peringatan` : 'Data berhasil disimpan',
      });
    } catch (err) {
      setSaveStatus((prev) => ({ ...prev, [dusunId]: 'error' }));
      setToast({ type: 'error', message: err.message });
    }
    setSaving(null);
    restoreScrollState(scrollSnapshot);
    setMonthsWithData((prev) => new Set(prev).add(bulan));
    setTimeout(() => setToast(null), 4000);
    setTimeout(() => setSaveStatus((prev) => ({ ...prev, [dusunId]: null })), 5000);
  }, [data, prevData, tahun, bulan, canEdit, config, visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const _performSaveAll = async () => {
    const scrollSnapshot = captureScrollState();
    const targets = userDusunId != null ? dusun.filter((d) => d.id === Number(userDusunId)) : dusun;
    setSaving('all');
    let ok = 0, fail = 0;
    for (const d of targets) {
      try {
        await _doSaveRow(d.id);
        setSaveStatus((prev) => ({ ...prev, [d.id]: 'saved' }));
        ok++;
      } catch {
        setSaveStatus((prev) => ({ ...prev, [d.id]: 'error' }));
        fail++;
      }
    }
    setSaving(null);
    restoreScrollState(scrollSnapshot);
    if (ok > 0) setMonthsWithData((prev) => new Set(prev).add(bulan));
    setToast({ type: fail === 0 ? 'success' : 'error', message: `Berhasil ${ok}${fail > 0 ? `, gagal ${fail}` : ''}` });
    setTimeout(() => setToast(null), 4000);
  };

  const saveAll = async () => {
    if (!canEdit) return;
    const targets = userDusunId != null ? dusun.filter((d) => d.id === Number(userDusunId)) : dusun;
    const warningCount = targets.reduce((sum, d) => sum + getRowIssueCount(d.id), 0);
    if (warningCount > 0) {
      setConfirmSaveAll({ warningCount });
      return;
    }
    await _performSaveAll();
  };

  useKeyboardShortcut({ 'ctrl+s': saveAll }, { enabled: canEdit });

  const filteredDusun = dusun.filter((d) => d.nama.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((d) => !onlyIssues || getRowIssueCount(d.id) > 0);
  const dirtyCount = Object.values(saveStatus).filter((s) => s === 'dirty').length;

  // Peringatkan sebelum menutup tab kalau masih ada perubahan belum disimpan.
  useEffect(() => {
    if (dirtyCount === 0) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyCount]);

  const getTotal = (key) => dusun.reduce((sum, d) => {
    const num = Number(data[d.id]?.[key]);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
  const isDusunEditable = (id) => canEdit && (userDusunId == null || Number(id) === Number(userDusunId));

  if (initialLoading) {
    return <TableSkeleton rows={9} cols={Math.min(visibleColumns.length || 6, 8)} />;
  }

  const MobileCard = ({ d, i }) => {
    const rowData = data[d.id] || {};
    const prevRowData = prevData[d.id] || null;
    const validation = validateRow(rowData, visibleColumns, prevRowData);
    const { errors, warnings } = countIssues(validation);
    const isSaving = saving === d.id;
    const isSaved = saveStatus[d.id] === 'saved';
    const isDirty = saveStatus[d.id] === 'dirty';
    const isError = saveStatus[d.id] === 'error';
    const dusunEditable = isDusunEditable(d.id);

    return (
      <div id={`dusun-card-${d.id}`} className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-card">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md mr-2">{i + 1}</span>
            <span className="font-bold text-gray-800">{d.nama}</span>
          </div>
          <div className="flex gap-2">
            {(errors > 0 || warnings > 0) && (
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${errors > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                <ExclamationCircle className="w-3 h-3" /> {errors || warnings}
              </span>
            )}
            {dusunEditable && (
              <button onClick={() => saveRow(d.id)} disabled={isSaving}
                className={`p-1.5 rounded-lg transition-colors ${isSaved ? 'bg-green-100 text-green-600' : isDirty ? 'bg-amber-100 text-amber-700' : isError ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'}`}
                aria-label={`Simpan data ${d.nama}`}>
                {isSaving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isSaved ? <CheckCircle className="w-4 h-4" /> : <FloppyDisk className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {bumilGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">{group.title}</div>
              <div className="grid grid-cols-2 gap-3">
                {group.children.flatMap((child) => child.key ? [child] : child.children).map((col) => {
                  const valObj = validation[col.key] || { valid: true };
                  const hasError = valObj.severity === 'error';
                  const hasWarning = valObj.severity === 'warning';
                  const isText = col.type === 'text';
                  return (
                    <div key={col.key} className={`flex flex-col ${isText ? 'col-span-2' : ''}`}>
                      <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1" title={col.fullLabel || col.label}>{col.fullLabel || col.label}</label>
                      {dusunEditable ? (
                        isText ? (
                          <input type="text"
                            className="w-full text-sm py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-primary-500"
                            value={rowData[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value, 'text')} onBlur={() => saveRow(d.id)} />
                        ) : (
                          <input type="text" inputMode="decimal" placeholder="0"
                            className={`w-full text-sm py-1.5 px-2 rounded-md border outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${hasError ? 'border-red-300 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}
                            value={rowData[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value)} onBlur={() => saveRow(d.id)} />
                        )
                      ) : (
                        <div className="text-sm font-medium text-gray-800">{isText ? (rowData[col.key] || '-') : (rowData[col.key] ?? '-')}</div>
                      )}
                      {(hasError || hasWarning) && <span className={`text-[10px] mt-0.5 ${hasError ? 'text-red-500' : 'text-amber-500'}`}>{valObj.warning}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <ConfirmModal
        isOpen={!!confirmSaveAll}
        type="warning"
        title="Simpan semua perubahan?"
        message={`Ada ${confirmSaveAll?.warningCount || 0} peringatan validasi. Tetap simpan semua?`}
        confirmText="Ya, simpan semua"
        cancelText="Batal"
        onConfirm={() => { setConfirmSaveAll(null); _performSaveAll(); }}
        onCancel={() => setConfirmSaveAll(null)}
      />
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DataPageIcon name={config.icon} className="w-7 h-7" /> {config.title}
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
            <PeriodWorkflowBadge
              tableName={config.tableName}
              tahun={tahun}
              bulan={bulan}
              userRole={userRole}
              canEdit={canEdit}
              onStatusChange={fetchData}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EditModeSwitcher mode={mode} onChange={setMode} />
          <DensityToggle density={density} onChange={setDensity} />
          {canEdit && (
            <button onClick={saveAll} disabled={saving === 'all'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50">
              {saving === 'all' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
              Simpan Semua
            </button>
          )}
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Pilih bulan" title="Bulan bertanda ● sudah memiliki data">
            {MONTHS.map((b, i) => <option key={b} value={i + 1}>{monthsWithData.has(i + 1) ? `● ${b}` : b}</option>)}
          </select>
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Pilih tahun">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
          <input type="text" placeholder="Cari dusun..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-center text-sm font-bold uppercase leading-snug text-gray-900">
          <div>{BUMIL_FORM_TITLE}</div>
          <div>{BUMIL_ORG_TITLE}</div>
        </div>
        <div className="mt-4 grid max-w-xs grid-cols-[4.5rem_1rem_1fr] gap-y-1 text-sm font-semibold text-gray-700">
          <span>BULAN</span>
          <span>:</span>
          <span>{MONTHS[bulan - 1]}</span>
          <span>TAHUN</span>
          <span>:</span>
          <span>{tahun}</span>
        </div>
      </div>

      {canEdit && dirtyCount > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <ExclamationCircle className="w-4 h-4" />
            <span>{dirtyCount} dusun memiliki perubahan belum tersimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Batalkan</button>
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
        {filteredDusun.length === 0 && <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Dusun tidak ditemukan</div>}
      </div>

      <div className="hidden md:block glass rounded-3xl p-4">
        <div className="data-table-wrapper" style={{ maxHeight: '75vh' }}>
          <table className={`data-table ${isWord ? 'mode-word' : ''} ${isCompact ? 'density-compact' : ''}`}>
            <thead>
              <tr>
                <th rowSpan={3} style={{ position: 'sticky', left: 0, zIndex: 4, background: '#f9fafb', minWidth: 40 }}>NO</th>
                <th rowSpan={3} style={{ position: 'sticky', left: 40, zIndex: 4, background: '#f9fafb', minWidth: 150 }}>Nama Dusun</th>
                {bumilGroups.map((group) => (
                  <th key={group.title} colSpan={group.colSpan} className="text-center">{group.title}</th>
                ))}
                <th rowSpan={3} className="text-center" style={{ minWidth: 120 }}>Keterangan</th>
              </tr>
              <tr>
                {bumilGroups.flatMap((group) => group.children.map((child) => (
                  child.key ? (
                    <th key={child.key} rowSpan={2} className="text-center" style={{ minWidth: 74 }} title={child.fullLabel || child.label}>
                      {child.label}{child.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
                    </th>
                  ) : (
                    <th key={`${group.title}-${child.title}`} colSpan={child.colSpan} className="text-center" style={{ minWidth: 74 }}>{child.title}</th>
                  )
                )))}
              </tr>
              <tr>
                {bumilGroups.flatMap((group) => group.children.flatMap((child) => (
                  child.key ? [] : child.children.map((leaf) => (
                    <th key={leaf.key} className="text-center" style={{ minWidth: 64 }} title={leaf.fullLabel || leaf.label}>
                      {leaf.label}{leaf.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
                    </th>
                  ))
                )))}
              </tr>
              <tr>
                {Array.from({ length: visibleColumns.length + 3 }, (_, index) => (
                  <th
                    key={`bumil-number-${index + 1}`}
                    className="text-center text-[10px] text-gray-500"
                    style={index === 0
                      ? { position: 'sticky', left: 0, zIndex: 4, background: '#f9fafb', minWidth: 40 }
                      : index === 1
                        ? { position: 'sticky', left: 40, zIndex: 4, background: '#f9fafb', minWidth: 150 }
                        : undefined}
                  >
                    {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDusun.map((d, i) => {
                const rowData = data[d.id] || {};
                const prevRowData = prevData[d.id] || null;
                const validation = validateRow(rowData, visibleColumns, prevRowData);
                const dusunEditable = isDusunEditable(d.id);
                const rowStatus = saving === d.id ? 'Menyimpan...' :
                  saveStatus[d.id] === 'saved' ? 'Tersimpan' :
                  saveStatus[d.id] === 'dirty' ? 'Belum disimpan' :
                  saveStatus[d.id] === 'error' ? 'Gagal simpan' : '';
                return (
                  <tr key={d.id} className="group">
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, textAlign: 'center' }} className="group-hover:bg-primary-50/50">{i + 1}</td>
                    <td className="col-desa group-hover:bg-primary-50/50" style={{ left: 40 }}>{d.nama}</td>
                    {visibleColumns.map((col) => {
                      const valObj = validation[col.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      const isText = col.type === 'text';
                      const inputClass = `cell-input ${hasError ? '!bg-red-50 !border-red-300 !text-red-900' : hasWarning ? '!bg-amber-50 !border-amber-300 !text-amber-900' : ''}`;
                      return (
                        <td key={col.key} className="relative">
                          {dusunEditable ? (
                            isWord ? (
                              <AutoGrowTextarea
                                className={inputClass}
                                value={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                                onBlur={() => saveRow(d.id)}
                                placeholder={isText ? '' : '0'}
                                title={valObj.warning || ''}
                                style={{ textAlign: isText ? 'left' : 'center' }}
                                aria-label={`${d.nama} ${col.fullLabel || col.label}`}
                              />
                            ) : isText ? (
                              <input type="text" className={inputClass} value={rowData[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value, 'text')} onBlur={() => saveRow(d.id)} aria-label={`${d.nama} ${col.fullLabel || col.label}`} />
                            ) : (
                              <input type="text" inputMode="decimal" placeholder="0" className={inputClass} value={rowData[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value)} onBlur={() => saveRow(d.id)} title={valObj.warning || ''} aria-label={`${d.nama} ${col.fullLabel || col.label}`} />
                            )
                          ) : (
                            <span className="block text-center px-2 py-1 text-gray-500" title={valObj.warning || ''}>
                              {isText ? (rowData[col.key] || '-') : (rowData[col.key] ?? '-')}
                              {hasWarning && <ExclamationCircle className="w-3 h-3 text-amber-500 inline ml-1" />}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className={`text-center text-xs font-medium ${
                      saveStatus[d.id] === 'saved' ? 'text-green-600' :
                      saveStatus[d.id] === 'dirty' ? 'text-amber-700' :
                      saveStatus[d.id] === 'error' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {rowStatus}
                    </td>
                  </tr>
                );
              })}
              {filteredDusun.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="text-center py-8 text-gray-500">Dusun tidak ditemukan</td>
                </tr>
              )}
              {filteredDusun.length > 0 && (
                <tr className="row-total">
                  <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 1 }}></td>
                  <td className="col-desa" style={{ left: 40, background: '#f0fdf4' }}>JUMLAH</td>
                  {visibleColumns.map((col) => <td key={col.key} className="text-center font-bold">{col.type === 'text' ? '-' : getTotal(col.key).toLocaleString('id-ID')}</td>)}
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
