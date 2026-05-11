'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { FloppyDisk, Lock, Search, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { MONTHS } from '@/lib/dataPages';
import { DataPageIcon } from '@/components/DataPageIcon';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';

export default function BumilDataPage({ config }) {
  const [desa, setDesa] = useState([]);
  const [data, setData] = useState({});
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(null);
  const [saveStatus, setSaveStatus] = useState({});
  const [toast, setToast] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [overrides, setOverrides] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]);

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(config.columns, overrides).filter((c) => !c.hidden),
    [config.columns, overrides]
  );

  useEffect(() => { fetchDesa(); checkPermission(); fetchOverrides(); }, []);
  useEffect(() => { if (desa.length > 0) fetchData(); }, [tahun, bulan, desa]);

  const checkPermission = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const me = await res.json();
        setUserRole(me.role);
        setCanEdit(me.permissions.includes(config.tableName));
      }
    } catch (err) {
      console.error('Permission check failed', err);
      setCanEdit(false);
    }
  };

  const fetchDesa = async () => {
    try {
      const res = await fetch('/api/desa');
      if (res.ok) setDesa(await res.json());
    } catch (err) {
      console.error('Failed to fetch desa', err);
    }
  };

  const fetchOverrides = async () => {
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${config.tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch (err) {
      console.error('Failed to fetch overrides', err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${config.apiEndpoint}?tahun=${tahun}&bulan=${bulan}`);
      if (!res.ok) return;
      const rows = await res.json();
      const map = {};
      rows.forEach(r => { map[r.desa_id] = r; });
      setData(map);
      setSaveStatus({});
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const handleChange = (desaId, key, value) => {
    if (!canEdit) return;
    setData(prev => ({
      ...prev,
      [desaId]: {
        ...(prev[desaId] || {}),
        desa_id: desaId,
        [key]: value === '' ? '' : Number(value),
      },
    }));
    setSaveStatus(prev => ({ ...prev, [desaId]: 'dirty' }));
  };

  const _doSaveRow = async (desaId) => {
    const rowData = data[desaId] || {};
    const payload = { desa_id: desaId, tahun, bulan };
    // Kirim SEMUA kolom standar (termasuk hidden) supaya data DB konsisten
    config.columns.forEach(col => { payload[col.key] = rowData[col.key] || 0; });
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

  const saveRow = useCallback(async (desaId) => {
    if (!canEdit) {
      setToast({ type: 'error', message: `Anda (${userRole}) tidak memiliki izin` });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setSaving(desaId);
    try {
      await _doSaveRow(desaId);
      setSaveStatus(prev => ({ ...prev, [desaId]: 'saved' }));
      setToast({ type: 'success', message: 'Data berhasil disimpan' });
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [desaId]: 'error' }));
      setToast({ type: 'error', message: err.message });
    }
    setSaving(null);
    setTimeout(() => setToast(null), 3000);
    setTimeout(() => setSaveStatus(prev => ({ ...prev, [desaId]: null })), 5000);
  }, [data, tahun, bulan, canEdit, userRole, config]);

  const saveAll = async () => {
    if (!canEdit) return;
    setSaving('all');
    let ok = 0, fail = 0;
    await Promise.allSettled(desa.map(async (d) => {
      try {
        await _doSaveRow(d.id);
        setSaveStatus(prev => ({ ...prev, [d.id]: 'saved' }));
        ok++;
      } catch {
        setSaveStatus(prev => ({ ...prev, [d.id]: 'error' }));
        fail++;
      }
    }));
    setSaving(null);
    setToast({ type: fail === 0 ? 'success' : 'error', message: `Berhasil ${ok}${fail > 0 ? `, gagal ${fail}` : ''}` });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredDesa = desa.filter(d => d.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  const getTotal = (key) => desa.reduce((sum, d) => sum + (Number(data[d.id]?.[key]) || 0), 0);

  // Mobile card
  const MobileCard = ({ d, i }) => {
    const rowData = data[d.id] || {};
    const isSaving = saving === d.id;
    const isSaved = saveStatus[d.id] === 'saved';
    const isDirty = saveStatus[d.id] === 'dirty';
    const isError = saveStatus[d.id] === 'error';

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md mr-2">{i + 1}</span>
            <span className="font-bold text-gray-800">{d.nama}</span>
          </div>
          {canEdit && (
            <button
              onClick={() => saveRow(d.id)}
              disabled={isSaving}
              className={`p-1.5 rounded-lg transition-colors ${
                isSaved ? 'bg-green-100 text-green-600' :
                isDirty ? 'bg-amber-100 text-amber-700' :
                isError ? 'bg-red-100 text-red-600' :
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
        <div className="grid grid-cols-2 gap-3">
          {effectiveColumns.map(col => (
            <div key={col.key} className="flex flex-col">
              <label className="text-[10px] uppercase font-semibold text-gray-500 mb-1">{col.label}</label>
              {canEdit ? (
                <input
                  type="number"
                  className="w-full text-sm py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 hover:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                  value={rowData[col.key] ?? ''}
                  onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                  onBlur={() => saveRow(d.id)}
                  min="0"
                />
              ) : (
                <div className="text-sm font-medium text-gray-800">{(rowData[col.key] || 0).toLocaleString('id-ID')}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
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
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Pilih bulan data bumil">
            {MONTHS.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Pilih tahun data bumil">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Cari desa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        {filteredDesa.map((d, i) => <MobileCard key={d.id} d={d} i={i} />)}
        {filteredDesa.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100">Desa tidak ditemukan</div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="data-table-wrapper" style={{ maxHeight: '75vh' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f9fafb', minWidth: 40 }}>No</th>
                <th style={{ position: 'sticky', left: 40, zIndex: 3, background: '#f9fafb', minWidth: 130 }}>Nama Desa</th>
                {effectiveColumns.map(col => (
                  <th key={col.key} className="text-center" style={{ minWidth: 80 }} title={col.renamed ? `Asli: ${col.originalLabel}` : undefined}>
                    {col.label}
                    {col.renamed && <span className="ml-1 text-[9px] text-amber-500">*</span>}
                  </th>
                ))}
                {canEdit && <th className="text-center" style={{ minWidth: 60 }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDesa.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, textAlign: 'center' }}>{i + 1}</td>
                  <td className="col-desa" style={{ left: 40 }}>{d.nama}</td>
                  {effectiveColumns.map(col => (
                    <td key={col.key}>
                      {canEdit ? (
                        <input type="number" className="cell-input" value={data[d.id]?.[col.key] ?? ''} onChange={(e) => handleChange(d.id, col.key, e.target.value)} onBlur={() => saveRow(d.id)} min="0" placeholder="0" />
                      ) : (
                        <span className="block text-right px-2 py-1 text-gray-500">{(data[d.id]?.[col.key] || 0).toLocaleString('id-ID')}</span>
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="text-center">
                      <button
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-50 ${
                          saveStatus[d.id] === 'saved' ? 'bg-green-100 text-green-600' :
                          saveStatus[d.id] === 'dirty' ? 'bg-amber-100 text-amber-700' :
                          saveStatus[d.id] === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-primary-50 hover:bg-primary-100 text-primary-600'
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
              ))}
              {filteredDesa.length > 0 && (
                <tr className="row-total">
                  <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 1 }}></td>
                  <td className="col-desa" style={{ left: 40, background: '#f0fdf4' }}>JUMLAH</td>
                  {effectiveColumns.map(col => <td key={col.key} className="text-right font-bold">{getTotal(col.key).toLocaleString('id-ID')}</td>)}
                  {canEdit && <td></td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
