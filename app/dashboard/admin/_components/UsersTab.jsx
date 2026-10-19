'use client';

import { useEffect, useState } from 'react';
import { Plus, Close, Check, Pen, TrashBin } from 'flowbite-react-icons/outline';
import ConfirmModal from '@/components/ConfirmModal';
import { ROLES, ROLE_LABELS } from './constants';

export default function UsersTab({ toast, setToast }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => { fetchUsers(); }, []);
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) { setToast({ type: 'error', message: 'Gagal memuat data pengguna' }); setTimeout(() => setToast(null), 3000); return; }
      setUsers(await res.json());
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); setTimeout(() => setToast(null), 3000); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { username: fd.get('username'), password: fd.get('password'), role: fd.get('role'), nama_lengkap: fd.get('nama_lengkap') };
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setToast({ type: 'success', message: 'User berhasil ditambahkan' }); setShowForm(false); fetchUsers(); }
    else { const err = await res.json(); setToast({ type: 'error', message: err.error }); }
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdate = async (id) => {
    const body = { id, ...editForm };
    if (!body.password) delete body.password;
    const res = await fetch(`/api/admin/users`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setToast({ type: 'success', message: 'User berhasil diperbarui' }); setEditId(null); fetchUsers(); }
    else { const err = await res.json(); setToast({ type: 'error', message: err.error }); }
    setTimeout(() => setToast(null), 3000);
  };

  const confirmDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Pengguna',
      message: 'Apakah Anda yakin ingin menghapus pengguna ini secara permanen?',
      onConfirm: () => { setConfirmDialog({ isOpen: false }); handleDelete(id); },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ type: 'success', message: 'User dihapus' });
        fetchUsers();
      } else {
        const data = await res.json();
        setToast({ type: 'error', message: data.error || 'Gagal menghapus user' });
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <ConfirmModal {...confirmDialog} />
      <div className="mb-4">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
          {showForm ? <><Close className="w-4 h-4" /> Batal</> : <><Plus className="w-4 h-4" /> Tambah Pengguna</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
              <input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_.-]+" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <input name="password" type="password" required minLength={12} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nama Lengkap</label>
              <input name="nama_lengkap" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select name="role" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Role kader-dusun otomatis di-link ke dusun yang sesuai dan hanya bisa mengedit Data Umum, Rekapitulasi Dawis, dan Data Bumil dari dusun mereka sendiri. Pilih role pokja1-4 / admin untuk akses lintas dusun.
              </p>
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Check className="w-4 h-4" /> Simpan
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Role</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.username}</td>
                  <td>
                    {editId === u.id ? (
                      <input className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none" defaultValue={u.nama_lengkap} onChange={e => setEditForm(f => ({ ...f, nama_lengkap: e.target.value }))} />
                    ) : u.nama_lengkap}
                  </td>
                  <td>
                    {editId === u.id ? (
                      <select className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none" defaultValue={u.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{u.role}</span>
                    )}
                  </td>
                  <td className="text-center">
                    {u.username !== 'admin' && (
                      editId === u.id ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleUpdate(u.id)} aria-label={`Simpan perubahan untuk ${u.username}`} title="Simpan" className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditId(null)} aria-label={`Batalkan edit ${u.username}`} title="Batal" className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><Close className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setEditId(u.id); setEditForm({}); }} aria-label={`Edit pengguna ${u.username}`} title="Edit" className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><Pen className="w-4 h-4" /></button>
                          <button onClick={() => confirmDelete(u.id)} aria-label={`Hapus pengguna ${u.username}`} title="Hapus" className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><TrashBin className="w-4 h-4" /></button>
                        </div>
                      )
                    )}
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
