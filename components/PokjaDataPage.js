'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Lock, FloppyDisk, Search, ExclamationCircle, CheckCircle } from 'flowbite-react-icons/outline';
import { validateRow, countIssues } from '@/lib/validation';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut';
import PeriodWorkflowBadge from '@/components/PeriodWorkflowBadge';
import EditModeSwitcher from '@/components/EditModeSwitcher';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import { useEditMode } from '@/lib/useEditMode';
import { captureScrollState, restoreScrollState } from '@/lib/preserveScroll';

/**
 * Reusable data table component dengan role-based access + inline validation.
 *
 * Migration v5: unit data dusun (sebelumnya desa). Endpoint baru `/api/dusun`,
 * label UI "Dusun".
 */
export default function PokjaDataPage({ title, subtitle, icon, apiEndpoint, columns, tableName }) {
  const { mode, setMode, isWord } = useEditMode();
  const [dusun, setDusun] = useState([]);
  const [data, setData] = useState({});
  const [prevYearData, setPrevYearData] = useState({});
  const [tahun, setTahun] = useState(new Date().getFullYear());

  const [saving, setSaving] = useState(null); // 'all' or dusunId
  const [saveStatus, setSaveStatus] = useState({}); // { [dusunId]: 'dirty' | 'saved' | 'error' }
  const [toast, setToast] = useState(null);

  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userDusunId, setUserDusunId] = useState(null);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [overrides, setOverrides] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');

  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(columns, overrides).filter((c) => !c.hidden),
    [columns, overrides]
  );

  useEffect(() => {
    fetchDusun();
    checkPermission();
    fetchDynamicColumns();
    fetchOverrides();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dusun.length > 0) {
      fetchData(tahun);
      fetchData(tahun - 1, true); // fetch prev year for validation
    }
  }, [tahun, dusun]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPermission = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const me = await res.json();
        setUserRole(me.role);
        setCanEdit(me.permissions.includes(tableName));
        setUserDusunId(me.dusun_id ?? null);
      }
    } catch {
      setCanEdit(false);
    }
  };

  const fetchDusun = async () => {
    const res = await fetch('/api/dusun');
    const list = await res.json();
    setDusun(list);
  };

  const fetchDynamicColumns = async () => {
    if (!tableName) return;
    try {
      const res = await fetch(`/api/admin/columns?table_name=${tableName}`);
      if (res.ok) setDynamicColumns(await res.json());
    } catch {
      // silent
    }
  };

  const fetchOverrides = async () => {
    if (!tableName) return;
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch {
      // silent
    }
  };

  const fetchData = async (targetYear, isPrev = false) => {
    const res = await fetch(`${apiEndpoint}?tahun=${targetYear}`);
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
    }
  };

  const handleChange = (dusunId, key, value, isDynamic = false, type = 'text') => {
    if (!canEdit) return;
    // Row-level: kalau role kader-dusun, hanya boleh edit dusunnya sendiri
    if (userDusunId != null && Number(dusunId) !== Number(userDusunId)) return;

    // v6: semua kolom data tabel data_* sekarang fleksibel teks. Type 'number'
    // hanya dipakai untuk kolom dinamis (custom_columns) yang diset numerik.
    let parsedValue = value;
    if (isDynamic && type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }

    setData((prev) => {
      const row = prev[dusunId] || {};
      if (isDynamic) {
        return {
          ...prev,
          [dusunId]: {
            ...row,
            dusun_id: dusunId,
            custom_columns: { ...(row.custom_columns || {}), [key]: parsedValue },
          },
        };
      }
      return {
        ...prev,
        [dusunId]: { ...row, dusun_id: dusunId, [key]: parsedValue },
      };
    });

    setSaveStatus((prev) => ({ ...prev, [dusunId]: 'dirty' }));
  };

  const getRowIssueCount = (dusunId) => {
    const validation = validateRow(data[dusunId] || {}, effectiveColumns, prevYearData[dusunId] || null);
    const issues = countIssues(validation);
    return issues.errors + issues.warnings;
  };

  const _doSaveRow = async (dusunId) => {
    const rowData = data[dusunId] || {};
    const payload = { dusun_id: dusunId, tahun, custom_columns: {} };

    // v6: kirim semua nilai sebagai string. Server simpan as-is. Validator
    // hanya cap length & strip control chars.
    columns.forEach((col) => {
      payload[col.key] = String(rowData[col.key] ?? '');
    });

    dynamicColumns.forEach((col) => {
      const val = rowData.custom_columns?.[col.column_key];
      payload.custom_columns[col.column_key] = col.column_type === 'number' ? Number(val || 0) : (val || '');
    });

    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan data');
    }
  };

  const saveRow = useCallback(async (dusunId) => {
    if (!canEdit) return;
    const scrollSnapshot = captureScrollState();
    setSaving(dusunId);
    try {
      await _doSaveRow(dusunId);
      setSaveStatus((prev) => ({ ...prev, [dusunId]: 'saved' }));
      const issueCount = getRowIssueCount(dusunId);
      setToast({
        type: issueCount > 0 ? 'warning' : 'success',
        message: issueCount > 0 ? `Data disimpan dengan ${issueCount} peringatan` : 'Data berhasil disimpan',
      });
    } catch (err) {
      setSaveStatus((prev) => ({ ...prev, [dusunId]: 'error' }));
      setToast({ type: 'error', message: err.message });
    }
    setSaving(null);
    restoreScrollState(scrollSnapshot);
    setTimeout(() => setToast(null), 3000);
    setTimeout(() => setSaveStatus((prev) => ({ ...prev, [dusunId]: null })), 5000);
  }, [data, prevYearData, tahun, apiEndpoint, columns, effectiveColumns, canEdit, dynamicColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAll = async () => {
    if (!canEdit) return;
    const scrollSnapshot = captureScrollState();
    const targets = userDusunId != null ? dusun.filter((d) => d.id === Number(userDusunId)) : dusun;
    const warningCount = targets.reduce((sum, d) => sum + getRowIssueCount(d.id), 0);
    if (warningCount > 0 && !window.confirm(`Ada ${warningCount} peringatan validasi. Tetap simpan semua perubahan?`)) {
      return;
    }

    setSaving('all');
    let successCount = 0;
    let failCount = 0;

    for (const d of targets) {
      try {
        await _doSaveRow(d.id);
        setSaveStatus((prev) => ({ ...prev, [d.id]: 'saved' }));
        successCount++;
      } catch {
        setSaveStatus((prev) => ({ ...prev, [d.id]: 'error' }));
        failCount++;
      }
    }

    setSaving(null);
    restoreScrollState(scrollSnapshot);
    if (failCount === 0) {
      setToast({ type: 'success', message: `Berhasil menyimpan semua data (${successCount} dusun)` });
    } else {
      setToast({ type: 'error', message: `Berhasil ${successCount}, Gagal ${failCount}` });
    }
    setTimeout(() => setToast(null), 4000);
  };

  useKeyboardShortcut({ 'ctrl+s': saveAll }, { enabled: canEdit });

  const getTotal = (key, isDynamic = false, type = 'number') => {
    if (type !== 'number') return '-';
    if (isDynamic) {
      return dusun.reduce((sum, d) => sum + (Number(data[d.id]?.custom_columns?.[key]) || 0), 0);
    }
    // v6: kolom data flexible — coerce dengan toleransi (string non-numerik = 0)
    return dusun.reduce((sum, d) => {
      const raw = data[d.id]?.[key];
      const num = Number(raw);
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);
  };

  const filteredDusun = dusun.filter((d) => d.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  const dirtyCount = Object.values(saveStatus).filter((s) => s === 'dirty').length;
  const validationSummary = filteredDusun.reduce(
    (acc, d) => {
      const validation = validateRow(data[d.id] || {}, effectiveColumns, prevYearData[d.id] || null);
      const issues = countIssues(validation);
      acc.errors += issues.errors;
      acc.warnings += issues.warnings;
      acc.infos += issues.infos;
      return acc;
    },
    { errors: 0, warnings: 0, infos: 0 }
  );

  const isDusunEditable = (dusunId) => {
    if (!canEdit) return false;
    if (userDusunId == null) return true;
    return Number(dusunId) === Number(userDusunId);
  };

  // Mobile card view
  const MobileCard = ({ d, i }) => {
    const [expanded, setExpanded] = useState(false);
    const rowData = data[d.id] || {};
    const prevRowData = prevYearData[d.id] || null;
    const validation = validateRow(rowData, effectiveColumns, prevRowData);
    const { errors, warnings } = countIssues(validation);
    const isSaving = saving === d.id;
    const isSaved = saveStatus[d.id] === 'saved';
    const isDirty = saveStatus[d.id] === 'dirty';
    const isError = saveStatus[d.id] === 'error';
    const filledCount = effectiveColumns.filter((c) => Number(rowData[c.key] || 0) > 0).length;
    const dusunEditable = isDusunEditable(d.id);

    return (
      <div className={`bg-white rounded-xl border ${isDirty ? 'border-amber-200' : 'border-gray-200'} mb-3 shadow-sm overflow-hidden`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          style={{ minHeight: 56 }}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md flex-shrink-0">{i + 1}</span>
            <div className="min-w-0">
              <div className="font-bold text-gray-800 truncate">{d.nama}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{filledCount}/{effectiveColumns.length} kolom terisi</span>
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
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3 mt-3">
              {effectiveColumns.map((col) => {
                const valObj = validation[col.key] || { valid: true };
                const hasError = valObj.severity === 'error';
                const hasWarning = valObj.severity === 'warning';
                const isText = col.type === 'text';
                return (
                  <div key={col.key} className={`flex flex-col ${isText ? 'col-span-2' : ''}`}>
                    <label htmlFor={`${d.id}-${col.key}`} className="text-[10px] uppercase font-semibold text-gray-500 mb-1">
                      {col.label}
                    </label>
                    {dusunEditable ? (
                      isText ? (
                        <textarea
                          id={`${d.id}-${col.key}`}
                          rows={2}
                          className="w-full text-base py-2.5 px-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500"
                          value={rowData[col.key] ?? ''}
                          onChange={(e) => handleChange(d.id, col.key, e.target.value, false, 'text')}
                          onBlur={() => saveRow(d.id)}
                        />
                      ) : (
                        <input
                          id={`${d.id}-${col.key}`}
                          type="text"
                          inputMode="decimal"
                          className={`w-full text-base py-2.5 px-3 rounded-lg border outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                            hasError ? 'border-red-300 bg-red-50 text-red-900' :
                            hasWarning ? 'border-amber-300 bg-amber-50 text-amber-900' :
                            'border-gray-200 bg-gray-50 focus:bg-white'
                          }`}
                          style={{ minHeight: 44 }}
                          value={rowData[col.key] ?? ''}
                          onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                          onBlur={() => saveRow(d.id)}
                          placeholder="0"
                        />
                      )
                    ) : (
                      <div className="text-base font-medium text-gray-800 py-2.5 px-3">
                        {isText ? (rowData[col.key] || '-') : (rowData[col.key] ?? '-')}
                      </div>
                    )}
                    {(hasError || hasWarning) && (
                      <span className={`text-[10px] mt-1 ${hasError ? 'text-red-500' : 'text-amber-600'}`}>{valObj.warning}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {dusunEditable && (
              <button
                onClick={() => saveRow(d.id)}
                disabled={isSaving}
                className={`w-full mt-4 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isSaved ? 'bg-green-100 text-green-700' :
                  isError ? 'bg-red-100 text-red-700' :
                  isDirty ? 'bg-primary-600 hover:bg-primary-700 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}
                style={{ minHeight: 44 }}
                aria-label={`Simpan data ${d.nama}`}
              >
                {isSaving ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Menyimpan...</> :
                 isSaved ? <><CheckCircle className="w-4 h-4" /> Tersimpan</> :
                 <><FloppyDisk className="w-4 h-4" /> Simpan Perubahan</>}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          toast.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ExclamationCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {icon} {title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            {subtitle}
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
              tableName={tableName}
              tahun={tahun}
              userRole={userRole}
              canEdit={canEdit}
              onStatusChange={() => fetchData(tahun)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EditModeSwitcher mode={mode} onChange={setMode} />
          {canEdit && (
            <button
              onClick={saveAll}
              disabled={saving === 'all'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {saving === 'all' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
              Simpan Semua
            </button>
          )}
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tools Row */}
      <div className="mb-4 relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Cari dusun..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
        />
      </div>

      {(validationSummary.errors > 0 || validationSummary.warnings > 0 || validationSummary.infos > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ExclamationCircle className="w-4 h-4" />
          <span className="font-semibold">Validasi:</span>
          {validationSummary.errors > 0 && <span>{validationSummary.errors} error</span>}
          {validationSummary.warnings > 0 && <span>{validationSummary.warnings} warning</span>}
          {validationSummary.infos > 0 && <span>{validationSummary.infos} kolom belum diisi</span>}
        </div>
      )}

      {canEdit && dirtyCount > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <ExclamationCircle className="w-4 h-4" />
            <span>{dirtyCount} dusun memiliki perubahan belum tersimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchData(tahun); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Batalkan
            </button>
            <button
              onClick={saveAll}
              disabled={saving === 'all'}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {saving === 'all' ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile View (<768px) */}
      <div className="md:hidden">
        {filteredDusun.map((d, i) => <MobileCard key={d.id} d={d} i={i} />)}
        {filteredDusun.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Dusun tidak ditemukan</div>
        )}
      </div>

      {/* Desktop Table View (>=768px) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="data-table-wrapper" style={{ maxHeight: '75vh' }}>
          <table className={`data-table relative ${isWord ? 'mode-word' : ''}`}>
            <thead className="sticky top-0 z-20">
              <tr>
                <th rowSpan={2} style={{ position: 'sticky', left: 0, zIndex: 30, background: '#f9fafb', minWidth: 40 }}>No</th>
                <th rowSpan={2} style={{ position: 'sticky', left: 40, zIndex: 30, background: '#f9fafb', minWidth: 130 }}>Nama Dusun</th>
                <th colSpan={effectiveColumns.length} className="text-center bg-gray-50">Kolom Standar</th>
                {dynamicColumns.length > 0 && <th colSpan={dynamicColumns.length} className="text-center text-primary-700 bg-primary-50/40">Kolom Dinamis</th>}
                {canEdit && <th rowSpan={2} className="text-center sticky right-0 z-30" style={{ minWidth: 60, background: '#f9fafb' }}>Aksi</th>}
              </tr>
              <tr>
                {effectiveColumns.map((col) => (
                  <th key={col.key} className="text-center" style={{ minWidth: 80 }} title={col.renamed ? `Asli: ${col.originalLabel}` : undefined}>
                    {col.label}
                    {col.renamed && <span className="ml-1 text-[9px] text-amber-500" aria-hidden="true">*</span>}
                  </th>
                ))}
                {dynamicColumns.map((col) => <th key={`dyn-${col.column_key}`} className="text-center text-primary-700 bg-primary-50/30" style={{ minWidth: 100 }}>{col.column_label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredDusun.map((d, i) => {
                const rowData = data[d.id] || {};
                const prevRowData = prevYearData[d.id] || null;
                const validation = validateRow(rowData, effectiveColumns, prevRowData);
                const dusunEditable = isDusunEditable(d.id);

                return (
                  <tr key={d.id} className="group">
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 10, textAlign: 'center' }} className="group-hover:bg-primary-50/50 transition-colors">{i + 1}</td>
                    <td className="col-desa group-hover:bg-primary-50/50 transition-colors" style={{ left: 40 }}>{d.nama}</td>
                    {effectiveColumns.map((col) => {
                      const valObj = validation[col.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      const isText = col.type === 'text';
                      const inputClass = `cell-input ${hasError ? '!bg-red-50 !border-red-300 !text-red-900 focus:!ring-red-500' : hasWarning ? '!bg-amber-50 !border-amber-300 !text-amber-900 focus:!ring-amber-500' : ''}`;

                      return (
                        <td key={col.key} className="relative">
                          {dusunEditable ? (
                            isWord ? (
                              <AutoGrowTextarea
                                className={inputClass}
                                value={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value, false, isText ? 'text' : 'mixed')}
                                onBlur={() => saveRow(d.id)}
                                placeholder={isText ? '' : '0'}
                                title={valObj.warning || ''}
                                style={{ textAlign: isText ? 'left' : 'center' }}
                              />
                            ) : isText ? (
                              <input
                                type="text"
                                className={inputClass}
                                value={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value, false, 'text')}
                                onBlur={() => saveRow(d.id)}
                                title={valObj.warning || ''}
                              />
                            ) : (
                              <input
                                type="text"
                                inputMode="decimal"
                                className={inputClass}
                                value={rowData[col.key] ?? ''}
                                onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                                onBlur={() => saveRow(d.id)}
                                title={valObj.warning || ''}
                                placeholder="0"
                              />
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
                    {dynamicColumns.map((col) => (
                      <td key={`dyn-${col.column_key}`} className="bg-primary-50/10">
                        {dusunEditable ? (
                          <input
                            type={col.column_type === 'number' ? 'number' : 'text'}
                            className="cell-input !text-primary-800"
                            value={data[d.id]?.custom_columns?.[col.column_key] ?? ''}
                            onChange={(e) => handleChange(d.id, col.column_key, e.target.value, true, col.column_type)}
                            onBlur={() => saveRow(d.id)}
                            min={col.column_type === 'number' ? "0" : undefined}
                          />
                        ) : (
                          <span className="block px-2 py-1 text-gray-500 text-center">
                            {col.column_type === 'number'
                              ? (Number(data[d.id]?.custom_columns?.[col.column_key]) || 0).toLocaleString('id-ID')
                              : (data[d.id]?.custom_columns?.[col.column_key] || '-')}
                          </span>
                        )}
                      </td>
                    ))}
                    {canEdit && (
                      <td className="text-center sticky right-0 bg-white z-10 group-hover:bg-primary-50/50 transition-colors border-l border-gray-100">
                        {dusunEditable ? (
                          <button
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-50 ${
                              saveStatus[d.id] === 'saved' ? 'bg-green-100 text-green-600' :
                              saveStatus[d.id] === 'dirty' ? 'bg-amber-100 text-amber-700' :
                              saveStatus[d.id] === 'error' ? 'bg-red-100 text-red-600' :
                              'bg-gray-50 hover:bg-primary-100 text-gray-500 hover:text-primary-600'
                            }`}
                            onClick={() => saveRow(d.id)}
                            disabled={saving === d.id}
                            aria-label={`Simpan data ${d.nama}`}
                          >
                            {saving === d.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                             saveStatus[d.id] === 'saved' ? <CheckCircle className="w-4 h-4" /> :
                             <FloppyDisk className="w-4 h-4" />}
                          </button>
                        ) : (
                          <Lock className="w-4 h-4 text-gray-300 inline-block" />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredDusun.length === 0 && (
                <tr>
                  <td colSpan={100} className="text-center py-8 text-gray-500">Dusun tidak ditemukan</td>
                </tr>
              )}
              {filteredDusun.length > 0 && (
                <tr className="row-total sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                  <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 30 }}></td>
                  <td className="col-desa" style={{ left: 40, background: '#f0fdf4', zIndex: 30 }}>JUMLAH</td>
                  {effectiveColumns.map((col) => (
                    <td key={col.key} className="text-center font-bold">
                      {col.type === 'text' ? '-' : getTotal(col.key).toLocaleString('id-ID')}
                    </td>
                  ))}
                  {dynamicColumns.map((col) => (
                    <td key={`dyn-${col.column_key}`} className="text-center font-bold text-primary-700 bg-primary-50/30">
                      {getTotal(col.column_key, true, col.column_type).toLocaleString('id-ID')}
                    </td>
                  ))}
                  {canEdit && <td className="sticky right-0 background-[#f0fdf4] z-30"></td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
