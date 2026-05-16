'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRightToBracket,
  Globe,
  ClipboardList,
  ChartLineUp,
  CheckCircle,
  ChartPie,
  Users,
} from 'flowbite-react-icons/outline';
import AnimatedCounter from '@/components/AnimatedCounter';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Rekap data PKK terpadu',
    desc: 'Data Umum, Pokja I-IV, Kegiatan Warga, dan Bumil dalam satu sistem konsisten antar desa.',
  },
  {
    icon: ChartLineUp,
    title: 'Monitoring kelengkapan',
    desc: 'Pantau status pengisian per desa per periode dengan validasi otomatis dan peringatan anomali.',
  },
  {
    icon: ChartPie,
    title: 'Laporan & ekspor cepat',
    desc: 'Unduh template, import Excel dengan preview, ekspor laporan Excel/Word, serta report builder.',
  },
];

export default function WelcomePage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/summary', { cache: 'no-store' });
        if (res.ok && !cancelled) setSummary(await res.json());
      } catch { /* silent — fallback ke konten statis */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="Logo TP PKK Baturetno" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-800 truncate">Sistem Rekapitulasi PKK</div>
              <div className="text-[11px] text-gray-500 truncate">Kecamatan Baturetno</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/publik"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
            >
              <Globe className="w-4 h-4" /> Data Publik
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <ArrowRightToBracket className="w-4 h-4" /> Masuk
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <img src="/bg-baturetno.png" alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-20">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wide mb-4">
              TP PKK · Kecamatan Baturetno · Wonogiri
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Sistem Rekapitulasi Data
              <br className="hidden sm:block" />
              <span className="text-primary-700"> TP PKK Kecamatan Baturetno</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-gray-600 max-w-2xl leading-relaxed">
              Aplikasi internal untuk mencatat, memantau, dan melaporkan data kegiatan PKK 13 desa di Kecamatan Baturetno.
              Data dikelola oleh administrator dan operator pokja, sebagian agregat ditampilkan terbuka untuk warga.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
              >
                <ArrowRightToBracket className="w-4 h-4" /> Masuk Aplikasi
              </Link>
              <Link
                href="/publik"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors"
              >
                <Globe className="w-4 h-4" /> Lihat Data Publik
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Public KPI strip */}
      {summary && (
        <section className="border-y border-gray-100 bg-gray-50/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <KpiTile label="Desa Aktif" value={summary.totalDesa} icon={Users} tone="primary" />
              <KpiTile label="Desa Lengkap" value={summary.completeness?.complete} sub={`dari ${summary.totalDesa}`} icon={CheckCircle} tone="green" />
              <KpiTile label="Total KK" value={summary.totals?.total_kk} icon={ClipboardList} tone="blue" />
              <KpiTile label="Posyandu" value={summary.totals?.total_posyandu} icon={ChartPie} tone="amber" />
            </div>
            <p className="text-[11px] text-gray-500 mt-3">
              Tahun {summary.tahun}. Data agregat publik. Untuk detail per desa,{' '}
              <Link href="/publik" className="text-primary-700 font-medium hover:underline">buka data publik</Link>.
            </p>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-6">Yang dilakukan aplikasi ini</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-5 hover:border-primary-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <div>© {new Date().getFullYear()} TP PKK Kecamatan Baturetno · Kabupaten Wonogiri, Jawa Tengah</div>
          <div className="flex items-center gap-3">
            <Link href="/publik" className="hover:text-primary-700">Data Publik</Link>
            <span aria-hidden="true">·</span>
            <Link href="/login" className="hover:text-primary-700">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function KpiTile({ label, value, sub, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 sm:p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-800">
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : (value ?? '—')}
        </div>
        <div className="text-xs text-gray-500 truncate">{label}{sub ? <span className="ml-1 text-gray-400">{sub}</span> : null}</div>
      </div>
    </div>
  );
}
