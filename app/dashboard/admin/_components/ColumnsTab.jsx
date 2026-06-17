'use client';

import { useEffect, useState } from 'react';
import { Plus, Close, Check, Pen, TrashBin, Refresh, Eye, EyeSlash } from 'flowbite-react-icons/outline';
import ConfirmModal from '@/components/ConfirmModal';
import { DATA_PAGES as DATA_PAGES_CLIENT } from '@/lib/dataPages';

export default function ColumnsTab({ toast, setToast }) {
  const [subtab, setSubtab] = useState('standard');

  return (
    <>
      <div className="mb-4 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSubtab('standard')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subtab === 'standard' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Kolom Standar
        </button>
        <button
          onClick={() => setSubtab('dynamic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subtab === 'dynamic' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Kolom Dinamis
        </button>
      </div>
      {subtab === 'standard' && <StandardColumnsPanel setToast={setToast} />}
      {subtab === 'dynamic' && <DynamicColumnsPanel setToast={setToast} />}
    </>
  );
}

function StandardColumnsPanel({ setToast }) {
  const [tableName, setTableName] = useState('data_umum');
  const [overrides, setOverrides] = useState([]);
  const [editing, setEditing] = useState({}); // { column_key: 'new label' }
  const [saving, setSaving] = useState(null);

  const TABLE_OPTIONS = [
    { value: 'data_umum', label: 'Data Umum' },
    { value: 'data_pokja1', label: 'Pokja I' },
    { value: 'data_pokja2', label: 'Pokja II' },
    { value: 'data_pokja3', label: 'Pokja III' },
    { value: 'data_pokja4', label: 'Pokja IV' },
    { value: 'data_rekap_dawis', label: 'Rekap Dawis' },
    { value: 'data_bumil', label: 'Data Bumil' },
  ];

  // Get columns from DATA_PAGES dynamically
  const getColumnsForTable = (table) => {
    const page = Object.values(DATA_PAGES_CLIENT).find(p => p.tableName === table);
    return page?.columns || [];
  };

  const fetchOverrides = async () => {
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${tableName}`);
      if (res.ok) setOverrides(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchOverrides(); setEditing({}); }, [tableName]); // eslint-disable-line react-hooks/exhaustive-deps

  const getOverride = (key) => overrides.find(o => o.column_key === key);

  const saveOverride = async (columnKey, payload) => {
    setSaving(columnKey);
    try {
      const res = await fetch('/api/admin/column-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: tableName, column_key: columnKey, ...payload }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: 'Perubahan kolom disimpan' });
        await fetchOverrides();
      } else {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || 'Gagal menyimpan' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setSaving(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRename = async (columnKey) => {
    const newLabel = (editing[columnKey] ?? '').trim();
    const ov = getOverride(columnKey);
    await saveOverride(columnKey, {
      label_override: newLabel || null,
      is_hidden: ov?.is_hidden || 0,
    });
    setEditing(prev => ({ ...prev, [columnKey]: undefined }));
  };

  const toggleHidden = async (columnKey) => {
    const ov = getOverride(columnKey);
    await saveOverride(columnKey, {
      label_override: ov?.label_override || null,
      is_hidden: ov?.is_hidden ? 0 : 1,
    });
  };

  const resetColumn = async (columnKey) => {
    setSaving(columnKey);
    try {
      const res = await fetch(`/api/admin/column-overrides?table_name=${tableName}&column_key=${columnKey}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ type: 'success', message: 'Kolom direset ke default' });
        await fetchOverrides();
      } else {
        setToast({ type: 'error', message: 'Gagal mereset kolom' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setSaving(null);
    setTimeout(() => setToast(null), 3000);
  };

  const columns = getColumnsForTable(tableName);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
        <strong>Catatan:</strong> Rename hanya mengubah label yang ditampilkan. Menyembunyikan kolom akan membuatnya tidak tampil di halaman input, statistik, dan template, tetapi data di database tetap aman.
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Tabel:</label>
        <select
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
        >
          {TABLE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Key Kolom</th>
                <th style={{ minWidth: 180 }}>Label Asli</th>
                <th style={{ minWidth: 220 }}>Label Tampilan</th>
                <th className="text-center">Status</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {columns.map(col => {
                const ov = getOverride(col.key);
                const currentLabel = ov?.label_override || col.label;
                const isHidden = Boolean(ov?.is_hidden);
                const hasCustomization = Boolean(ov?.label_override) || isHidden;
                const isEditing = editing[col.key] !== undefined;

                return (
                  <tr key={col.key} className={isHidden ? 'opacity-60' : ''}>
                    <td>
                      <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-xs font-mono">{col.key}</code>
                    </td>
                    <td className="text-gray-500">{col.label}</td>
                    <td>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            value={editing[col.key] ?? ''}
                            onChange={(e) => setEditing(prev => ({ ...prev, [col.key]: e.target.value }))}
                            placeholder={col.label}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(col.key);
                              if (e.key === 'Escape') setEditing(prev => ({ ...prev, [col.key]: undefined }));
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRename(col.key)}
                            disabled={saving === col.key}
                            className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
                            aria-label="Simpan nama kolom"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(prev => ({ ...prev, [col.key]: undefined }))}
                            className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                            aria-label="Batal rename"
                          >
                            <Close className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`${ov?.label_override ? 'font-semibold text-primary-700' : 'text-gray-700'}`}>
                          {currentLabel}
                          {ov?.label_override && <span className="ml-1 text-[9px] text-amber-500" title="Dimodifikasi">*</span>}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {isHidden ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Disembunyikan</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Aktif</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center gap-1">
                        {!isEditing && (
                          <button
                            onClick={() => setEditing(prev => ({ ...prev, [col.key]: ov?.label_override || '' }))}
                            className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                            title="Rename kolom"
                            aria-label={`Rename kolom ${col.label}`}
                          >
                            <Pen className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleHidden(col.key)}
                          disabled={saving === col.key}
                          className={`p-1.5 rounded-lg ${
                            isHidden
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-red-50 text-red-500 hover:bg-red-100'
                          }`}
                          title={isHidden ? 'Tampilkan kolom' : 'Sembunyikan kolom'}
                          aria-label={isHidden ? `Tampilkan kolom ${col.label}` : `Sembunyikan kolom ${col.label}`}
                        >
                          {isHidden ? <Eye className="w-4 h-4" /> : <EyeSlash className="w-4 h-4" />}
                        </button>
                        {hasCustomization && (
                          <button
                            onClick={() => resetColumn(col.key)}
                            disabled={saving === col.key}
                            className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                            title="Reset ke default"
                            aria-label={`Reset kolom ${col.label}`}
                          >
                            <Refresh className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DynamicColumnsPanel({ setToast }) {
  const [columns, setColumns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const TABLES = [
    { value: 'data_umum', label: 'Data Umum' },
    { value: 'data_pokja1', label: 'Pokja I' },
    { value: 'data_pokja2', label: 'Pokja II' },
    { value: 'data_pokja3', label: 'Pokja III' },
    { value: 'data_pokja4', label: 'Pokja IV' },
    { value: 'data_rekap_dawis', label: 'Rekap Dawis' },
    { value: 'data_bumil', label: 'Data Ibu Hamil' },
  ];

  useEffect(() => { fetchColumns(); }, []);
  const fetchColumns = async () => {
    try {
      const res = await fetch('/api/admin/columns');
      if (!res.ok) { setToast({ type: 'error', message: 'Gagal memuat kolom' }); setTimeout(() => setToast(null), 3000); return; }
      setColumns(await res.json());
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); setTimeout(() => setToast(null), 3000); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { table_name: fd.get('table_name'), column_key: fd.get('column_key'), column_label: fd.get('column_label'), column_type: fd.get('column_type') };
    const res = await fetch('/api/admin/columns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setToast({ type: 'success', message: 'Kolom berhasil ditambahkan' }); setShowForm(false); fetchColumns(); }
    else { const err = await res.json(); setToast({ type: 'error', message: err.error }); }
    setTimeout(() => setToast(null), 3000);
  };

  const confirmDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Definisi Kolom',
      message: 'Data yang sudah tersimpan di kolom ini tidak akan ikut terhapus dari tabel secara permanen, namun kolom tidak akan tampil lagi di antarmuka. Lanjutkan?',
      onConfirm: () => { setConfirmDialog({ isOpen: false }); handleDelete(id); },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleDelete = async (id) => {
    await fetch(`/api/admin/columns?id=${id}`, { method: 'DELETE' });
    setToast({ type: 'success', message: 'Kolom dihapus' });
    fetchColumns();
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <ConfirmModal {...confirmDialog} />
      <div className="mb-4">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
          {showForm ? <><Close className="w-4 h-4" /> Batal</> : <><Plus className="w-4 h-4" /> Tambah Kolom Baru</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-in slide-in-from-top-4 fade-in">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tambah Kolom Dinamis</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tabel Tujuan</label>
              <select name="table_name" required className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                {TABLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Kolom (tanpa spasi)</label>
              <input type="text" name="column_key" required placeholder="misal: ket_tambahan" pattern="^[a-zA-Z0-9_]+$" title="Hanya huruf, angka, dan underscore" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label Kolom (Tampilan)</label>
              <input type="text" name="column_label" required placeholder="misal: Keterangan Tambahan" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Data</label>
              <select name="column_type" required className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                <option value="text">Teks (String)</option>
                <option value="number">Angka (Number)</option>
              </select>
            </div>
            <div className="lg:col-span-4">
              <button type="submit" className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors">Simpan Kolom</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Tabel</th>
                <th className="px-6 py-4">Key Kolom</th>
                <th className="px-6 py-4">Label Tampilan</th>
                <th className="px-6 py-4">Tipe Data</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {columns.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">Belum ada kolom tambahan.</td></tr>
              ) : columns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">{TABLES.find(t => t.value === c.table_name)?.label || c.table_name}</td>
                  <td className="px-6 py-3"><code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-xs font-mono">{c.column_key}</code></td>
                  <td className="px-6 py-3">{c.column_label}</td>
                  <td className="px-6 py-3">{c.column_type === 'number' ? 'Angka' : 'Teks'}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => confirmDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><TrashBin className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
