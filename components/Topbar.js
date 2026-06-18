'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ArrowRightToBracket, Lock, AngleDown, Bars, Sun, Moon, Cog } from 'flowbite-react-icons/outline';
import { User } from 'flowbite-react-icons/solid';
import { timeAgo } from '@/lib/time';
import { useTheme } from '@/lib/useTheme';

export default function Topbar({ user, onMobileMenuToggle, onOpenPasswordModal }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifItems(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh tiap 1 menit
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') { setShowDropdown(false); setShowNotif(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    localStorage.removeItem('user');
    router.push('/');
  };
  const handleProfile = () => {
    setShowDropdown(false);
    router.push('/dashboard/profile');
  };

  const handleChangePassword = () => {
    setShowDropdown(false);
    if (onOpenPasswordModal) onOpenPasswordModal();
    else router.push('/dashboard/profile');
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const markOneRead = async (id) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const roleBadgeColor = {
    admin: 'bg-red-100 text-red-700',
    pokja1: 'bg-emerald-100 text-emerald-700',
    pokja2: 'bg-purple-100 text-purple-700',
    pokja3: 'bg-amber-100 text-amber-700',
    pokja4: 'bg-pink-100 text-pink-700',
    user: 'bg-gray-100 text-gray-600',
  };

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl backdrop-saturate-150 border-b border-white/40 dark:border-white/10 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1">
        <button
          className="md:hidden p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500"
          onClick={onMobileMenuToggle}
          aria-label="Buka menu"
        >
          <Bars className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 ml-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) fetchNotifications(); }}
            className="relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Notifikasi"
            aria-haspopup="true"
            aria-expanded={showNotif}
            aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-modal z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Notifikasi</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-primary-600 hover:text-primary-700">Tandai semua dibaca</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifItems.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">Belum ada notifikasi</div>
                ) : (
                  notifItems.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { markOneRead(n.id); if (n.link) router.push(n.link); setShowNotif(false); }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{n.title}</div>
                          {n.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>}
                          <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                <Link href="/dashboard/notifications" onClick={() => setShowNotif(false)} className="text-xs font-medium text-primary-600 hover:text-primary-700">Lihat semua</Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-gray-50 transition-colors"
            aria-label="Menu profil"
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(user?.nama_lengkap)}
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-800 leading-tight">{user?.nama_lengkap || 'User'}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.65rem] font-medium ${roleBadgeColor[user?.role] || roleBadgeColor.user}`}>
                {user?.role || 'user'}
              </span>
            </div>
            <AngleDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-modal z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 p-4 border-b border-gray-50 dark:border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {getInitials(user?.nama_lengkap)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.nama_lengkap}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{user?.username}</p>
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={handleProfile}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <User className="w-4 h-4" /> Profil Saya
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <Lock className="w-4 h-4" /> Ganti Password
                </button>
              </div>

              {/* Theme switcher */}
              <div className="border-t border-gray-50 dark:border-gray-800 py-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tema</div>
                <div className="px-3 pb-2 flex gap-1">
                  <ThemeBtn current={theme} value="light" onClick={() => setTheme('light')} icon={Sun} label="Terang" />
                  <ThemeBtn current={theme} value="dark" onClick={() => setTheme('dark')} icon={Moon} label="Gelap" />
                  <ThemeBtn current={theme} value="system" onClick={() => setTheme('system')} icon={Cog} label="Sistem" />
                </div>
              </div>

              <div className="border-t border-gray-50 dark:border-gray-800 py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-950/40"
                >
                  <ArrowRightToBracket className="w-4 h-4" /> Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


function ThemeBtn({ current, value, onClick, icon: Icon, label }) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
      aria-pressed={active}
      aria-label={`Tema ${label}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
