'use client';

import { useEffect, useState } from 'react';
import {
  User, MapPin, ClipboardList, Cog,
  Plus, Close, Check, Pen, TrashBin, Ban,
  Refresh, Download, Upload, List, Eye, EyeSlash
} from 'flowbite-react-icons/outline';
import ConfirmModal from '@/components/ConfirmModal';
import { DATA_PAGES as DATA_PAGES_CLIENT } from '@/lib/dataPages';

const TABS = [
  { id: 'users', label: 'Pengguna', icon: User },
  { id: 'desa', label: 'Desa', icon: MapPin },
  { id: 'columns', label: 'Kolom', icon: List },
  { id: 'logs', label: 'Log Aktivitas', icon: ClipboardList },
  { id: 'import', label: 'Import Excel', icon: Upload },
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
      {tab === 'import' && <ImportTab toast={toast} setToast={setToast} />}
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
  const fetchDesa = async () => {
    try {
      const res = await fetch('/api/admin/desa');
      if (!res.ok) { setToast({ type: 'error', message: 'Gagal memuat data desa' }); setTimeout(() => setToast(null), 3000); return; }
      setDesa(await res.json());
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); setTimeout(() => setToast(null), 3000); }
  };

  const saveNama = async (id) => {
    try {
      const res = await fetch('/api/admin/desa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nama: editNama }) });
      if (res.ok) { setToast({ type: 'success', message: 'Nama desa diperbarui' }); setEditId(null); fetchDesa(); }
      else { const err = await res.json(); setToast({ type: 'error', message: err.error || 'Gagal memperbarui' }); }
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); }
    setTimeout(() => setToast(null), 3000);
  };

  const toggleActive = async (id, current) => {
    try {
      const res = await fetch('/api/admin/desa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: current ? 0 : 1 }) });
      if (res.ok) { setToast({ type: 'success', message: current ? 'Desa dinonaktifkan' : 'Desa diaktifkan' }); }
      else { const err = await res.json(); setToast({ type: 'error', message: err.error || 'Gagal memperbarui' }); }
    } catch { setToast({ type: 'error', message: 'Gagal menghubungi server' }); }
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
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      if (!res.ok) return;
      setLogs(await res.json());
    } catch {}
  };

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

function ImportTab({ toast, setToast }) {
  const [importing, setImporting] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importTahun, setImportTahun] = useState(new Date().getFullYear());

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tahun', importTahun);
    try {
      const res = await fetch('/api/import/excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.type === 'import_preview') {
        setImportPreview(data);
        setToast({ type: 'success', message: 'Preview import siap direview' });
      } else {
        setToast({ type: 'error', message: data.error || 'Gagal membuat preview import' });
      }
    } catch { setToast({ type: 'error', message: 'Gagal mengimpor file' }); }
    setImporting(false);
    e.target.value = '';
    setTimeout(() => setToast(null), 3000);
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setConfirmingImport(true);
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData: importPreview.parsedData, tahun: importTahun }),
      });
      const data = await res.json();
      setToast({ type: res.ok ? 'success' : 'error', message: data.message || data.error || 'Import selesai' });
      if (res.ok) setImportPreview(null);
    } catch {
      setToast({ type: 'error', message: 'Gagal menyimpan hasil import' });
    }
    setConfirmingImport(false);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      {importPreview && (
        <ImportPreviewModal
          preview={importPreview}
          tahun={importTahun}
          setTahun={setImportTahun}
          confirming={confirmingImport}
          onCancel={() => setImportPreview(null)}
          onConfirm={confirmImport}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Upload className="w-5 h-5" /> Import dari Excel
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Unggah file Excel dengan format template resmi. Sistem akan menampilkan preview perubahan sebelum disimpan ke database.
          </p>
          <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="import-year">Tahun import</label>
          <select
            id="import-year"
            value={importTahun}
            onChange={(e) => setImportTahun(Number(e.target.value))}
            className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
            {importing ? '⏳ Memproses...' : <><Upload className="w-4 h-4" /> Pilih File Excel</>}
            <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Download className="w-5 h-5" /> Unduh Template
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Download template Excel kosong untuk setiap tabel. Isi, lalu unggah kembali di panel import.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'data_umum', label: 'Data Umum' },
              { key: 'data_pokja1', label: 'Pokja I' },
              { key: 'data_pokja2', label: 'Pokja II' },
              { key: 'data_pokja3', label: 'Pokja III' },
              { key: 'data_pokja4', label: 'Pokja IV' },
              { key: 'data_kegiatan_warga', label: 'Kegiatan Warga' },
              { key: 'data_bumil', label: 'Data Bumil' },
            ].map(t => (
              <a key={t.key} href={`/api/export/template?table=${t.key}`} download
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                <Download className="w-3 h-3" /> {t.label}
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-amber-50 rounded-2xl border border-amber-100 p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-1">Catatan</h4>
          <p className="text-xs text-amber-700">
            Database utama disimpan di Supabase. Untuk backup penuh, gunakan fitur backup bawaan Supabase Dashboard.
            Fitur import/export Excel di sini hanya untuk pertukaran data periodik per tabel.
          </p>
        </div>
      </div>
    </>
  );
}

function ImportPreviewModal({ preview, tahun, setTahun, confirming, onCancel, onConfirm }) {
  const totals = (preview.diff || []).reduce((acc, sheet) => {
    acc.insert += sheet.counts?.insert || 0;
    acc.update += sheet.counts?.update || 0;
    acc.skip += sheet.counts?.skip || 0;
    acc.error += sheet.counts?.error || 0;
    return acc;
  }, { insert: 0, update: 0, skip: 0, error: 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Preview Import Excel</h3>
            <p className="text-sm text-gray-500">{preview.fileName} - data belum disimpan</p>
          </div>
          <button onClick={onCancel} className="self-start sm:self-auto px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50" aria-label="Tutup preview import">
            Tutup
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl border border-green-100 bg-green-50 p-3"><div className="text-xl font-bold text-green-700">{totals.insert}</div><div className="text-xs text-green-700">Baru</div></div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-xl font-bold text-blue-700">{totals.update}</div><div className="text-xs text-blue-700">Diubah</div></div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="text-xl font-bold text-gray-700">{totals.skip}</div><div className="text-xs text-gray-600">Dilewati</div></div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3"><div className="text-xl font-bold text-red-700">{totals.error}</div><div className="text-xs text-red-700">Gagal</div></div>
          </div>

          {preview.parseErrors?.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.parseErrors.map((error, index) => <div key={index}>{error}</div>)}
            </div>
          )}

          {(preview.diff || []).map((sheet, index) => (
            <div key={`${sheet.tableName}-${index}`} className="mb-6 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-800">{sheet.sheetName}</div>
                  <div className="text-xs text-gray-500">{sheet.tableName}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-green-50 text-green-700">{sheet.counts?.insert || 0} baru</span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{sheet.counts?.update || 0} ubah</span>
                  <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">{sheet.counts?.skip || 0} skip</span>
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700">{sheet.counts?.error || 0} gagal</span>
                </div>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Aksi</th>
                      <th className="px-3 py-2 text-left">Desa</th>
                      <th className="px-3 py-2 text-left">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(sheet.rows || []).map((row, rowIndex) => (
                      <tr key={rowIndex} className={row.action === 'error' ? 'bg-red-50/40' : row.action === 'update' ? 'bg-blue-50/30' : row.action === 'insert' ? 'bg-green-50/30' : ''}>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            row.action === 'error' ? 'bg-red-100 text-red-700' :
                            row.action === 'update' ? 'bg-blue-100 text-blue-700' :
                            row.action === 'insert' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{row.action}</span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800">{row.desaName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">
                          {row.reason || `${Object.keys(row.incoming || {}).length} kolom terbaca`}
                          {row.issueCount > 0 && row.action !== 'error' && (
                            <span className="ml-2 text-amber-600">Ada {row.issueCount} peringatan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(sheet.rows || []).length === 0 && (
                      <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-400">Tidak ada baris terbaca.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="confirm-import-year" className="text-sm font-medium text-gray-700">Tahun</label>
            <select id="confirm-import-year" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium">Batal</button>
            <button onClick={onConfirm} disabled={confirming || totals.error > 0 || (totals.insert + totals.update) === 0} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {confirming ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnsTab({ toast, setToast }) {
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
    { value: 'data_kegiatan_warga', label: 'Kegiatan Warga' },
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

  useEffect(() => { fetchOverrides(); setEditing({}); }, [tableName]);

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
    { value: 'data_kegiatan_warga', label: 'Kegiatan Warga' },
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
