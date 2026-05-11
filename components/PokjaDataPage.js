'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Lock, FloppyDisk, Search, ExclamationCircle, CheckCircle } from 'flowbite-react-icons/outline';
import { validateRow, countIssues } from '@/lib/validation';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';

/**
 * Reusable Pokja data table component with role-based access control and inline validation
 */
export default function PokjaDataPage({ title, subtitle, icon, apiEndpoint, columns, tableName }) {
  const [desa, setDesa] = useState([]);
  const [data, setData] = useState({});
  const [prevYearData, setPrevYearData] = useState({});
  const [tahun, setTahun] = useState(new Date().getFullYear());
  
  const [saving, setSaving] = useState(null); // 'all' or desaId
  const [saveStatus, setSaveStatus] = useState({}); // { [desaId]: 'dirty' | 'saved' | 'error' }
  const [toast, setToast] = useState(null);
  
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [overrides, setOverrides] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');

  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]);

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(columns, overrides).filter((c) => !c.hidden),
    [columns, overrides]
  );

  useEffect(() => {
    fetchDesa();
    checkPermission();
    fetchDynamicColumns();
    fetchOverrides();
  }, []);

  useEffect(() => {
    if (desa.length > 0) {
      fetchData(tahun);
      fetchData(tahun - 1, true); // fetch prev year for validation
    }
  }, [tahun, desa]);

  const checkPermission = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const me = await res.json();
        setUserRole(me.role);
        setCanEdit(me.permissions.includes(tableName));
      }
    } catch {
      setCanEdit(false);
    }
  };

  const fetchDesa = async () => {
    const res = await fetch('/api/desa');
    const list = await res.json();
    setDesa(list);
  };

  const fetchDynamicColumns = async () => {
    if (!tableName) return;
    try {
      const res = await fetch(`/api/admin/columns?table_name=${tableName}`);
      if (res.ok) setDynamicColumns(await res.json());
    } catch (error) {
      console.error('Failed to fetch dynamic columns');
    }
  };

  const fetchOverrides = async () => {
    if (!tableName) return;
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch (error) {
      console.error('Failed to fetch column overrides');
    }
  };

  const fetchData = async (targetYear, isPrev = false) => {
    const res = await fetch(`${apiEndpoint}?tahun=${targetYear}`);
    const rows = await res.json();
    const map = {};
    rows.forEach(r => { map[r.desa_id] = r; });
    
    if (isPrev) {
      setPrevYearData(map);
    } else {
      setData(map);
      setSaveStatus({}); // reset save status when year changes
    }
  };

  const handleChange = (desaId, key, value, isDynamic = false, type = 'number') => {
    if (!canEdit) return;
    
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value); // Allow empty string temporarily while typing
    }

    setData(prev => {
      const row = prev[desaId] || {};
      if (isDynamic) {
        return {
          ...prev,
          [desaId]: { 
            ...row, 
            desa_id: desaId, 
            custom_columns: { ...(row.custom_columns || {}), [key]: parsedValue } 
          }
        };
      }
      return {
        ...prev,
        [desaId]: { ...row, desa_id: desaId, [key]: parsedValue },
      };
    });
    
    setSaveStatus(prev => ({ ...prev, [desaId]: 'dirty' }));
  };

  const getRowIssueCount = (desaId) => {
    const validation = validateRow(data[desaId] || {}, effectiveColumns, prevYearData[desaId] || null);
    const issues = countIssues(validation);
    return issues.errors + issues.warnings;
  };

  const _doSaveRow = async (desaId) => {
    const rowData = data[desaId] || {};
    const payload = { desa_id: desaId, tahun, custom_columns: {} };
    
    // Kirim SEMUA kolom standar (termasuk yang hidden) supaya data di DB tetap konsisten
    columns.forEach(col => { payload[col.key] = rowData[col.key] || 0; });
    
    dynamicColumns.forEach(col => {
      const val = rowData.custom_columns?.[col.column_key];
      payload.custom_columns[col.column_key] = col.column_type === 'number' ? (val || 0) : (val || '');
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

  const saveRow = useCallback(async (desaId) => {
    if (!canEdit) return;

    setSaving(desaId);
    try {
      await _doSaveRow(desaId);
      setSaveStatus(prev => ({ ...prev, [desaId]: 'saved' }));
      const issueCount = getRowIssueCount(desaId);
      setToast({
        type: issueCount > 0 ? 'warning' : 'success',
        message: issueCount > 0 ? `Data disimpan dengan ${issueCount} peringatan` : 'Data berhasil disimpan',
      });
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [desaId]: 'error' }));
      setToast({ type: 'error', message: err.message });
    }
    setSaving(null);
    setTimeout(() => setToast(null), 3000);
    setTimeout(() => setSaveStatus(prev => ({ ...prev, [desaId]: null })), 5000); // clear checkmark after 5s
  }, [data, prevYearData, tahun, apiEndpoint, columns, effectiveColumns, canEdit, dynamicColumns]);

  const saveAll = async () => {
    if (!canEdit) return;

    const warningCount = desa.reduce((sum, d) => sum + getRowIssueCount(d.id), 0);
    if (warningCount > 0 && !window.confirm(`Ada ${warningCount} peringatan validasi. Tetap simpan semua perubahan?`)) {
      return;
    }
    
    setSaving('all');
    let successCount = 0;
    let failCount = 0;

    for (const d of desa) {
      try {
        await _doSaveRow(d.id);
        setSaveStatus(prev => ({ ...prev, [d.id]: 'saved' }));
        successCount++;
      } catch (e) {
        setSaveStatus(prev => ({ ...prev, [d.id]: 'error' }));
        failCount++;
      }
    }

    setSaving(null);
    if (failCount === 0) {
      setToast({ type: 'success', message: `Berhasil menyimpan semua data (${successCount} desa)` });
    } else {
      setToast({ type: 'error', message: `Berhasil ${successCount}, Gagal ${failCount}` });
    }
    setTimeout(() => setToast(null), 4000);
  };

  const getTotal = (key, isDynamic = false, type = 'number') => {
    if (type !== 'number') return '-';
    if (isDynamic) {
      return desa.reduce((sum, d) => sum + (Number(data[d.id]?.custom_columns?.[key]) || 0), 0);
    }
    return desa.reduce((sum, d) => sum + (Number(data[d.id]?.[key]) || 0), 0);
  };

  const filteredDesa = desa.filter(d => d.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  const validationSummary = filteredDesa.reduce((acc, d) => {
    const validation = validateRow(data[d.id] || {}, effectiveColumns, prevYearData[d.id] || null);
    const issues = countIssues(validation);
    acc.errors += issues.errors;
    acc.warnings += issues.warnings;
    acc.infos += issues.infos;
    return acc;
  }, { errors: 0, warnings: 0, infos: 0 });

  // Mobile card view renderer
  const MobileCard = ({ d, i }) => {
    const rowData = data[d.id] || {};
    const prevRowData = prevYearData[d.id] || null;
    const validation = validateRow(rowData, effectiveColumns, prevRowData);
    const { errors, warnings } = countIssues(validation);
    const isSaving = saving === d.id;
    const isSaved = saveStatus[d.id] === 'saved';
    const isDirty = saveStatus[d.id] === 'dirty';
    const isError = saveStatus[d.id] === 'error';

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm relative">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md mr-2">{i + 1}</span>
            <span className="font-bold text-gray-800">{d.nama}</span>
          </div>
          <div className="flex gap-2">
            {(errors > 0 || warnings > 0) && (
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${errors > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                <ExclamationCircle className="w-3 h-3" /> {errors || warnings} issue
              </span>
            )}
            {canEdit && (
              <button
                onClick={() => saveRow(d.id)}
                disabled={isSaving}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSaved ? 'bg-green-100 text-green-600' : 
                  isDirty ? 'bg-amber-100 text-amber-700' :
                  isError ? 'bg-red-100 text-red-600' :
                  isSaving ? 'bg-primary-50 text-primary-500' : 
                  'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                }`}
                aria-label={`Simpan data ${d.nama}`}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                 isSaved ? <CheckCircle className="w-4 h-4" /> :
                 <FloppyDisk className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {effectiveColumns.map(col => {
            const valObj = validation[col.key] || { valid: true };
            const hasError = valObj.severity === 'error';
            const hasWarning = valObj.severity === 'warning';
            
            return (
              <div key={col.key} className="flex flex-col">
                <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1">{col.label}</label>
                {canEdit ? (
                  <input
                    type="number"
                    className={`w-full text-sm py-1.5 px-2 rounded-md border outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                      hasError ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500' :
                      hasWarning ? 'border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-amber-500' :
                      'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                    value={rowData[col.key] ?? ''}
                    onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                    onBlur={() => saveRow(d.id)}
                    min="0"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-800">
                    {(rowData[col.key] || 0).toLocaleString('id-ID')}
                  </div>
                )}
                {(hasError || hasWarning) && (
                  <span className={`text-[10px] mt-0.5 ${hasError ? 'text-red-500' : 'text-amber-500'}`}>
                    {valObj.warning}
                  </span>
                )}
              </div>
            );
          })}
        </div>
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
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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
            {years.map(y => <option key={y} value={y}>{y}</option>)}
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
          placeholder="Cari desa..."
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

      {/* Mobile View (<768px) */}
      <div className="md:hidden">
        {filteredDesa.map((d, i) => <MobileCard key={d.id} d={d} i={i} />)}
        {filteredDesa.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Desa tidak ditemukan</div>
        )}
      </div>

      {/* Desktop Table View (>=768px) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="data-table-wrapper" style={{ maxHeight: '75vh' }}>
          <table className="data-table relative">
            <thead className="sticky top-0 z-20">
              <tr>
                <th rowSpan={2} style={{ position: 'sticky', left: 0, zIndex: 30, background: '#f9fafb', minWidth: 40 }}>No</th>
                <th rowSpan={2} style={{ position: 'sticky', left: 40, zIndex: 30, background: '#f9fafb', minWidth: 130 }}>Nama Desa</th>
                <th colSpan={effectiveColumns.length} className="text-center bg-gray-50">Kolom Standar</th>
                {dynamicColumns.length > 0 && <th colSpan={dynamicColumns.length} className="text-center text-primary-700 bg-primary-50/40">Kolom Dinamis</th>}
                {canEdit && <th rowSpan={2} className="text-center sticky right-0 z-30" style={{ minWidth: 60, background: '#f9fafb' }}>Aksi</th>}
              </tr>
              <tr>
                {effectiveColumns.map(col => (
                  <th key={col.key} className="text-center" style={{ minWidth: 80 }} title={col.renamed ? `Asli: ${col.originalLabel}` : undefined}>
                    {col.label}
                    {col.renamed && <span className="ml-1 text-[9px] text-amber-500" aria-hidden="true">*</span>}
                  </th>
                ))}
                {dynamicColumns.map(col => <th key={`dyn-${col.column_key}`} className="text-center text-primary-700 bg-primary-50/30" style={{ minWidth: 100 }}>{col.column_label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredDesa.map((d, i) => {
                const rowData = data[d.id] || {};
                const prevRowData = prevYearData[d.id] || null;
                const validation = validateRow(rowData, effectiveColumns, prevRowData);

                return (
                  <tr key={d.id} className="group">
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 10, textAlign: 'center' }} className="group-hover:bg-primary-50/50 transition-colors">{i + 1}</td>
                    <td className="col-desa group-hover:bg-primary-50/50 transition-colors" style={{ left: 40 }}>{d.nama}</td>
                    {effectiveColumns.map(col => {
                      const valObj = validation[col.key] || { valid: true };
                      const hasError = valObj.severity === 'error';
                      const hasWarning = valObj.severity === 'warning';
                      const inputClass = `cell-input ${hasError ? '!bg-red-50 !border-red-300 !text-red-900 focus:!ring-red-500' : hasWarning ? '!bg-amber-50 !border-amber-300 !text-amber-900 focus:!ring-amber-500' : ''}`;

                      return (
                        <td key={col.key} className="relative">
                          {canEdit ? (
                            <input
                              type="number"
                              className={inputClass}
                              value={rowData[col.key] ?? ''}
                              onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                              onBlur={() => saveRow(d.id)}
                              min="0"
                              title={valObj.warning || ''}
                            />
                          ) : (
                            <span className="block text-center px-2 py-1 text-gray-500" title={valObj.warning || ''}>
                              {(rowData[col.key] || 0).toLocaleString('id-ID')}
                              {hasWarning && <ExclamationCircle className="w-3 h-3 text-amber-500 inline ml-1" />}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {dynamicColumns.map(col => (
                      <td key={`dyn-${col.column_key}`} className="bg-primary-50/10">
                        {canEdit ? (
                          <input
                            type={col.column_type === 'number' ? 'number' : 'text'}
                            className="cell-input !text-primary-800"
                            value={data[d.id]?.custom_columns?.[col.column_key] ?? ''}
                            onChange={(e) => handleChange(d.id, col.column_key, e.target.value, true, col.column_type)}
                            onBlur={() => saveRow(d.id)}
                            min={col.column_type === 'number' ? "0" : undefined}
                          />
                        ) : (
                          <span className={`block px-2 py-1 text-gray-500 text-center`}>
                            {col.column_type === 'number' 
                              ? (Number(data[d.id]?.custom_columns?.[col.column_key]) || 0).toLocaleString('id-ID')
                              : (data[d.id]?.custom_columns?.[col.column_key] || '-')}
                          </span>
                        )}
                      </td>
                    ))}
                    {canEdit && (
                      <td className="text-center sticky right-0 bg-white z-10 group-hover:bg-primary-50/50 transition-colors border-l border-gray-100">
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
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredDesa.length === 0 && (
                <tr>
                  <td colSpan={100} className="text-center py-8 text-gray-500">Desa tidak ditemukan</td>
                </tr>
              )}
              {filteredDesa.length > 0 && (
                <tr className="row-total sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                  <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 30 }}></td>
                  <td className="col-desa" style={{ left: 40, background: '#f0fdf4', zIndex: 30 }}>JUMLAH</td>
                  {effectiveColumns.map(col => (
                    <td key={col.key} className="text-center font-bold">
                      {getTotal(col.key).toLocaleString('id-ID')}
                    </td>
                  ))}
                  {dynamicColumns.map(col => (
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
