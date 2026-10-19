'use client';

import Link from 'next/link';
import { ArrowRightToBracket, Globe, Home } from 'flowbite-react-icons/outline';

export default function PublicHeader() {
  return (
    <header className="glass-header sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.png" alt="Logo TP PKK Baturetno" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">Lumbung PKK</div>
            <div className="text-[11px] text-gray-500 truncate">Desa Belikurip</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
          >
            <Home className="w-4 h-4" /> Beranda
          </Link>
          <Link
            href="/publik"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4" /> Data Publik
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <ArrowRightToBracket className="w-4 h-4" /> Masuk
          </Link>
        </nav>
      </div>
    </header>
  );
}
