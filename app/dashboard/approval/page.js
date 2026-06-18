'use client';

/**
 * @file Approval Queue & "Pekerjaan Saya".
 * - Admin: daftar periode (default: submitted) → Setujui / Kembalikan (wajib alasan) / Kunci.
 * - Operator: status periode yang dia ajukan.
 * Dilengkapi filter (tahun, bulan, tabel, status) + histori status ringkas.
 */

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, Lock, PaperPlane, Refresh, ExclamationCircle } from 'flowbite-react-icons/outline';
import { MONTHS } from '@/lib/dataPages';
import ConfirmModal from '@/components/ConfirmModal';

const STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', Icon: Clock },
  submitted: { label: 'Menunggu Review', className: 'bg-blue-50 text-blue-700', Icon: PaperPlane },
  approved: { label: 'Disetujui', className: 'bg-green-50 text-green-700', Icon: CheckCircle },
  locked: { label: 'Dikunci', className: 'bg-red-50 text-red-700', Icon: Lock },
};

const TABLE_OPTIONS = [
  { value: '', label: 'Semua tabel' },
  { value: 'data_umum', label: 'Data Umum' },
  { value: 'data_pokja1', label: 'Pokja I' },
  { value: 'data_pokja2', label: 'Pokja II' },
  { value: 'data_pokja3', label: 'Pokja III' },
  { value: 'data_pokja4', label: 'Pokja IV' },
  { value: 'data_rekap_dawis', label: 'Rekapitulasi Dawis' },
  { value: 'data_bumil', label: 'Data Bumil' },
];

function periodeLabel(p) {
  const bulan = p.bulan ? ` · ${MONTHS[p.bulan - 1]}` : '';
  return `${p.tableLabel} · ${p.tahun}${bulan}`;
}

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return null; }
}

export default function ApprovalPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ tahun: '', bulan: '', table_name: '', status: '' });
  // State modal alasan return: { period }
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  // Konfirmasi lock
  const [lockTarget, setLockTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
      const res = await fetch(`/api/periods/queue?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || {});
        setIsAdmin(!!data.isAdmin);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const act = async (p, action, notes) => {
    setActing(`${p.id}-${action}`);
    try {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: p.table_name, tahun: p.tahun, bulan: p.bulan, action, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Gagal memproses' });
      } else {
        setToast({ type: 'success', message: 'Status periode diperbarui' });
        await load();
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menghubungi server' });
    }
    setActing(null);
    setTimeout(() => setToast(null), 3000);
  };

  const submitReturn = async () => {
    if (!returnTarget) return;
    if (returnReason.trim().length < 3) {
      setToast({ type: 'error', message: 'Alasan revisi minimal 3 karakter.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const p = returnTarget;
    setReturnTarget(null);
    await act(p, 'return', returnReason.trim());
    setReturnReason('');
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ExclamationCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Modal konfirmasi lock */}
      <ConfirmModal
        isOpen={!!lockTarget}
        type="warning"
        title="Kunci periode?"
        message={lockTarget ? `Kunci ${periodeLabel(lockTarget)}? Data tidak bisa diedit sampai dibuka kembali oleh admin.` : ''}
        confirmText="Ya, kunci"
        cancelText="Batal"
        onConfirm={() => { const p = lockTarget; setLockTarget(null); if (p) act(p, 'lock'); }}
        onCancel={() => setLockTarget(null)}
      />

      {/* Modal alasan return */}
      {returnTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setReturnTarget(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-modal p-5" role="dialog" aria-modal="true" aria-label="Alasan revisi">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Kembalikan untuk Revisi</h3>
            <p className="text-sm text-gray-500 mb-3">{periodeLabel(returnTarget)}</p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alasan revisi (wajib)</label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Contoh: Jumlah KK Dusun Soko belum sesuai, mohon dicek ulang."
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setReturnTarget(null); setReturnReason(''); }} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Batal</button>
              <button onClick={submitReturn} className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg">Kembalikan</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PaperPlane className="w-7 h-7 text-primary-600" />
          {isAdmin ? 'Antrian Persetujuan' : 'Pekerjaan Saya'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin
            ? 'Periode laporan yang menunggu review dari operator. Setujui, kembalikan (dengan alasan), atau kunci.'
            : 'Status periode laporan yang Anda ajukan.'}
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${cfg.className}`}>
            <cfg.Icon className="w-3.5 h-3.5" /> {cfg.label}: {summary[key] || 0}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input
          type="number" min="2000" max="2100" placeholder="Tahun"
          value={filters.tahun} onChange={(e) => setFilters((f) => ({ ...f, tahun: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="Filter tahun"
        />
        <select value={filters.bulan} onChange={(e) => setFilters((f) => ({ ...f, bulan: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Filter bulan">
          <option value="">Semua bulan</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={filters.table_name} onChange={(e) => setFilters((f) => ({ ...f, table_name: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Filter tabel">
          {TABLE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" aria-label="Filter status">
          <option value="">{isAdmin ? 'Menunggu review (default)' : 'Semua status'}</option>
          {Object.entries(STATUS_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 glass rounded-3xl">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isAdmin ? 'Tidak ada periode yang cocok dengan filter.' : 'Belum ada periode yang Anda ajukan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            return (
              <div key={p.id} className="glass rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800">{periodeLabel(p)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
                      <cfg.Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  {/* Histori status ringkas */}
                  <div className="mt-1.5 text-[11px] text-gray-400 space-y-0.5">
                    {fmtDate(p.submitted_at) && <div>Diajukan: {fmtDate(p.submitted_at)}</div>}
                    {fmtDate(p.approved_at) && <div>Disetujui: {fmtDate(p.approved_at)}</div>}
                    {p.notes && <div className="text-amber-600">Catatan revisi: {p.notes}</div>}
                  </div>
                </div>

                {isAdmin && p.status === 'submitted' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => act(p, 'approve')} disabled={acting === `${p.id}-approve`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> Setujui
                    </button>
                    <button onClick={() => { setReturnTarget(p); setReturnReason(''); }} disabled={acting === `${p.id}-return`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg disabled:opacity-50">
                      <Refresh className="w-3 h-3" /> Kembalikan
                    </button>
                  </div>
                )}
                {isAdmin && p.status === 'approved' && (
                  <button onClick={() => setLockTarget(p)} disabled={acting === `${p.id}-lock`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg disabled:opacity-50">
                    <Lock className="w-3 h-3" /> Kunci
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
