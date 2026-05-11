'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartPie, ClipboardList, Shield, BookOpen,
  Users, Cog, AngleRight, AngleLeft, Lock,
  ArrowRightToBracket, Swatchbook, Heart, UserCircle
} from 'flowbite-react-icons/outline';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: ChartPie },
  { href: '/dashboard/data-umum', label: 'Data Umum', icon: ClipboardList },
  { href: '/dashboard/pokja1', label: 'Pokja I', icon: Shield, sub: 'Pancasila & Gotong Royong' },
  { href: '/dashboard/pokja2', label: 'Pokja II', icon: BookOpen, sub: 'Pendidikan & Koperasi' },
  { href: '/dashboard/pokja3', label: 'Pokja III', icon: Swatchbook, sub: 'Pangan & Sandang' },
  { href: '/dashboard/pokja4', label: 'Pokja IV', icon: Heart, sub: 'Kesehatan & Lingkungan' },
  { href: '/dashboard/kegiatan-warga', label: 'Kegiatan Warga', icon: Users },
  { href: '/dashboard/bumil', label: 'Data Bumil', icon: UserCircle },
];

const adminItems = [
  { href: '/dashboard/admin', label: 'Panel Admin', icon: Cog },
];

export default function Sidebar({ user, onLogout, collapsed, onToggle, mobileOpen, onMobileClose }) {
  const pathname = usePathname();
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);

  const isActive = (href) => href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.new !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'Password baru tidak cocok' }); return; }
    if (pwForm.new.length < 6) { setPwMsg({ type: 'error', text: 'Password minimal 6 karakter' }); return; }
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.old, newPassword: pwForm.new }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: 'success', text: 'Password berhasil diubah' });
        setPwForm({ old: '', new: '', confirm: '' });
        setTimeout(() => { setShowPwModal(false); setPwMsg(null); }, 2000);
      } else {
        setPwMsg({ type: 'error', text: data.error || 'Gagal mengubah password' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Gagal terhubung ke server' });
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : 'sidebar-mobile-hidden'}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        {!collapsed && (
          <>
            <div className="flex-shrink-0 overflow-hidden rounded-full bg-primary-50 flex items-center justify-center w-9 h-9">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-9 h-9 object-cover rounded-full"
                onError={(e) => { e.currentTarget.src = '/map-baturetno.svg'; e.currentTarget.classList.replace('object-cover', 'object-contain'); }}
              />
            </div>
            <div className="brand-text min-w-0">
              <h3 className="text-sm font-bold text-gray-800 truncate">PKK Rekapitulasi</h3>
              <span className="text-[0.65rem] text-gray-400">Kec. Baturetno</span>
            </div>
            <button className="sidebar-toggle" onClick={onToggle} aria-label="Tutup sidebar">
              <AngleLeft className="w-4 h-4" />
            </button>
          </>
        )}
        {collapsed && (
          <button
            onClick={onToggle}
            aria-label="Buka sidebar"
            className="w-full flex flex-col items-center gap-1 py-1"
            title="Buka Menu"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="w-8 h-8 object-cover rounded-full"
              onError={(e) => { e.currentTarget.src = '/map-baturetno.svg'; e.currentTarget.classList.replace('object-cover', 'object-contain'); }}
            />
            <AngleRight className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div>
          {!collapsed && <span className="nav-section-title">Menu Utama</span>}
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''}`}
                title={item.label}
              >
                <span className="nav-icon"><Icon className="w-5 h-5" /></span>
                {!collapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.sub && <span className="nav-sub truncate">{item.sub}</span>}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {user?.role === 'admin' && (
          <div className="mt-4">
            {!collapsed && <span className="nav-section-title">Administrasi</span>}
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''}`}
                  title={item.label}
                >
                  <span className="nav-icon"><Icon className="w-5 h-5" /></span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="sidebar-user-card mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.nama_lengkap?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-gray-800 block truncate">{user.nama_lengkap}</span>
              <span className="text-xs text-gray-400">{user.role}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <button className="nav-item" onClick={() => setShowPwModal(true)}>
            <span className="nav-icon"><Lock className="w-5 h-5" /></span>
            {!collapsed && <span>Ganti Password</span>}
          </button>
          <button className="nav-item text-red-500 hover:!text-red-600 hover:!bg-red-50" onClick={onLogout}>
            <span className="nav-icon"><ArrowRightToBracket className="w-5 h-5" /></span>
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPwModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Ganti Password</h3>
            {pwMsg && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {pwMsg.text}
              </div>
            )}
            <form onSubmit={handlePwSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password Lama</label>
                <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" value={pwForm.old} onChange={e => setPwForm({...pwForm, old: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password Baru</label>
                <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" value={pwForm.new} onChange={e => setPwForm({...pwForm, new: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Konfirmasi Password</label>
                <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">Simpan</button>
                <button type="button" onClick={() => { setShowPwModal(false); setPwMsg(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium transition-colors">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
