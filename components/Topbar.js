'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ArrowRightToBracket, Lock, AngleDown, Bars } from 'flowbite-react-icons/outline';
import { User } from 'flowbite-react-icons/solid';

export default function Topbar({ user, onMobileMenuToggle, onOpenPasswordModal }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const roleBadgeColor = {
    admin: 'bg-red-100 text-red-700',
    sekretaris: 'bg-blue-100 text-blue-700',
    pokja1: 'bg-emerald-100 text-emerald-700',
    pokja2: 'bg-purple-100 text-purple-700',
    pokja3: 'bg-amber-100 text-amber-700',
    pokja4: 'bg-pink-100 text-pink-700',
    user: 'bg-gray-100 text-gray-600',
  };

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1">
        {/* Hamburger menu — mobile only */}
        <button
          className="md:hidden p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500"
          onClick={onMobileMenuToggle}
          aria-label="Buka menu"
        >
          <Bars className="w-5 h-5" />
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3 ml-4">
        {/* Notification (placeholder — fitur akan dihubungkan ke sistem notifikasi) */}
        <button
          className="relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Notifikasi (segera hadir)"
          aria-label="Notifikasi"
          disabled
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* Profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-gray-50 transition-colors"
            aria-label="Menu profil"
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
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 p-4 border-b border-gray-50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {getInitials(user?.nama_lengkap)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user?.nama_lengkap}</p>
                  <p className="text-xs text-gray-400 truncate">@{user?.username}</p>
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={handleProfile}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <User className="w-4 h-4" /> Profil Saya
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <Lock className="w-4 h-4" /> Ganti Password
                </button>
              </div>
              <div className="border-t border-gray-50 py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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
