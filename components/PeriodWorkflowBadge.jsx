'use client';

/**
 * @file Badge status periode + tombol aksi workflow.
 *
 * Props:
 *   tableName: 'data_umum' | 'data_pokja1' | ...
 *   tahun: number
 *   bulan?: number | null  (untuk data_bumil)
 *   userRole: string
 *   canEdit: boolean       (apakah user boleh edit tabel ini via canWrite)
 *   onStatusChange?: () => void  (dipanggil setelah transisi sukses, biasanya refetch data)
 */

import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Lock, PaperPlane, Refresh } from 'flowbite-react-icons/outline';

const STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200', Icon: Clock },
  submitted: { label: 'Menunggu Review', className: 'bg-blue-50 text-blue-700 border-blue-200', Icon: PaperPlane },
  approved: { label: 'Disetujui', className: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle },
  locked: { label: 'Dikunci', className: 'bg-red-50 text-red-700 border-red-200', Icon: Lock },
};

export default function PeriodWorkflowBadge({ tableName, tahun, bulan = null, userRole, canEdit, onStatusChange }) {
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState(null);

  const fetchPeriod = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ table_name: tableName, tahun: String(tahun) });
      if (bulan !== null && bulan !== undefined) params.set('bulan', String(bulan));
      const res = await fetch(`/api/periods?${params.toString()}`);
      if (res.ok) {
        const rows = await res.json();
        setPeriod(rows[0] || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchPeriod(); }, [tableName, tahun, bulan]);

  const act = async (action) => {
    setActing(action);
    setError(null);
    try {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: tableName, tahun, bulan, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal mengubah status');
      } else {
        await fetchPeriod();
        if (onStatusChange) onStatusChange();
      }
    } catch {
      setError('Gagal menghubungi server');
    }
    setActing(null);
  };

  const status = period?.status || 'draft';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.Icon;

  const isAdmin = userRole === 'admin';
  const isSekretaris = userRole === 'sekretaris';

  // Tombol yang muncul per status + role
  const showSubmit = status === 'draft' && canEdit;
  const showApprove = status === 'submitted' && (isAdmin || isSekretaris);
  const showReturn = status === 'submitted' && (isAdmin || isSekretaris);
  const showLock = status === 'approved' && isAdmin;
  const showUnlock = (status === 'approved' || status === 'locked') && isAdmin;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}
        title={loading ? 'Memuat...' : `Status periode ${tahun}${bulan ? ` bulan ${bulan}` : ''}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>

      {showSubmit && (
        <button
          onClick={() => act('submit')}
          disabled={acting === 'submit'}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg disabled:opacity-50"
        >
          {acting === 'submit' ? 'Mengirim...' : 'Ajukan Review'}
        </button>
      )}
      {showApprove && (
        <button
          onClick={() => act('approve')}
          disabled={acting === 'approve'}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg disabled:opacity-50"
        >
          {acting === 'approve' ? 'Memproses...' : 'Setujui'}
        </button>
      )}
      {showReturn && (
        <button
          onClick={() => act('return')}
          disabled={acting === 'return'}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg disabled:opacity-50"
        >
          Kembalikan ke Draft
        </button>
      )}
      {showLock && (
        <button
          onClick={() => act('lock')}
          disabled={acting === 'lock'}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg disabled:opacity-50"
        >
          <Lock className="w-3 h-3" /> Kunci
        </button>
      )}
      {showUnlock && status === 'locked' && (
        <button
          onClick={() => act('unlock')}
          disabled={acting === 'unlock'}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50"
        >
          <Refresh className="w-3 h-3" /> Buka Kembali
        </button>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
