'use client';

/**
 * @file Approval Queue & "Pekerjaan Saya".
 * - Admin: daftar periode menunggu review (submitted) → tombol Setujui/Kembalikan/Kunci.
 * - Operator: status periode yang dia ajukan.
 */

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, Lock, PaperPlane, Refresh, ExclamationCircle } from 'flowbite-react-icons/outline';
import { MONTHS } from '@/lib/dataPages';

const STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', Icon: Clock },
  submitted: { label: 'Menunggu Review', className: 'bg-blue-50 text-blue-700', Icon: PaperPlane },
  approved: { label: 'Disetujui', className: 'bg-green-50 text-green-700', Icon: CheckCircle },
  locked: { label: 'Dikunci', className: 'bg-red-50 text-red-700', Icon: Lock },
};

function periodeLabel(p) {
  const bulan = p.bulan ? ` · ${MONTHS[p.bulan - 1]}` : '';
  return `${p.tableLabel} · ${p.tahun}${bulan}`;
}

export default function ApprovalPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/periods/queue');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || {});
        setIsAdmin(!!data.isAdmin);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (p, action) => {
    setActing(`${p.id}-${action}`);
    try {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: p.table_name, tahun: p.tahun, bulan: p.bulan, action }),
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

      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PaperPlane className="w-7 h-7 text-primary-600" />
          {isAdmin ? 'Antrian Persetujuan' : 'Pekerjaan Saya'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin
            ? 'Periode laporan yang menunggu review dari operator. Setujui, kembalikan, atau kunci.'
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

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isAdmin ? 'Tidak ada periode yang menunggu review.' : 'Belum ada periode yang Anda ajukan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800">{periodeLabel(p)}</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
                      <cfg.Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                    {p.notes && <span className="ml-2 text-xs text-gray-400">{p.notes}</span>}
                  </div>
                </div>

                {isAdmin && p.status === 'submitted' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => act(p, 'approve')} disabled={acting === `${p.id}-approve`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> Setujui
                    </button>
                    <button onClick={() => act(p, 'return')} disabled={acting === `${p.id}-return`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg disabled:opacity-50">
                      <Refresh className="w-3 h-3" /> Kembalikan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
