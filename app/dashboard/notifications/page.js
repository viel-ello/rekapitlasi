'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle } from 'flowbite-react-icons/outline';
import EmptyState from '@/components/EmptyState';
import { timeAgo } from '@/lib/time';

const TYPE_LABEL = {
  period_submitted: 'Periode diajukan',
  period_approved: 'Periode disetujui',
  period_returned: 'Periode dikembalikan',
  period_locked: 'Periode dikunci',
  system: 'Sistem',
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter === 'unread') params.set('unread', '1');
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      await load();
    } catch { /* silent */ }
  };

  const markOneRead = async (id) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch { /* silent */ }
  };

  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-7 h-7" /> Notifikasi
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Pemberitahuan terkait workflow dan aktivitas sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-xl border border-gray-200 p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'unread' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Belum Dibaca{unreadCount > 0 && ` (${unreadCount})`}
            </button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl">
              Tandai semua dibaca
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
            description="Notifikasi akan muncul saat ada aktivitas workflow atau sistem yang relevan dengan Anda."
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(n => (
              <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-600 mt-2 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                      {n.body && <div className="text-sm text-gray-600 mt-1">{n.body}</div>}
                      <div className="text-xs text-gray-400 mt-1.5">
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 mr-2">{TYPE_LABEL[n.type] || n.type}</span>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markOneRead(n.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100"
                        aria-label="Tandai sudah dibaca"
                        title="Tandai dibaca"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={() => markOneRead(n.id)}
                      className="inline-block mt-2 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Buka halaman terkait →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
