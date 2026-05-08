'use client';

import { useEffect, useState } from 'react';
import {
  User, MapPin, ClipboardList, Database, Cog,
  Plus, Close, Check, Pen, TrashBin, Ban,
  Refresh, Download, Upload, List
} from 'flowbite-react-icons/outline';
import ConfirmModal from '@/components/ConfirmModal';

const TABS = [
  { id: 'users', label: 'Pengguna', icon: User },
  { id: 'desa', label: 'Desa', icon: MapPin },
  { id: 'columns', label: 'Kolom Dinamis', icon: List },
  { id: 'logs', label: 'Log Aktivitas', icon: ClipboardList },
  { id: 'backup', label: 'Database', icon: Database },
];

const ROLES = ['admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'sekretaris', 'user'];

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const [toast, setToast] = useState(null);

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{toast.message}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Cog className="w-7 h-7" /> Panel Admin
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola pengguna, desa, dan pengaturan sistem</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'users' && <UsersTab toast={toast} setToast={setToast} />}
      {tab === 'desa' && <DesaTab toast={toast} setToast={setToast} />}
      {tab === 'columns' && <ColumnsTab toast={toast} setToast={setToast} />}
      {tab === 'logs' && <LogsTab />}
      {tab === 'backup' && <BackupTab toast={toast} setToast={setToast} />}
    </div>
  );
}

function UsersTab({ toast, setToast }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => { fetchUsers(); }, []);
  const fetchUsers = async () => { const res = await fetch('/api/admin/users'); setUsers(await res.json()); };

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
              <input name="username" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
              <input name="password" type="password" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nama Lengkap</label>
              <input name="nama_lengkap" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select name="role" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
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
                      <select className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none" defaultValue={u.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{u.role}</span>
                    )}
                  </td>
                  <td className="text-center">
                    {u.username !== 'admin' && (
                      editId === u.id ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleUpdate(u.id)} className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><Close className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setEditId(u.id); setEditForm({}); }} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><Pen className="w-4 h-4" /></button>
                          <button onClick={() => confirmDelete(u.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><TrashBin className="w-4 h-4" /></button>
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

function DesaTab({ toast, setToast }) {
  const [desa, setDesa] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState('');

  useEffect(() => { fetchDesa(); }, []);
  const fetchDesa = async () => { const res = await fetch('/api/admin/desa'); setDesa(await res.json()); };

  const saveNama = async (id) => {
    const res = await fetch(`/api/admin/desa/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: editNama }) });
    if (res.ok) { setToast({ type: 'success', message: 'Nama desa diperbarui' }); setEditId(null); fetchDesa(); }
    setTimeout(() => setToast(null), 3000);
  };

  const toggleActive = async (id, current) => {
    await fetch(`/api/admin/desa/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: current ? 0 : 1 }) });
    setToast({ type: 'success', message: current ? 'Desa dinonaktifkan' : 'Desa diaktifkan' });
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
              <th>Nama Desa</th>
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

function LogsTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { fetchLogs(); }, []);
  const fetchLogs = async () => { const res = await fetch('/api/admin/logs'); setLogs(await res.json()); };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Riwayat Perubahan Data</h3>
        <button onClick={fetchLogs} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors">
          <Refresh className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="text-gray-400 text-center py-8 text-sm">Belum ada log aktivitas</p>
      ) : (
        <div className="data-table-wrapper" style={{ maxHeight: '60vh' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>User</th>
                <th>Tabel</th>
                <th>Desa</th>
                <th>Tahun</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                  <td><span className="font-medium">{l.username}</span></td>
                  <td><span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">{l.table_name}</span></td>
                  <td>{l.desa_nama}</td>
                  <td className="text-center">{l.tahun}</td>
                  <td><span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{l.action}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BackupTab({ toast, setToast }) {
  const [restoring, setRestoring] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const handleRestoreClick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Timpa Database',
      message: 'Peringatan: Data saat ini akan DITIMPA dengan data dari file backup. Tindakan ini tidak dapat dibatalkan. Lanjutkan?',
      onConfirm: () => { setConfirmDialog({ isOpen: false }); processRestore(file, e.target); },
      onCancel: () => { setConfirmDialog({ isOpen: false }); e.target.value = ''; }
    });
  };

  const processRestore = async (file, inputEl) => {
    setRestoring(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/restore', { method: 'POST', body: formData });
      const data = await res.json();
      setToast({ type: res.ok ? 'success' : 'error', message: data.message || data.error });
    } catch { setToast({ type: 'error', message: 'Gagal memulihkan database' }); }
    setRestoring(false);
    if (inputEl) inputEl.value = '';
    setTimeout(() => setToast(null), 3000);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/import/excel', { method: 'POST', body: formData });
      const data = await res.json();
      setToast({ type: res.ok ? 'success' : 'error', message: data.message || data.error });
    } catch { setToast({ type: 'error', message: 'Gagal mengimpor file' }); }
    setImporting(false);
    e.target.value = '';
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <ConfirmModal {...confirmDialog} />
      <div className="grid gap-4 md:grid-cols-3">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><Download className="w-5 h-5" /> Backup Database</h3>
        <p className="text-xs text-gray-400 mb-4">Unduh seluruh database sebagai file .db untuk cadangan data.</p>
        <a href="/api/admin/backup" download className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Download className="w-4 h-4" /> Unduh Backup
        </a>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><Refresh className="w-5 h-5" /> Restore Database</h3>
        <p className="text-xs text-gray-400 mb-4">Unggah file backup .db. <strong className="text-red-500">Data saat ini akan ditimpa!</strong></p>
        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
          {restoring ? '⏳ Memulihkan...' : <><Upload className="w-4 h-4" /> Pilih File .db</>}
          <input type="file" accept=".db" onChange={handleRestoreClick} className="hidden" disabled={restoring} />
        </label>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><Upload className="w-5 h-5" /> Import Excel</h3>
        <p className="text-xs text-gray-400 mb-4">Unggah file Excel hasil export untuk mengisi data otomatis.</p>
        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
          {importing ? '⏳ Mengimpor...' : <><Upload className="w-4 h-4" /> Pilih File Excel</>}
          <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" disabled={importing} />
        </label>
      </div>
    </div>
    </>
  );
}

function ColumnsTab({ toast, setToast }) {
  const [columns, setColumns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const TABLES = [
    { value: 'data_umum', label: 'Data Umum' },
    { value: 'data_pokja1', label: 'Pokja I' },
    { value: 'data_pokja2', label: 'Pokja II' },
    { value: 'data_pokja3', label: 'Pokja III' },
    { value: 'data_pokja4', label: 'Pokja IV' },
    { value: 'data_kegiatan_warga', label: 'Kegiatan Warga' },
    { value: 'data_bumil', label: 'Data Ibu Hamil' },
  ];

  useEffect(() => { fetchColumns(); }, []);
  const fetchColumns = async () => { const res = await fetch('/api/admin/columns'); setColumns(await res.json()); };

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
