'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartPie, ClipboardList, Shield, BookOpen,
  Users, Cog, AngleLeft, Lock,
  ArrowRightToBracket, Swatchbook, Heart, UserCircle, ChartLineUp, PaperPlane
} from 'flowbite-react-icons/outline';
import Dialog from '@/components/ui/Dialog';
import { motion, useReducedMotion } from 'framer-motion';

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
  user, onLogout, collapsed, onToggle, mobileOpen, onMobileClose, isMobile = false,
  showPwModal: propPwModal, setShowPwModal: propSetPwModal,
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [localPwModal, setLocalPwModal] = useState(false);
  const showPwModal = propPwModal !== undefined ? propPwModal : localPwModal;
  const setShowPwModal = propSetPwModal || setLocalPwModal;
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const asideRef = useRef(null);

  useEffect(() => {
    if (isMobile && mobileOpen) {
      asideRef.current?.querySelector('button, a[href]')?.focus();
    }
  }, [isMobile, mobileOpen]);

  const handleDrawerKeyDown = (event) => {
    if (!isMobile || !mobileOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onMobileClose?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = asideRef.current?.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !asideRef.current.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !asideRef.current.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  const isActive = (href) => {
    if (!pathname) return false;
    return href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  };

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
    <aside id="dashboard-sidebar" ref={asideRef} onKeyDown={handleDrawerKeyDown}
      role={isMobile ? 'dialog' : undefined} aria-modal={isMobile && mobileOpen ? true : undefined}
      aria-label={isMobile ? 'Menu navigasi' : undefined} aria-hidden={isMobile && !mobileOpen ? true : undefined}
      inert={isMobile && !mobileOpen ? true : undefined}
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : 'sidebar-mobile-hidden'}`}>
      {/* Brand */}
      <div
        className="sidebar-brand"
        onClick={collapsed ? onToggle : undefined}
        role={collapsed ? 'button' : undefined}
        tabIndex={collapsed ? 0 : undefined}
        aria-label={collapsed ? 'Buka sidebar' : undefined}
        aria-expanded={collapsed ? false : undefined}
        aria-controls={collapsed ? 'dashboard-sidebar' : undefined}
        onKeyDown={collapsed ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } } : undefined}
        style={{ cursor: collapsed ? 'pointer' : 'default' }}
        title={collapsed ? "Buka sidebar" : undefined}
      >
        <div className="brand-logo flex-shrink-0">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-9 h-9 object-cover rounded-full"
            onError={(e) => {
              e.currentTarget.src = '/map-baturetno.svg';
            }}
          />
        </div>
        <div className="brand-text min-w-0">
          <h3 className="text-sm font-bold text-primary-700 dark:text-primary-400 truncate">Lumbung PKK</h3>
          <span className="text-[0.65rem] text-gray-700 dark:text-gray-300 font-medium block truncate">Desa Belikurip</span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={(e) => {
            e.stopPropagation();
            if (mobileOpen && onMobileClose) {
              onMobileClose();
            } else {
              onToggle?.();
            }
          }}
          aria-label={collapsed ? undefined : "Tutup sidebar"}
          aria-hidden={collapsed ? true : undefined}
          tabIndex={collapsed ? -1 : undefined}
          aria-expanded={isMobile ? mobileOpen : !collapsed}
          aria-controls="dashboard-sidebar"
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          <motion.span whileTap={reduceMotion ? undefined : { scale: 0.92 }} className="inline-flex">
            <AngleLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </motion.span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-group">
          <span className="nav-section-title">Menu Utama</span>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item relative ${active ? 'nav-item-active' : ''}`}
                onClick={isMobile ? onMobileClose : undefined}
                title={collapsed ? (item.label + (item.sub ? ' — ' + item.sub : '')) : undefined}
                aria-label={item.label + (item.sub ? ' — ' + item.sub : '')}
              >
                {active && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                    className="absolute inset-0 bg-gradient-to-b from-emerald-600/75 via-emerald-600/65 to-emerald-700/75 dark:from-emerald-500/40 dark:via-emerald-600/30 dark:to-emerald-700/40 rounded-[14px] border border-emerald-300/75 dark:border-emerald-400/50 shadow-[0_4px_16px_rgba(5,150,105,0.28),inset_0_1.5px_2px_0_rgba(255,255,255,0.65),inset_0_-1px_1px_0_rgba(4,120,87,0.40)] backdrop-blur-md pointer-events-none"
                  />
                )}
                <span className="nav-icon relative z-10"><Icon className="w-5 h-5" /></span>
                <div className="nav-text relative z-10">
                  <span className="truncate">{item.label}</span>
                  {item.sub && <span className="nav-sub truncate">{item.sub}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {user?.role === 'admin' && (
          <div className="sidebar-nav-group mt-4">
            <span className="nav-section-title">Administrasi</span>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item relative ${active ? 'nav-item-active' : ''}`}
                  onClick={isMobile ? onMobileClose : undefined}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebarActiveIndicator"
                      initial={false}
                      animate={{ opacity: 1 }}
                      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                      className="absolute inset-0 bg-gradient-to-b from-emerald-600/75 via-emerald-600/65 to-emerald-700/75 dark:from-emerald-500/40 dark:via-emerald-600/30 dark:to-emerald-700/40 rounded-[14px] border border-emerald-300/75 dark:border-emerald-400/50 shadow-[0_4px_16px_rgba(5,150,105,0.28),inset_0_1.5px_2px_0_rgba(255,255,255,0.65),inset_0_-1px_1px_0_rgba(4,120,87,0.40)] backdrop-blur-md pointer-events-none"
                    />
                  )}
                  <span className="nav-icon relative z-10"><Icon className="w-5 h-5" /></span>
                  <div className="nav-text relative z-10">
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <div
            className="sidebar-user-card mb-2"
            title={collapsed ? `${user.nama_lengkap || 'User'} (${user.role || ''})` : undefined}
          >
            <div className="sidebar-user-avatar">
              {user.nama_lengkap?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 block truncate">{user.nama_lengkap}</span>
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium block truncate">{user.role}</span>
            </div>
          </div>
        )}
        <div className="sidebar-actions">
          <motion.button
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            type="button"
            className="nav-item"
            onClick={() => setShowPwModal(true)}
            aria-label="Ganti password"
            title={collapsed ? "Ganti Password" : undefined}
          >
            <span className="nav-icon"><Lock className="w-5 h-5" /></span>
            <div className="nav-text">
              <span className="truncate">Ganti Password</span>
            </div>
          </motion.button>
          <motion.button
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            type="button"
            className="nav-item text-red-500 hover:!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/40"
            onClick={onLogout}
            aria-label="Keluar dari aplikasi"
            title={collapsed ? "Keluar" : undefined}
          >
            <span className="nav-icon"><ArrowRightToBracket className="w-5 h-5" /></span>
            <div className="nav-text">
              <span className="truncate">Keluar</span>
            </div>
          </motion.button>
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
