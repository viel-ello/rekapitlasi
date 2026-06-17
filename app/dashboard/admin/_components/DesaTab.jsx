'use client';

import { useEffect, useState } from 'react';
import { Check, Close, Pen, Ban } from 'flowbite-react-icons/outline';
import { invalidateDusunCache } from '@/lib/fetchDusun';

export default function DesaTab({ toast, setToast }) {
  const [desa, setDesa] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState('');

  useEffect(() => { fetchDesa(); }, []);
  const fetchDesa = async () => {
    try {
      const res = await fetch('/api/admin/dusun');
      if (!res.ok) { setToast({ type: 'error', message: 'Gagal memuat data dusun' }); setTimeout(() => setToast(null), 3000); return; }
      setDesa(await res.json());
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); setTimeout(() => setToast(null), 3000); }
  };

  const saveNama = async (id) => {
    try {
      const res = await fetch('/api/admin/dusun', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nama: editNama }) });
      if (res.ok) { setToast({ type: 'success', message: 'Nama dusun diperbarui' }); setEditId(null); invalidateDusunCache(); fetchDesa(); }
      else { const err = await res.json(); setToast({ type: 'error', message: err.error || 'Gagal memperbarui' }); }
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); }
    setTimeout(() => setToast(null), 3000);
  };

  const toggleActive = async (id, current) => {
    try {
      const res = await fetch('/api/admin/dusun', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: current ? 0 : 1 }) });
      if (res.ok) { setToast({ type: 'success', message: current ? 'Dusun dinonaktifkan' : 'Dusun diaktifkan' }); }
      else { const err = await res.json(); setToast({ type: 'error', message: err.error || 'Gagal memperbarui' }); }
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); }
    invalidateDusunCache();
    fetchDesa();
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Dusun</th>
              <th className="text-center">Status</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {desa.map((d, i) => (
              <tr key={d.id} className={!d.is_active ? 'opacity-50' : ''}>
                <td className="text-center">{i + 1}</td>
                <td>
                  {editId === d.id ? (
                    <input className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={editNama} onChange={e => setEditNama(e.target.value)} />
                  ) : <span className="font-medium">{d.nama}</span>}
                </td>
                <td className="text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {d.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="text-center">
                  <div className="flex justify-center gap-1">
                    {editId === d.id ? (
                      <>
                        <button onClick={() => saveNama(d.id)} className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><Close className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <button onClick={() => { setEditId(d.id); setEditNama(d.nama); }} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><Pen className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => toggleActive(d.id, d.is_active)} className={`p-1.5 rounded-lg ${d.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {d.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
