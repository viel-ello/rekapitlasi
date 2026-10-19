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
import MapWonogiri3D from '@/components/MapWonogiri3D';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Rekap data PKK terpadu',
    desc: 'Data Umum, Pokja I-IV, Kegiatan Warga, dan Bumil dalam satu sistem konsisten antar dusun.',
  },
  {
    icon: ChartLineUp,
    title: 'Monitoring kelengkapan',
    desc: 'Pantau status pengisian per dusun per periode dengan validasi otomatis dan peringatan anomali.',
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
    <div className="relative min-h-screen bg-dashboard text-gray-800">
      {/* Ambient backdrop untuk efek VisionOS Liquid Glass di halaman awal */}
      <div className="glass-ambient" aria-hidden="true" />

      <div className="relative z-[1]">
        {/* Header */}
        <header className="glass-header sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.png" alt="Logo TP PKK Desa Belikurip" className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white/70 shadow-sm" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">Lumbung PKK</div>
                <div className="text-[11px] text-gray-600 truncate">Desa Belikurip</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/publik"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
              >
                <Globe className="w-4 h-4" /> Data Publik
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full transition-colors shadow-sm"
              >
                <ArrowRightToBracket className="w-4 h-4" /> Masuk
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-10 sm:pt-14 sm:pb-14">
            <div className="glass-panel rounded-3xl p-6 sm:p-10">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
                <div className="max-w-3xl">
                  <span className="inline-block px-3.5 py-1 rounded-full glass-pill text-primary-800 text-xs font-semibold uppercase tracking-wide mb-4">
                    TP PKK · Desa Belikurip · Kecamatan Baturetno · Wonogiri
                  </span>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    Lumbung Data PKK
                    <br className="hidden sm:block" />
                    <span className="text-primary-700"> Desa Belikurip</span>
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-gray-700 max-w-2xl leading-relaxed">
                    Aplikasi internal untuk mencatat, memantau, dan melaporkan data kegiatan PKK 9 dusun di Desa Belikurip.
                    Data dikelola oleh administrator dan operator pokja, sebagian agregat ditampilkan terbuka untuk warga.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-md transition-colors"
                    >
                      <ArrowRightToBracket className="w-4 h-4" /> Masuk Aplikasi
                    </Link>
                    <Link
                      href="/publik"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 glass-pill hover:bg-white/70 text-gray-800 text-sm font-semibold rounded-full transition-colors"
                    >
                      <Globe className="w-4 h-4" /> Lihat Data Publik
                    </Link>
                  </div>
                </div>

                {/* Peta 3D Kabupaten Wonogiri (Baturetno disorot) */}
                <div className="relative">
                  <div className="glass rounded-3xl p-4 sm:p-6">
                    <MapWonogiri3D />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Public KPI strip */}
        {summary && (
          <section className="py-2">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <KpiTile label="Dusun Aktif" value={summary.totalDusun ?? summary.totalDesa} icon={Users} tone="primary" />
                <KpiTile label="Dusun Lengkap" value={summary.completeness?.complete} sub={`dari ${summary.totalDusun ?? summary.totalDesa ?? 0}`} icon={CheckCircle} tone="green" />
                <KpiTile label="Total KK" value={summary.totals?.total_kk} icon={ClipboardList} tone="blue" />
                <KpiTile label="Posyandu" value={summary.totals?.total_posyandu} icon={ChartPie} tone="amber" />
              </div>
              <p className="text-[11px] text-gray-600 mt-3 px-1">
                Tahun {summary.tahun}. Data agregat publik. Untuk detail per dusun,{' '}
                <Link href="/publik" className="text-primary-700 font-semibold hover:underline">buka data publik</Link>.
              </p>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-5">Yang dilakukan aplikasi ini</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-3xl p-5 hover:shadow-card-hover transition-all">
                <div className="w-10 h-10 rounded-2xl glass-pill text-primary-700 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="glass-header border-t border-white/60 mt-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-600">
            <div>© {new Date().getFullYear()} TP PKK Desa Belikurip · Kecamatan Baturetno · Kabupaten Wonogiri, Jawa Tengah</div>
            <div className="flex items-center gap-3">
              <Link href="/publik" className="hover:text-primary-700 font-medium">Data Publik</Link>
              <span aria-hidden="true">·</span>
              <Link href="/login" className="hover:text-primary-700 font-medium">Masuk</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function KpiTile({ label, value, sub, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50/80 text-primary-700 border border-white/60',
    blue: 'bg-blue-50/80 text-blue-700 border border-white/60',
    amber: 'bg-amber-50/80 text-amber-700 border border-white/60',
    green: 'bg-green-50/80 text-green-700 border border-white/60',
  };
  return (
    <div className="glass rounded-3xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 tabular-nums">
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : (value ?? '—')}
        </div>
        <div className="text-xs font-medium text-gray-700 truncate">{label}{sub ? <span className="ml-1 text-gray-500">{sub}</span> : null}</div>
      </div>
    </div>
  );
}
