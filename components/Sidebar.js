'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartPie, ClipboardList, Shield, BookOpen,
  Users, Cog, AngleRight, AngleLeft, Lock,
  ArrowRightToBracket, Swatchbook, Heart, UserCircle, ChartLineUp, PaperPlane
} from 'flowbite-react-icons/outline';
import Dialog from '@/components/ui/Dialog';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: ChartPie },
  { href: '/dashboard/data-umum', label: 'Data Umum', icon: ClipboardList },
  { href: '/dashboard/pokja1', label: 'Pokja I', icon: Shield, sub: 'Pancasila & Gotong Royong' },
  { href: '/dashboard/pokja2', label: 'Pokja II', icon: BookOpen, sub: 'Pendidikan & Koperasi' },
  { href: '/dashboard/pokja3', label: 'Pokja III', icon: Swatchbook, sub: 'Pangan & Sandang' },
  { href: '/dashboard/pokja4', label: 'Pokja IV', icon: Heart, sub: 'Kesehatan & Lingkungan' },
  { href: '/dashboard/rekap-dawis', label: 'Rekapitulasi Dawis', icon: Users },
  { href: '/dashboard/bumil', label: 'Data Bumil', icon: UserCircle },
  { href: '/dashboard/approval', label: 'Persetujuan', icon: PaperPlane, sub: 'Workflow & pekerjaan saya' },
  { href: '/dashboard/reports', label: 'Report Builder', icon: ChartLineUp, sub: 'Laporan kustom' },
];

const adminItems = [
  { href: '/dashboard/admin', label: 'Panel Admin', icon: Cog },
];

export default function Sidebar({
  user, onLogout, collapsed, onToggle, mobileOpen, onMobileClose,
  showPwModal: propPwModal, setShowPwModal: propSetPwModal,
}) {
  const pathname = usePathname();
  const [localPwModal, setLocalPwModal] = useState(false);
  const showPwModal = propPwModal !== undefined ? propPwModal : localPwModal;
  const setShowPwModal = propSetPwModal || setLocalPwModal;
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);

  const isActive = (href) => href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.new !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'Password baru tidak cocok' }); return; }
    if (pwForm.new.length < 12) { setPwMsg({ type: 'error', text: 'Password minimal 12 karakter' }); return; }
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.old, newPassword: pwForm.new }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: 'success', text: data.message || 'Password berhasil diubah. Silakan login kembali.' });
        setPwForm({ old: '', new: '', confirm: '' });
        setTimeout(() => { setShowPwModal(false); setPwMsg(null); onLogout?.(); }, 2000);
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
              />
            </div>
            <div className="brand-text min-w-0">
              <h3 className="text-sm font-bold text-primary-700 truncate">Lumbung PKK</h3>
              <span className="text-[0.65rem] text-gray-700 dark:text-gray-300 font-medium">Desa Belikurip</span>
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
            />
            <AngleRight className="w-3 h-3 text-gray-600 dark:text-gray-300" />
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
                title={collapsed ? (item.label + (item.sub ? ' — ' + item.sub : '')) : undefined}
                aria-label={item.label + (item.sub ? ' — ' + item.sub : '')}
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
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
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
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 block truncate">{user.nama_lengkap}</span>
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{user.role}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <button className="nav-item" onClick={() => setShowPwModal(true)} aria-label="Ganti password">
            <span className="nav-icon"><Lock className="w-5 h-5" /></span>
            {!collapsed && <span>Ganti Password</span>}
          </button>
          <button className="nav-item text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/40" onClick={onLogout} aria-label="Keluar dari aplikasi">
            <span className="nav-icon"><ArrowRightToBracket className="w-5 h-5" /></span>
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>

      {/* Password Modal */}
      <Dialog
        open={showPwModal}
        onClose={() => { setShowPwModal(false); setPwMsg(null); }}
        title="Ganti Password"
        panelClassName="relative z-10 glass-panel rounded-3xl w-full max-w-sm p-6"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Ganti Password</h3>
        {pwMsg && (
          <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
            {pwMsg.text}
          </div>
        )}
        <form onSubmit={handlePwSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Lama</label>
            <input type="password" className="w-full px-3 py-2 glass-input rounded-xl text-sm outline-none" value={pwForm.old} onChange={e => setPwForm({...pwForm, old: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Baru</label>
            <input type="password" minLength={12} className="w-full px-3 py-2 glass-input rounded-xl text-sm outline-none" value={pwForm.new} onChange={e => setPwForm({...pwForm, new: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konfirmasi Password</label>
            <input type="password" minLength={12} className="w-full px-3 py-2 glass-input rounded-xl text-sm outline-none" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">Simpan</button>
            <button type="button" onClick={() => { setShowPwModal(false); setPwMsg(null); }} className="flex-1 glass-pill text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2 rounded-xl text-sm font-semibold transition-colors">Batal</button>
          </div>
        </form>
      </Dialog>
    </aside>
  );
}
