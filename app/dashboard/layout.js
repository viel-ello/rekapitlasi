'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import AiChatBubble from '@/components/AiChatBubble';
import ToastViewport from '@/components/Toast';
import OnboardingTour from '@/components/OnboardingTour';
import { ToastProvider } from '@/lib/useToast';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Sidebar mode by viewport:
    //   - Mobile (<768px): selalu pakai mode mobile drawer (full-width).
    //     Tidak pernah `collapsed`. State `mobileOpen` mengontrol visibility.
    //   - Desktop (>=768px): user bisa toggle `collapsed` (icon only) atau full.
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        // Saat masuk mobile, paksa collapsed=false supaya sidebar drawer
        // tampil full-width (label + icon), bukan icon-only.
        setSidebarCollapsed(false);
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        <div className="glass-ambient" aria-hidden="true" />
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <Sidebar
          user={user}
          onLogout={handleLogout}
          // Mobile selalu pakai layout full-width (collapsed=false). Toggle
          // collapse hanya berlaku di desktop.
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          showPwModal={showPwModal}
          setShowPwModal={setShowPwModal}
        />

        <main
          className="relative z-[1] transition-[margin-left] duration-300 ease-in-out flex flex-col min-h-screen"
          style={{ marginLeft: mainMargin }}
        >
          <Topbar
            user={user}
            onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
            onOpenPasswordModal={() => setShowPwModal(true)}
          />
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>

        <AiChatBubble />
        <ToastViewport />
        <OnboardingTour />
      </div>
    </ToastProvider>
  );
}
