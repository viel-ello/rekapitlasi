'use client';

import { useEffect, useState } from 'react';
import { Close, Refresh, Download } from 'flowbite-react-icons/outline';
import { Field } from './constants';

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({ user_id: '', table_name: '', action: '', desa: '', from: '', to: '' });
  const [selectedLog, setSelectedLog] = useState(null);
  const [users, setUsers] = useState([]);
  const [desaList, setDesaList] = useState([]);

  const TABLE_OPTIONS = [
    '', 'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
    'data_rekap_dawis', 'data_bumil', 'users', 'dusun', 'table_schemas',
    'table_column_overrides', 'report_periods', 'report_years',
  ];
  const ACTION_OPTIONS = [
    '', 'update', 'create', 'delete', 'import', 'export', 'ai_update', 'permission_denied',
    'period_submit', 'period_approve', 'period_return', 'period_lock', 'period_unlock',
  ];

  const LIMIT = 50;

  const fetchLogs = async (newOffset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
      for (const [k, v] of Object.entries(filters)) {
        if (v) params.set(k, v);
      }
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
        setTotal(data.total || 0);
        setOffset(newOffset);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(0);
    // Load dropdown options for filters
    (async () => {
      try {
        const [uRes, dRes] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/dusun')]);
        if (uRes.ok) setUsers(await uRes.json());
        if (dRes.ok) setDesaList(await dRes.json());
      } catch { /* silent */ }
    })();
  }, []);

  const applyFilters = () => fetchLogs(0);
  const resetFilters = () => {
    setFilters({ user_id: '', table_name: '', action: '', desa: '', from: '', to: '' });
    setTimeout(() => fetchLogs(0), 0);
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
    window.location.href = `/api/admin/logs/export?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
            <select value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">Semua user</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tabel</label>
            <select value={filters.table_name} onChange={(e) => setFilters({ ...filters, table_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {TABLE_OPTIONS.map(t => <option key={t} value={t}>{t || 'Semua tabel'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Aksi</label>
            <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a || 'Semua aksi'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dusun</label>
            <select value={filters.desa} onChange={(e) => setFilters({ ...filters, desa: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">Semua dusun</option>
              {desaList.map(d => <option key={d.id} value={d.nama}>{d.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dari tanggal</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sampai tanggal</label>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg">Terapkan</button>
            <button onClick={resetFilters} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">Reset</button>
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Riwayat Aktivitas ({total.toLocaleString('id-ID')} log)</h3>
          <button onClick={() => fetchLogs(offset)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg">
            <Refresh className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-gray-400 text-center py-8 text-sm">Memuat...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">Tidak ada log cocok dengan filter.</p>
        ) : (
          <>
            <div className="data-table-wrapper" style={{ maxHeight: '55vh' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>User</th>
                    <th>Tabel</th>
                    <th>Dusun</th>
                    <th>Aksi</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} onClick={() => setSelectedLog(l)} className="cursor-pointer hover:bg-primary-50/30">
                      <td className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                      <td><span className="font-medium">{l.username}</span></td>
                      <td><span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">{l.table_name}</span></td>
                      <td className="text-xs">{l.dusun_nama || l.desa_nama || '-'}</td>
                      <td><span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{l.action}</span></td>
                      <td className="text-xs text-gray-500 max-w-xs truncate" title={l.detail}>{l.detail || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>Menampilkan {offset + 1} - {Math.min(offset + LIMIT, total)} dari {total}</span>
              <div className="flex gap-1">
                <button onClick={() => fetchLogs(Math.max(0, offset - LIMIT))} disabled={offset === 0} className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50">Sebelumnya</button>
                <button onClick={() => fetchLogs(offset + LIMIT)} disabled={offset + LIMIT >= total} className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-50">Selanjutnya</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Detail Log</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Tutup">
                <Close className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
              <Field label="Waktu" value={new Date(selectedLog.created_at).toLocaleString('id-ID')} />
              <Field label="User" value={selectedLog.username} />
              <Field label="Action" value={selectedLog.action} />
              <Field label="Tabel" value={selectedLog.table_name} />
              <Field label="Dusun" value={selectedLog.dusun_nama || selectedLog.desa_nama || '-'} />
              <Field label="Detail" value={selectedLog.detail || '-'} />
              {selectedLog.ip && <Field label="IP" value={selectedLog.ip} />}
              {selectedLog.before_json && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Data Sebelum</div>
                  <pre className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] overflow-x-auto">{JSON.stringify(selectedLog.before_json, null, 2)}</pre>
                </div>
              )}
              {selectedLog.after_json && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">Data Sesudah</div>
                  <pre className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] overflow-x-auto">{JSON.stringify(selectedLog.after_json, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
