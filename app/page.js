'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import RecapFlowIllustration from '@/components/RecapFlowIllustration';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import AmbientMotionToggle from '@/components/AmbientMotionToggle';
import { useAmbientMotionPreference } from '@/lib/useAmbientMotionPreference';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Rekap data PKK terpadu',
    desc: 'Data Umum, Pokja I–IV, Rekapitulasi Dawis, dan Bumil dalam satu alur pencatatan antar dusun.',
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
  const [preview, setPreview] = useState('pencatatan');
  const [summaryState, setSummaryState] = useState('loading');
  const { motionAllowed } = useAmbientMotionPreference();
  const entrance = (delay) => ({ initial: motionAllowed ? { opacity: 0, y: 14 } : false, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/summary', { cache: 'no-store' });
        if (!res.ok) throw new Error('unavailable');
        const payload = await res.json();
        if (!cancelled) { setSummary(payload); setSummaryState('ready'); }
      } catch { if (!cancelled) setSummaryState('unavailable'); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative min-h-screen bg-dashboard text-gray-800">
      {/* Ambient backdrop untuk efek VisionOS Liquid Glass di halaman awal */}
      <AmbientBackdrop />

      <div className="relative z-[1]">
        {/* Header */}
        <header className="glass-header sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.png" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/map-baturetno.svg'; }} alt="Logo TP PKK Desa Belikurip" className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white/70 shadow-sm" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">Lumbung PKK</div>
                <div className="text-[11px] text-gray-600 truncate">Desa Belikurip</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <AmbientMotionToggle compact />
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
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-center">
                <motion.div {...entrance(0)} className="max-w-3xl py-3 sm:py-8">
                  <p className="text-sm font-semibold text-primary-800 mb-5">TP PKK Desa Belikurip</p>
                  <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-bold tracking-tight text-gray-900 leading-[1.08]">
                    Dari catatan dusun,<br />menjadi laporan desa.
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-gray-700 max-w-2xl leading-relaxed">
                    Aplikasi internal untuk mencatat, memantau, dan melaporkan data kegiatan PKK 9 dusun di Desa Belikurip.
                    Data dikelola oleh administrator dan operator pokja, sebagian agregat ditampilkan terbuka untuk warga.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-md transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                    >
                      <ArrowRightToBracket className="w-4 h-4" /> Masuk Aplikasi
                    </Link>
                    <Link
                      href="/publik"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 glass-pill hover:bg-white/70 text-gray-800 text-sm font-semibold rounded-full transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                    >
                      <Globe className="w-4 h-4" /> Lihat Data Publik
                    </Link>
                  </div>
                  <p className="mt-6 text-xs text-gray-500">Kecamatan Baturetno, Kabupaten Wonogiri</p>
                </motion.div>

                {/* Ilustrasi relief 3D non-geografis Desa Belikurip */}
                <motion.div {...entrance(0.12)} className="relative glass-panel rounded-[2rem] p-4 sm:p-5">
                  <div className="flex gap-1 rounded-2xl bg-white/50 p-1" role="tablist" aria-label="Pratinjau alur aplikasi">
                    {['pencatatan', 'kelengkapan', 'laporan'].map((tab, index, tabs) => <button key={tab} type="button" id={`preview-${tab}`} role="tab" aria-selected={preview === tab} aria-controls="home-preview" tabIndex={preview === tab ? 0 : -1} onClick={() => setPreview(tab)} onKeyDown={(event) => { const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null; if (next !== null) { event.preventDefault(); setPreview(tabs[next]); document.getElementById(`preview-${tabs[next]}`)?.focus(); } }} className={`flex-1 min-h-11 rounded-xl px-2 text-xs sm:text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${preview === tab ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}>{tab}</button>)}
                  </div>
                  <div id="home-preview" role="tabpanel" aria-labelledby={`preview-${preview}`} className="mt-4 min-h-[330px] sm:min-h-[365px] flex flex-col justify-center">
                    {preview === 'pencatatan' ? <><RecapFlowIllustration /><p className="mt-3 px-2 text-xs text-gray-600">Alur pencatatan sembilan dusun, rekap, dan laporan PKK.</p></> : preview === 'kelengkapan' ? <div className="p-3 sm:p-5"><h2 className="text-xl font-bold text-gray-900">Lihat bagian yang perlu dilengkapi.</h2><p className="text-sm text-gray-600 mt-3">Status pengisian dan hasil validasi ditampilkan per dusun dan periode.</p><div className="mt-6 grid grid-cols-3 gap-2">{[['Lengkap', summary?.completeness?.complete], ['Perlu dicek', summary?.completeness?.needsCheck], ['Belum lengkap', summary?.completeness?.incomplete]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/65 p-3"><strong className="block text-2xl text-primary-800 tabular-nums">{summary ? value ?? '—' : '—'}</strong><span className="text-xs text-gray-600">{label}</span></div>)}</div><p className="text-xs text-gray-500 mt-4" role="status">{summaryState === 'loading' ? 'Memuat ringkasan publik…' : !summary ? 'Ringkasan belum tersedia. Fitur pencatatan tetap dapat diakses melalui halaman masuk.' : `Periode bulan ${summary.bulan}, tahun ${summary.tahun}. Status menunjukkan kelengkapan pencatatan.`}</p></div> : <div className="p-3 sm:p-5"><ChartPie className="h-10 w-10 text-primary-700" /><h2 className="text-xl font-bold text-gray-900 mt-5">Laporan mengikuti periode.</h2><p className="text-sm text-gray-600 mt-3">Petugas dapat mengunduh template, mengimpor Excel dengan pratinjau, dan mengekspor laporan Excel atau Word.</p><div className="mt-6 rounded-2xl bg-white/65 p-4 text-sm text-primary-900">Warga dapat membuka ringkasan agregat dan detail per dusun tanpa masuk.</div><Link href="/publik" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 underline focus-visible:ring-2 focus-visible:ring-primary-600">Buka ringkasan publik</Link></div>}
                  </div>
                </motion.div>
            </div>
          </div>
        </section>

        {/* Public KPI strip */}
        {summary && (
          <motion.section {...entrance(0.22)} className="py-2">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <KpiTile label="Dusun Aktif" value={summary.totalDusun ?? summary.totalDesa} icon={Users} tone="primary" />
                <KpiTile label="Dusun Lengkap" value={summary.completeness?.complete} sub={`dari ${summary.totalDusun ?? summary.totalDesa ?? 0}`} icon={CheckCircle} tone="green" />
                <KpiTile
                  label="Total KK"
                  value={summary.totals?.total_kk}
                  available={Boolean(summary.availability?.data_umum)}
                  sub={summary.availability?.data_umum ? undefined : 'Belum ada catatan'}
                  icon={ClipboardList}
                  tone="blue"
                />
                <KpiTile
                  label="Posyandu"
                  value={summary.totals?.total_posyandu}
                  available={Boolean(summary.availability?.data_pokja4)}
                  sub={summary.availability?.data_pokja4 ? undefined : 'Belum ada catatan'}
                  icon={ChartPie}
                  tone="amber"
                />
              </div>
              <p className="text-[11px] text-gray-600 mt-3 px-1">
                Tahun {summary.tahun}. Data agregat publik. Untuk detail per dusun,{' '}
                <Link href="/publik" className="text-primary-700 font-semibold hover:underline">buka data publik</Link>.
              </p>
            </div>
          </motion.section>
        )}

        {/* Features */}
        <motion.section {...entrance(0.3)} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-5">Yang dilakukan aplikasi ini</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-3xl p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover focus-within:-translate-y-1">
                <div className="w-10 h-10 rounded-2xl glass-pill text-primary-700 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

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

function KpiTile({ label, value, sub, icon: Icon, tone = 'primary', available = true }) {
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
          {!available ? '—' : typeof value === 'number' ? <AnimatedCounter value={value} /> : (value ?? '—')}
        </div>
        <div className="text-xs font-medium text-gray-700 truncate">{label}{sub ? <span className="ml-1 text-gray-500">{sub}</span> : null}</div>
      </div>
    </div>
  );
}
