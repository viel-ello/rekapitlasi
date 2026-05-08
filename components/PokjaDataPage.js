'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, FloppyDisk } from 'flowbite-react-icons/outline';

/**
 * Reusable Pokja data table component with role-based access control
 */
export default function PokjaDataPage({ title, subtitle, icon, apiEndpoint, columns, tableName }) {
  const [desa, setDesa] = useState([]);
  const [data, setData] = useState({});
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [dynamicColumns, setDynamicColumns] = useState([]);

  useEffect(() => {
    fetchDesa();
    checkPermission();
    fetchDynamicColumns();
  }, []);

  useEffect(() => {
    if (desa.length > 0) fetchData();
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

  const fetchData = async () => {
    const res = await fetch(`${apiEndpoint}?tahun=${tahun}`);
    const rows = await res.json();
    const map = {};
    rows.forEach(r => { map[r.desa_id] = r; });
    setData(map);
  };

  const handleChange = (desaId, key, value, isDynamic = false, type = 'number') => {
    if (!canEdit) return;
    
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = value === '' ? 0 : Number(value);
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
  };

  const saveRow = useCallback(async (desaId) => {
    if (!canEdit) {
      setToast({ type: 'error', message: `Anda (${userRole}) tidak memiliki izin untuk mengedit halaman ini` });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(desaId);
    try {
      const rowData = data[desaId] || {};
      const payload = { desa_id: desaId, tahun, custom_columns: {} };
      
      // Standard columns
      columns.forEach(col => { payload[col.key] = rowData[col.key] || 0; });
      
      // Dynamic columns
      dynamicColumns.forEach(col => {
        const val = rowData.custom_columns?.[col.column_key];
        payload.custom_columns[col.column_key] = col.column_type === 'number' ? (val || 0) : (val || '');
      });

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToast({ type: 'success', message: 'Data berhasil disimpan' });
      } else {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || 'Gagal menyimpan data' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal terhubung ke server' });
    }
    setSaving(null);
    setTimeout(() => setToast(null), 3000);
  }, [data, tahun, apiEndpoint, columns, canEdit, userRole, dynamicColumns]);

  const getTotal = (key, isDynamic = false, type = 'number') => {
    if (type !== 'number') return '-';
    if (isDynamic) {
      return desa.reduce((sum, d) => sum + (Number(data[d.id]?.custom_columns?.[key]) || 0), 0);
    }
    return desa.reduce((sum, d) => sum + (Number(data[d.id]?.[key]) || 0), 0);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
        <select
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-auto"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="data-table-wrapper" style={{ maxHeight: '75vh' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f9fafb', minWidth: 40 }}>No</th>
                <th style={{ position: 'sticky', left: 40, zIndex: 3, background: '#f9fafb', minWidth: 130 }}>Nama Desa</th>
                {columns.map(col => <th key={col.key} className="text-center" style={{ minWidth: 80 }}>{col.label}</th>)}
                {dynamicColumns.map(col => <th key={`dyn-${col.column_key}`} className="text-center text-primary-700 bg-primary-50/30" style={{ minWidth: 100 }}>{col.column_label}</th>)}
                {canEdit && <th className="text-center" style={{ minWidth: 60 }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {desa.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, textAlign: 'center' }}>{i + 1}</td>
                  <td className="col-desa" style={{ left: 40 }}>{d.nama}</td>
                  {columns.map(col => (
                    <td key={col.key}>
                      {canEdit ? (
                        <input
                          type="number"
                          className="cell-input"
                          value={data[d.id]?.[col.key] ?? ''}
                          onChange={(e) => handleChange(d.id, col.key, e.target.value)}
                          onBlur={() => saveRow(d.id)}
                          min="0"
                          placeholder="0"
                        />
                      ) : (
                        <span className="block text-right px-2 py-1 text-gray-500">
                          {(data[d.id]?.[col.key] || 0).toLocaleString('id-ID')}
                        </span>
                      )}
                    </td>
                  ))}
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
                          placeholder={col.column_type === 'number' ? "0" : "Isi teks"}
                        />
                      ) : (
                        <span className={`block px-2 py-1 text-gray-500 ${col.column_type === 'number' ? 'text-right' : 'text-left'}`}>
                          {col.column_type === 'number' 
                            ? (Number(data[d.id]?.custom_columns?.[col.column_key]) || 0).toLocaleString('id-ID')
                            : (data[d.id]?.custom_columns?.[col.column_key] || '-')}
                        </span>
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="text-center">
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors disabled:opacity-50"
                        onClick={() => saveRow(d.id)}
                        disabled={saving === d.id}
                      >
                        {saving === d.id ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="row-total">
                <td style={{ position: 'sticky', left: 0, background: '#f0fdf4', zIndex: 1 }}></td>
                <td className="col-desa" style={{ left: 40, background: '#f0fdf4' }}>JUMLAH</td>
                {columns.map(col => (
                  <td key={col.key} className="text-right font-bold">
                    {getTotal(col.key).toLocaleString('id-ID')}
                  </td>
                ))}
                {dynamicColumns.map(col => (
                  <td key={`dyn-${col.column_key}`} className="text-right font-bold text-primary-700 bg-primary-50/30">
                    {getTotal(col.column_key, true, col.column_type).toLocaleString('id-ID')}
                  </td>
                ))}
                {canEdit && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
