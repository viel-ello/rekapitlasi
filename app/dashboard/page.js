'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { MapPin, Users, Home, Chart, ChartPie, ChartLineUp, Download, FileLines, ClipboardList } from 'flowbite-react-icons/outline';
import { Heart } from 'flowbite-react-icons/solid';

// Komponen angka yang menghitung naik dari 0 ke target
function AnimatedCounter({ value, duration = 1.5, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, value, duration, delay]);

  return <span ref={ref}>{display.toLocaleString('id-ID')}</span>;
}

export default function DashboardPage() {
  const [rekap, setRekap] = useState(null);
  const [trend, setTrend] = useState([]);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchRekap();
  }, [tahun]);

  const fetchRekap = async () => {
    setLoading(true);
    try {
      const [resRekap, resTrend] = await Promise.all([
        fetch(`/api/rekap?tahun=${tahun}`),
        fetch('/api/rekap/trend')
      ]);
      setRekap(await resRekap.json());
      setTrend(await resTrend.json());
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
    setLoading(false);
  };

  const handleDownload = async (type) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/export/${type}?tahun=${tahun}`);
      if (!res.ok) throw new Error('Gagal mengunduh');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel'
        ? `Rekapitulasi_PKK_Baturetno_${tahun}.xlsx`
        : `Data_Kegiatan_PKK_${tahun}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Terjadi kesalahan saat mengunduh file.');
    }
    setDownloading(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-3/5 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-4 w-2/5 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const totalJiwa = (rekap?.dataUmum?.total_jiwa_l || 0) + (rekap?.dataUmum?.total_jiwa_p || 0);

  const statCards = [
    { label: 'Total Desa', value: rekap?.totalDesa || 0, icon: MapPin, color: 'from-primary-500 to-primary-600', bg: 'bg-primary-50' },
    { label: 'Total Jiwa', value: totalJiwa, icon: Users, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50' },
    { label: 'Total KK', value: rekap?.dataUmum?.total_kk || 0, icon: Home, color: 'from-lime-500 to-lime-600', bg: 'bg-lime-50' },
    { label: 'Posyandu', value: rekap?.posyanduTotal || 0, icon: Heart, color: 'from-accent-500 to-accent-600', bg: 'bg-accent-50' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dashboard font-mono">Dashboard Rekapitulasi</h1>
          <p className="text-sm text-primary-600 mt-0.5">TP PKK Kecamatan Baturetno — Tahun {tahun}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloading === 'excel'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl shadow-card transition-all duration-200 hover:-translate-y-[1px] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading === 'excel' ? 'Sedang...' : 'Export Excel'}
          </button>
          <button
            onClick={() => handleDownload('word')}
            disabled={downloading === 'word'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-primary-600 hover:bg-primary-50 text-primary-600 text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-[1px] disabled:opacity-50"
          >
            <FileLines className="w-4 h-4" />
            {downloading === 'word' ? 'Sedang...' : 'Export Word'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div 
              key={i} 
              variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
              className="bg-white rounded-xl border border-primary-100 p-5 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer hover:-translate-y-[2px] group"
            >
              <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 text-${card.color.split('-')[1]}-600`} />
              </div>
              <div className="text-3xl font-mono font-bold text-dashboard tracking-tight"><AnimatedCounter value={card.value} delay={0.2 + i * 0.1} /></div>
              <div className="text-sm font-medium text-primary-700 mt-1">{card.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Horizontal Bar Chart */}
        <div className="bg-white rounded-xl border border-primary-100 p-6 shadow-card transition-all duration-200 hover:shadow-card-hover">
          <h3 className="flex items-center gap-2 text-sm font-bold font-mono text-dashboard mb-5 uppercase tracking-wide">
            <Chart className="w-5 h-5 text-accent-500" /> Jumlah Jiwa per Desa
          </h3>
          {(() => {
            const items = rekap?.perDesaJiwa || [];
            const maxVal = Math.max(...items.map(x => x.jiwa_l + x.jiwa_p), 1);
            return (
              <div className="space-y-2">
                {items.map((d, i) => {
                  const total = d.jiwa_l + d.jiwa_p;
                  const pct = (total / maxVal) * 100;
                  return (
                    <div key={i} className="group flex items-center gap-3">
                      <div className="w-24 sm:w-28 text-right text-xs font-semibold text-primary-800 truncate flex-shrink-0 cursor-pointer" title={d.nama}>
                        {d.nama}
                      </div>
                      <div className="flex-1 h-7 bg-primary-50 rounded-full overflow-hidden cursor-pointer">
                        <motion.div
                          className="h-full rounded-full group-hover:brightness-110"
                          initial={{ width: '0%' }}
                          animate={{ width: `${Math.max(pct, 2)}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.1 * i }}
                          style={{
                            background: `linear-gradient(90deg, #059669 0%, #10B981 100%)`,
                          }}
                        />
                      </div>
                      <div className="w-14 text-right text-xs font-mono font-bold text-primary-800 flex-shrink-0">
                        <AnimatedCounter value={total} delay={0.1 * i} duration={1} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-xl border border-primary-100 p-6 shadow-card transition-all duration-200 hover:shadow-card-hover">
          <h3 className="flex items-center gap-2 text-sm font-bold font-mono text-dashboard mb-5 uppercase tracking-wide">
            <ChartPie className="w-5 h-5 text-accent-500" /> Komposisi Jiwa (L/P)
          </h3>
          <div className="flex items-center justify-center gap-8">
            <svg viewBox="0 0 200 200" className="w-44 h-44">
              {(() => {
                const l = rekap?.dataUmum?.total_jiwa_l || 1;
                const p = rekap?.dataUmum?.total_jiwa_p || 1;
                const total = l + p;
                const lPct = l / total;
                const circumference = 2 * Math.PI * 70;
                return (
                  <>
                    {/* Background ring */}
                    <circle cx="100" cy="100" r="70" fill="none" stroke="#f3f4f6" strokeWidth="24" />
                    {/* Male arc */}
                    <motion.circle
                      cx="100" cy="100" r="70" fill="none"
                      stroke="url(#maleGrad)" strokeWidth="24" strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                      initial={{ strokeDasharray: `0 ${circumference}` }}
                      animate={{ strokeDasharray: `${lPct * circumference} ${circumference}` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    />
                    {/* Female arc */}
                    <motion.circle
                      cx="100" cy="100" r="70" fill="none"
                      stroke="url(#femaleGrad)" strokeWidth="24" strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                      initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
                      animate={{ 
                        strokeDasharray: `${(1 - lPct) * circumference} ${circumference}`,
                        strokeDashoffset: `${-lPct * circumference}`
                      }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    />
                    {/* Center text */}
                    <text x="100" y="93" textAnchor="middle" fill="#064E3B" fontSize="20" fontWeight="800" fontFamily="Fira Code">{total.toLocaleString('id-ID')}</text>
                    <text x="100" y="113" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Fira Sans">Total Jiwa</text>
                    <defs>
                      <linearGradient id="maleGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                      <linearGradient id="femaleGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F472B6" />
                        <stop offset="100%" stopColor="#F9A8D4" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Laki-laki</span>
                </div>
                <div className="text-xl font-mono font-bold text-dashboard"><AnimatedCounter value={rekap?.dataUmum?.total_jiwa_l || 0} delay={0.5} /></div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-pink-400" />
                  <span className="text-xs text-pink-500 font-semibold uppercase tracking-wider">Perempuan</span>
                </div>
                <div className="text-xl font-mono font-bold text-dashboard"><AnimatedCounter value={rekap?.dataUmum?.total_jiwa_p || 0} delay={0.7} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl border border-primary-100 p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
        <h3 className="flex items-center gap-2 text-sm font-bold font-mono text-dashboard mb-4 uppercase tracking-wide">
          <ChartLineUp className="w-5 h-5 text-accent-500" /> Tren Multi-Tahun (Kecamatan)
        </h3>
        <div className="flex gap-8 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h4 className="text-xs text-primary-600 mb-2 text-center font-semibold uppercase tracking-wider">Total Jiwa</h4>
            <svg viewBox="0 0 300 120" className="w-full overflow-visible">
              {(() => {
                const max = Math.max(...trend.map(t => t.total_jiwa), 1);
                const pts = trend.map((t, i) => `${30 + i * 120},${100 - (t.total_jiwa / max) * 80}`).join(' L ');
                return (
                  <>
                    <motion.path 
                      d={`M ${pts}`} fill="none" stroke="#059669" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                    {trend.map((t, i) => {
                      const x = 30 + i * 120;
                      const y = 100 - (t.total_jiwa / max) * 80;
                      return (
                        <motion.g 
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1 + (i * 0.1), duration: 0.3 }}
                        >
                          <circle cx={x} cy={y} r="5" fill="#fff" stroke="#059669" strokeWidth="2" />
                          <text x={x} y={y - 12} textAnchor="middle" fill="#064E3B" fontSize="10" fontWeight="bold" fontFamily="Fira Code">{t.total_jiwa.toLocaleString()}</text>
                          <text x={x} y="115" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Fira Sans">{t.tahun}</text>
                        </motion.g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex-1 min-w-[280px]">
            <h4 className="text-xs text-primary-600 mb-2 text-center font-semibold uppercase tracking-wider">Total Kepala Keluarga</h4>
            <svg viewBox="0 0 300 120" className="w-full overflow-visible">
              {(() => {
                const max = Math.max(...trend.map(t => t.total_kk), 1);
                const pts = trend.map((t, i) => `${30 + i * 120},${100 - (t.total_kk / max) * 80}`).join(' L ');
                return (
                  <>
                    <motion.path 
                      d={`M ${pts}`} fill="none" stroke="#F59E0B" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                    {trend.map((t, i) => {
                      const x = 30 + i * 120;
                      const y = 100 - (t.total_kk / max) * 80;
                      return (
                        <motion.g 
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1 + (i * 0.1), duration: 0.3 }}
                        >
                          <circle cx={x} cy={y} r="5" fill="#fff" stroke="#F59E0B" strokeWidth="2" />
                          <text x={x} y={y - 12} textAnchor="middle" fill="#064E3B" fontSize="10" fontWeight="bold" fontFamily="Fira Code">{t.total_kk.toLocaleString()}</text>
                          <text x={x} y="115" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Fira Sans">{t.tahun}</text>
                        </motion.g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <ClipboardList className="w-5 h-5 text-gray-400" /> Ringkasan Data per Desa
        </h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Desa</th>
                <th className="text-right">Jiwa (L)</th>
                <th className="text-right">Jiwa (P)</th>
                <th className="text-right">Total Jiwa</th>
                <th className="text-right">KK</th>
              </tr>
            </thead>
            <tbody>
              {rekap?.perDesaJiwa?.map((d, i) => (
                <tr key={i}>
                  <td className="text-center">{i + 1}</td>
                  <td className="col-desa">{d.nama}</td>
                  <td className="text-right">{d.jiwa_l.toLocaleString('id-ID')}</td>
                  <td className="text-right">{d.jiwa_p.toLocaleString('id-ID')}</td>
                  <td className="text-right font-semibold">{(d.jiwa_l + d.jiwa_p).toLocaleString('id-ID')}</td>
                  <td className="text-right">{d.kk.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {rekap?.perDesaJiwa && (
                <tr className="row-total">
                  <td></td>
                  <td className="col-desa">JUMLAH</td>
                  <td className="text-right">{(rekap.dataUmum?.total_jiwa_l || 0).toLocaleString('id-ID')}</td>
                  <td className="text-right">{(rekap.dataUmum?.total_jiwa_p || 0).toLocaleString('id-ID')}</td>
                  <td className="text-right">{totalJiwa.toLocaleString('id-ID')}</td>
                  <td className="text-right">{(rekap.dataUmum?.total_kk || 0).toLocaleString('id-ID')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
