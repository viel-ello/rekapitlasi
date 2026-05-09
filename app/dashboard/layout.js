'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import AiChatBubble from '@/components/AiChatBubble';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Auto-collapse sidebar on mobile screens
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
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
        router.push('/');
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
        router.push('/');
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
        <span className="text-gray-400 text-sm">Memuat...</span>
      </div>
    );
  }

  const mainMargin = isMobile ? 0 : (sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)');

  return (
    <div className="min-h-screen bg-dashboard">
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
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main
        className="transition-[margin-left] duration-300 ease-in-out flex flex-col min-h-screen"
        style={{ marginLeft: mainMargin }}
      >
        <Topbar user={user} onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <AiChatBubble />
    </div>
  );
}
