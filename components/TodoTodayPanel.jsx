'use client';

/**
 * @file "Yang perlu tindakan hari ini" — ringkasan aksi role-based di dashboard.
 *
 * - Admin: jumlah periode menunggu review (link ke Approval Queue) + dusun
 *   bermasalah (perlu dicek / belum lengkap).
 * - Operator/kader: dusun bermasalah pada tabel yang relevan + status periode
 *   yang dia ajukan (menunggu review / dikembalikan untuk revisi).
 *
 * Mengandalkan data completeness dari prop `completeness` (dari /api/rekap) +
 * fetch ringan ke /api/auth/me & /api/periods/queue.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PaperPlane, ExclamationCircle, CheckCircle, Refresh, ArrowRight } from 'flowbite-react-icons/outline';

export default function TodoTodayPanel({ completeness }) {
  const [me, setMe] = useState(null);
  const [queue, setQueue] = useState({ items: [], summary: {}, isAdmin: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const [meRes, qRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/periods/queue'),
        ]);
        if (!meRes.ok || !qRes.ok) throw new Error('Status pekerjaan belum tersedia');
        const [meData, queueData] = await Promise.all([meRes.json(), qRes.json()]);
        if (!cancelled) { setMe(meData); setQueue(queueData); }
      } catch { if (!cancelled) setError(true); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  if (loading) {
    return <div className="skeleton h-24 rounded-2xl" />;
  }
  if (error) {
    return <section className="glass rounded-3xl p-5"><h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Pekerjaan hari ini</h2><p role="status" className="text-xs text-gray-600 dark:text-gray-300 mt-2">Status persetujuan belum dapat dimuat.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="text-xs text-primary-700 dark:text-primary-300 font-semibold underline mt-3">Coba lagi</button></section>;
  }

  const isAdmin = me?.role === 'admin';
  const needsCheck = completeness?.needsCheck || 0;
  const incomplete = completeness?.incomplete || 0;
  const submittedCount = queue.summary?.submitted || 0;
  // Untuk operator: periode miliknya yang dikembalikan (draft dgn catatan) atau menunggu.
  const myReturned = (queue.items || []).filter((p) => p.status === 'draft' && p.notes).length;
  const myWaiting = (queue.items || []).filter((p) => p.status === 'submitted').length;

  const actions = [];

  if (isAdmin) {
    if (submittedCount > 0) {
      actions.push({
        key: 'review',
        icon: PaperPlane,
        tone: 'blue',
        text: `${submittedCount} periode menunggu review`,
        href: '/dashboard/approval',
        cta: 'Review',
      });
    }
    if (needsCheck > 0) {
      actions.push({ key: 'check', icon: ExclamationCircle, tone: 'amber', text: `${needsCheck} dusun perlu dicek`, href: null });
    }
    if (incomplete > 0) {
      actions.push({ key: 'incomplete', icon: ExclamationCircle, tone: 'red', text: `${incomplete} dusun belum lengkap`, href: null });
    }
  } else {
    if (myReturned > 0) {
      actions.push({
        key: 'returned',
        icon: Refresh,
        tone: 'amber',
        text: `${myReturned} periode dikembalikan untuk revisi`,
        href: '/dashboard/approval',
        cta: 'Lihat',
      });
    }
    if (myWaiting > 0) {
      actions.push({
        key: 'waiting',
        icon: PaperPlane,
        tone: 'blue',
        text: `${myWaiting} periode menunggu persetujuan admin`,
        href: '/dashboard/approval',
        cta: 'Lihat',
      });
    }
    if (needsCheck > 0) {
      actions.push({ key: 'check', icon: ExclamationCircle, tone: 'amber', text: `${needsCheck} dusun perlu dicek`, href: null });
    }
    if (incomplete > 0) {
      actions.push({ key: 'incomplete', icon: ExclamationCircle, tone: 'red', text: `${incomplete} dusun belum lengkap`, href: null });
    }
  }

  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };

  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-primary-600" /> Yang perlu tindakan hari ini
      </h2>
      {actions.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 text-green-500" /> Tidak ada tindakan mendesak. Semua terlihat baik.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            const body = (
              <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${toneClass[a.tone]}`}>
                <span className="flex items-center gap-2"><Icon className="w-4 h-4" /> {a.text}</span>
                {a.href && a.cta && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold">
                    {a.cta} <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            );
            return a.href
              ? <Link key={a.key} href={a.href} className="block hover:opacity-90 transition-opacity">{body}</Link>
              : <div key={a.key}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}
