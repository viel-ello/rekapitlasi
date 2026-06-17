'use client';

import { useEffect, useState } from 'react';
import { Plus, Check, Ban, TrashBin } from 'flowbite-react-icons/outline';
import ConfirmModal from '@/components/ConfirmModal';
import { notifyYearsUpdated } from '@/lib/useYears';

export default function YearsTab({ setToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/years');
      if (res.ok) {
        setRows(await res.json());
      } else {
        setToast({ type: 'error', message: 'Gagal memuat daftar tahun' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setLoading(false);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchYears(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault();
    const y = Number(newYear);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      setToast({ type: 'error', message: 'Masukkan tahun antara 2000 dan 2100' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahun: y }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', message: `Tahun ${y} berhasil ditambahkan` });
        setNewYear('');
        await fetchYears();
        notifyYearsUpdated();
      } else {
        setToast({ type: 'error', message: data.error || 'Gagal menambah tahun' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleActive = async (tahun, isActive) => {
    try {
      const res = await fetch('/api/admin/years', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahun, is_active: !isActive }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: `Tahun ${tahun} ${isActive ? 'dinonaktifkan' : 'diaktifkan'}` });
        await fetchYears();
        notifyYearsUpdated();
      } else {
        const data = await res.json();
        setToast({ type: 'error', message: data.error || 'Gagal memperbarui tahun' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const confirmDelete = (tahun) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus Tahun ${tahun}`,
      message: `Tahun ${tahun} akan dihilangkan dari daftar dropdown. Data yang sudah tersimpan di tabel data_umum, data_pokja, dst. untuk tahun ${tahun} tidak ikut terhapus.`,
      onConfirm: () => { setConfirmDialog({ isOpen: false }); handleDelete(tahun); },
      onCancel: () => setConfirmDialog({ isOpen: false }),
    });
  };

  const handleDelete = async (tahun) => {
    try {
      const res = await fetch(`/api/admin/years?tahun=${tahun}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ type: 'success', message: `Tahun ${tahun} dihapus dari daftar` });
        await fetchYears();
        notifyYearsUpdated();
      } else {
        const data = await res.json();
        setToast({ type: 'error', message: data.error || 'Gagal menghapus tahun' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <>
      <ConfirmModal {...confirmDialog} />

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-4">
        <strong>Catatan:</strong> Tahun aktif akan tampil di semua dropdown (dashboard, halaman data, import, export).
        Menonaktifkan tahun menyembunyikannya dari dropdown tanpa menghapus data.
        Menghapus tahun dari daftar tidak menghapus data rekap yang sudah tersimpan di Supabase.
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label htmlFor="add-year" className="block text-sm font-medium text-gray-700 mb-1">Tambah Tahun Baru</label>
            <input
              id="add-year"
              type="number"
              min="2000"
              max="2100"
              step="1"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder={`Misal: ${new Date().getFullYear() + 1}`}
              className="w-full sm:max-w-xs px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newYear}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            Tambah
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Daftar Tahun</h3>
          <span className="text-xs text-gray-500">{activeCount} aktif / {rows.length} total</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Belum ada tahun terdaftar. Tambah tahun baru di atas.</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 100 }}>Tahun</th>
                  <th className="text-center">Status</th>
                  <th style={{ minWidth: 140 }}>Dibuat</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.tahun} className={!r.is_active ? 'opacity-60' : ''}>
                    <td className="font-bold text-gray-800">{r.tahun}</td>
                    <td className="text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => toggleActive(r.tahun, r.is_active)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            r.is_active
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                          title={r.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          aria-label={r.is_active ? `Nonaktifkan tahun ${r.tahun}` : `Aktifkan tahun ${r.tahun}`}
                        >
                          {r.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => confirmDelete(r.tahun)}
                          className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg"
                          title="Hapus dari daftar"
                          aria-label={`Hapus tahun ${r.tahun}`}
                        >
                          <TrashBin className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
