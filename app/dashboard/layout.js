'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import AiChatBubble from '@/components/AiChatBubble';
import ToastViewport from '@/components/Toast';
import OnboardingTour from '@/components/OnboardingTour';
import { ToastProvider } from '@/lib/useToast';
import AmbientBackdrop from '@/components/AmbientBackdrop';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const mobileMenuTrigger = useRef(null);
  const wasMobileOpen = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Sidebar mode by viewport:
    //   - Mobile (<768px): selalu pakai mode mobile drawer (full-width).
    //     Tidak pernah `collapsed`. State `mobileOpen` mengontrol visibility.
    //   - Desktop (>=768px): user bisa toggle `collapsed` (icon only) atau full.
    const media = window.matchMedia('(max-width: 767px)');
    const handleBreakpointChange = (event) => {
      const mobile = event.matches;
      setIsMobile(mobile);
      // This listener runs only when crossing the breakpoint, never for small resizes.
      setMobileOpen(false);
      if (mobile) {
        // Saat masuk mobile, paksa collapsed=false supaya sidebar drawer
        // tampil full-width (label + icon), bukan icon-only.
        setSidebarCollapsed(false);
      }
    };
    handleBreakpointChange(media);
    media.addEventListener('change', handleBreakpointChange);
    return () => media.removeEventListener('change', handleBreakpointChange);
  }, []);

  useEffect(() => {
    if (wasMobileOpen.current && !mobileOpen) {
      // The mobile trigger is hidden after entering desktop; focus its visible equivalent.
      const trigger = isMobile ? mobileMenuTrigger.current : document.querySelector('#dashboard-sidebar .sidebar-toggle');
      trigger?.focus();
    }
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen, isMobile]);

  useEffect(() => {
    const validateSession = async () => {
      const stored = localStorage.getItem('user');
      if (!stored) {
        router.push('/login');
        return;
      }
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('Sesi tidak valid');
        }
        setUser(JSON.parse(stored));
        setLoading(false);
      } catch (err) {
        localStorage.removeItem('user');
        router.push('/login');
      }
    };
    validateSession();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gap-3">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600 text-sm">Memuat...</span>
      </div>
    );
  }

  const mainMargin = isMobile ? 0 : (sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)');

  return (
    <ToastProvider>
      <div className="relative min-h-screen bg-dashboard dark:bg-gray-950 text-gray-800 dark:text-gray-100">
        {/* Ambient gradient backdrop — basis efek liquid glass (kartu translucent
            di atasnya jadi terlihat "frosted"). Fixed + pointer-events-none. */}
        <AmbientBackdrop variant="workspace" />
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <Sidebar
          user={user}
          onLogout={handleLogout}
          // Mobile selalu pakai layout full-width (collapsed=false). Toggle
          // collapse hanya berlaku di desktop.
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          mobileOpen={mobileOpen}
          isMobile={isMobile}
          onMobileClose={() => setMobileOpen(false)}
          showPwModal={showPwModal}
          setShowPwModal={setShowPwModal}
        />

        <main
          aria-hidden={isMobile && mobileOpen ? true : undefined}
          inert={isMobile && mobileOpen ? true : undefined}
          className="relative z-[1] flex flex-col min-h-screen"
          style={{
            marginLeft: mainMargin,
            transition: 'margin-left var(--sidebar-transition-duration) var(--sidebar-transition-ease)',
          }}
        >
          <Topbar
            user={user}
            mobileMenuOpen={mobileOpen}
            onMobileMenuToggle={() => {
              if (!mobileOpen) mobileMenuTrigger.current = document.activeElement;
              setMobileOpen((current) => !current);
            }}
            onOpenPasswordModal={() => setShowPwModal(true)}
          />
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>

        <div
          data-dashboard-auxiliary="true"
          hidden={isMobile && mobileOpen}
          aria-hidden={isMobile && mobileOpen ? true : undefined}
          inert={isMobile && mobileOpen ? true : undefined}
        >
          <AiChatBubble />
          <ToastViewport />
          <OnboardingTour />
        </div>
      </div>
    </ToastProvider>
  );
}
