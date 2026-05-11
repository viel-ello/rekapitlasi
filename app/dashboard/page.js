'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Users, Home, Chart, ChartPie, ChartLineUp, 
  Download, FileLines, ClipboardList, CheckCircle, 
  ExclamationCircle, Clock, ArrowRight, Upload
} from 'flowbite-react-icons/outline';
import { Heart } from 'flowbite-react-icons/solid';
import AnimatedCounter from '@/components/AnimatedCounter';
import { timeAgo } from '@/lib/time';

const TABLE_FILTERS = [
  { value: 'all', label: 'Semua Data', short: 'Semua' },
  { value: 'data_umum', label: 'Data Umum', short: 'Umum' },
  { value: 'data_pokja1', label: 'Pokja I', short: 'P1' },
  { value: 'data_pokja2', label: 'Pokja II', short: 'P2' },
  { value: 'data_pokja3', label: 'Pokja III', short: 'P3' },
  { value: 'data_pokja4', label: 'Pokja IV', short: 'P4' },
  { value: 'data_kegiatan_warga', label: 'Kegiatan Warga', short: 'Warga' },
  { value: 'data_bumil', label: 'Bumil', short: 'Bumil' },
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function getStatusDotClass(status) {
  if (status === 'lengkap') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
  if (status === 'perlu_dicek') return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.35)]';
  return 'bg-red-300';
}

function getStatusLabel(status) {
  if (status === 'lengkap') return 'Lengkap';
  if (status === 'perlu_dicek') return 'Perlu dicek';
  return 'Belum lengkap';
}

function toneClasses(tone) {
  const tones = {
    primary: { bar: 'bg-primary-600', stroke: '#059669', text: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-100' },
    blue: { bar: 'bg-blue-500', stroke: '#3B82F6', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    green: { bar: 'bg-green-500', stroke: '#22C55E', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
    amber: { bar: 'bg-amber-500', stroke: '#F59E0B', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
    red: { bar: 'bg-red-500', stroke: '#EF4444', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' },
  };
  return tones[tone] || tones.primary;
}

function MiniTrendCard({ label, rows, field, tone = 'primary' }) {
  const colors = toneClasses(tone);
  const values = rows.map(row => Number(row[field] || 0));
  const max = Math.max(...values, 1);
  const last = values[values.length - 1] || 0;
  const prev = values[values.length - 2] || 0;
  const diff = last - prev;
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? 150 : 24 + index * (252 / (values.length - 1));
    const y = 78 - (value / max) * 56;
    return `${x},${y}`;
  }).join(' ');

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      className={`bg-white rounded-xl border ${colors.border} p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="text-xl font-bold text-gray-800 mt-1">
            <AnimatedCounter value={last} />
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text}`}>
          <AnimatedCounter value={diff} prefix={diff >= 0 ? '+' : ''} duration={1.2} />
        </span>
      </div>
      <svg viewBox="0 0 300 92" className="w-full h-20 overflow-visible" aria-hidden="true">
        <polyline points={points} fill="none" stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="trend-line-anim" />
        {values.map((value, index) => {
          const x = values.length <= 1 ? 150 : 24 + index * (252 / (values.length - 1));
          const y = 78 - (value / max) * 56;
          return <circle key={index} cx={x} cy={y} r="3.5" fill="#fff" stroke={colors.stroke} strokeWidth="2" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400">
        {rows.map(row => <span key={row.tahun}>{row.tahun}</span>)}
      </div>
    </motion.div>
  );
}

function HorizontalStatBar({ label, value, max, tone = 'primary', sub, subTitle }) {
  const colors = toneClasses(tone);
  const percent = max > 0 ? (Number(value || 0) / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-700 truncate">{label}</div>
          {sub && <div className="text-[10px] text-gray-400 truncate" title={subTitle}>{sub}</div>}
        </div>
        <span className="text-sm font-bold text-gray-900">
          <AnimatedCounter value={value} duration={1.2} />
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className={`h-full rounded-full ${colors.bar}`}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [rekap, setRekap] = useState(null);
  const [trend, setTrend] = useState([]);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [jenisData, setJenisData] = useState('all');
  const [bulan, setBulan] = useState(12);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  useEffect(() => {
    fetchRekap();
  }, [tahun, jenisData, bulan]);

  const fetchRekap = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: String(tahun),
        jenis: jenisData,
        bulan: String(bulan),
      });
      const [resRekap, resTrend] = await Promise.all([
        fetch(`/api/rekap?${params.toString()}`),
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
    const needsCheck = rekap?.completeness?.needsCheck || 0;
    const incomplete = rekap?.completeness?.incomplete || 0;
    if ((needsCheck > 0 || incomplete > 0) && !window.confirm(`Masih ada ${needsCheck} desa perlu dicek dan ${incomplete} desa belum lengkap. Tetap export laporan?`)) {
      return;
    }

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

  const handleDownloadTemplate = async (table, label) => {
    setDownloadingTemplate(table);
    try {
      const res = await fetch(`/api/export/template?table=${table}`);
      if (!res.ok) throw new Error('Gagal mengunduh template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_${label.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowTemplateMenu(false);
    } catch (err) {
      console.error('Template download error:', err);
      alert('Terjadi kesalahan saat mengunduh template.');
    }
    setDownloadingTemplate(null);
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

  const completeness = rekap?.completeness || { complete: 0, incomplete: 0, needsCheck: 0, total: 0, perDesa: [], filter: { tables: [] } };
  const lastActivity = rekap?.lastActivity;
  const activeTables = completeness.filter?.tables?.length ? completeness.filter.tables : TABLE_FILTERS.filter(t => t.value !== 'all').map(t => t.value);
  const tableLabel = Object.fromEntries(TABLE_FILTERS.map(t => [t.value, t]));

  const kpiCards = [
    {
      label: 'Desa Lengkap',
      value: completeness.complete,
      sub: <>dari <AnimatedCounter value={completeness.total} duration={1.2} /> desa</>,
      subTitle: `dari ${completeness.total} desa`,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    { label: 'Belum Lengkap', value: completeness.incomplete, sub: 'belum memenuhi kolom wajib', icon: MapPin, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
    { label: 'Perlu Dicek', value: completeness.needsCheck, sub: 'ada warning/anomali', icon: ExclamationCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { 
      label: 'Aktivitas Terakhir', 
      value: lastActivity ? timeAgo(lastActivity.created_at) : 'Belum ada', 
      sub: lastActivity ? `${lastActivity.username} (${lastActivity.action})` : '-',
      icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
      isText: true
    },
  ];
  const trendCards = [
    { label: 'KK', field: 'total_kk', tone: 'primary' },
    { label: 'Jiwa', field: 'total_jiwa', tone: 'blue' },
    { label: 'Dasa Wisma', field: 'total_dasa_wisma', tone: 'green' },
    { label: 'Posyandu', field: 'total_posyandu', tone: 'amber' },
    { label: 'Ibu Hamil', field: 'total_bumil', tone: 'blue' },
    { label: 'Kelahiran', field: 'total_kelahiran', tone: 'green' },
  ];
  const statusStats = [
    { label: 'Lengkap', value: completeness.complete, tone: 'green' },
    { label: 'Perlu Dicek', value: completeness.needsCheck, tone: 'amber' },
    { label: 'Belum Lengkap', value: completeness.incomplete, tone: 'red' },
  ];
  const maxStatus = Math.max(...statusStats.map(item => item.value), 1);
  const dashboardIndicators = rekap?.dashboardIndicators || [];
  const maxIndicator = Math.max(...dashboardIndicators.map(item => item.value), 1);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dashboard font-mono">Dashboard Operasional</h1>
          <p className="text-sm text-primary-600 mt-0.5">TP PKK Kecamatan Baturetno — Tahun {tahun}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            aria-label="Pilih tahun dashboard"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            aria-label="Pilih bulan dashboard"
          >
            {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
          <select
            value={jenisData}
            onChange={(e) => setJenisData(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            aria-label="Pilih jenis data"
          >
            {TABLE_FILTERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> Template Excel
            </button>
            {showTemplateMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTemplateMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pilih Tabel</div>
                  {[
                    { key: 'data_umum', label: 'Data Umum' },
                    { key: 'data_pokja1', label: 'Pokja I' },
                    { key: 'data_pokja2', label: 'Pokja II' },
                    { key: 'data_pokja3', label: 'Pokja III' },
                    { key: 'data_pokja4', label: 'Pokja IV' },
                    { key: 'data_kegiatan_warga', label: 'Kegiatan Warga' },
                    { key: 'data_bumil', label: 'Data Bumil' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleDownloadTemplate(t.key, t.label)}
                      disabled={downloadingTemplate === t.key}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-center justify-between"
                    >
                      {t.label}
                      {downloadingTemplate === t.key && <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-0.5">
            <button
              onClick={() => handleDownload('excel')}
              disabled={downloading === 'excel'}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-green-50 text-green-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              title="Export Laporan Excel"
            >
              {downloading === 'excel' ? '...' : 'Excel'}
            </button>
            <div className="w-px bg-gray-200 my-1"></div>
            <button
              onClick={() => handleDownload('word')}
              disabled={downloading === 'word'}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              title="Export Laporan Word"
            >
              {downloading === 'word' ? '...' : 'Word'}
            </button>
          </div>

          <a
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" /> Import Excel
          </a>
        </div>
      </div>

      {/* Operational KPI Cards */}
      <motion.div 
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div 
              key={i} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
              className={`bg-white rounded-xl border ${card.border} p-5 shadow-sm`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {card.isText ? card.value : <AnimatedCounter value={card.value} />}
                </div>
                <div className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</div>
                <div className="text-xs text-gray-400 mt-1 truncate" title={card.subTitle || (typeof card.sub === 'string' ? card.sub : undefined)}>{card.sub}</div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
            <ChartPie className="w-4 h-4 text-primary-600" /> Status Kelengkapan
          </h3>
          <div className="space-y-4">
            {statusStats.map((item) => (
              <HorizontalStatBar
                key={item.label}
                label={item.label}
                value={item.value}
                max={maxStatus}
                tone={item.tone}
                sub={<><AnimatedCounter value={completeness.total} duration={1.1} /> desa aktif</>}
                subTitle={`${completeness.total} desa aktif`}
              />
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide">
              <Chart className="w-4 h-4 text-primary-600" /> Ringkasan Indikator
            </h3>
            <span className="text-xs text-gray-400">Data Umum - Bumil</span>
          </div>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            {dashboardIndicators.map((item) => (
              <HorizontalStatBar key={`${item.category}-${item.label}`} label={item.label} value={item.value} max={maxIndicator} tone={item.tone} sub={item.category} />
            ))}
          </div>
        </div>
      </div>

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {trendCards.map((card) => (
          <MiniTrendCard key={card.field} label={card.label} rows={trend} field={card.field} tone={card.tone} />
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Status Kelengkapan Matrix */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary-600" /> Matrix Kelengkapan Data
            </h3>
            <div className="flex gap-3 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Lengkap</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Cek</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-300"></div> Belum</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b border-gray-100 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Desa</th>
                  {activeTables.map(t => (
                    <th key={t} className="px-2 py-3 text-center font-semibold" title={tableLabel[t]?.label || t}>
                      {tableLabel[t]?.short || t}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(completeness.perDesa || []).map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-700">{d.nama}</td>
                    {activeTables.map(t => {
                      const status = d.tableStatuses?.[t]?.status || 'belum_lengkap';
                      const label = d.tableStatuses?.[t]?.label || getStatusLabel(status);
                      return (
                      <td key={t} className="px-2 py-2 text-center">
                        <div className={`mx-auto w-2.5 h-2.5 rounded-full ${getStatusDotClass(status)}`} title={label} />
                      </td>
                    );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.status === 'lengkap' ? 'bg-green-50 text-green-700' :
                        d.status === 'perlu_dicek' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>{d.statusLabel || getStatusLabel(d.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demographics Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold font-mono text-dashboard mb-4 uppercase tracking-wide">
              <ChartPie className="w-4 h-4 text-accent-500" /> Komposisi Jiwa (L/P)
            </h3>
            <div className="flex items-center justify-between gap-4">
              <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
                {(() => {
                  const l = rekap?.dataUmum?.total_jiwa_l || 1;
                  const p = rekap?.dataUmum?.total_jiwa_p || 1;
                  const total = l + p;
                  const lPct = l / total;
                  const circumference = 2 * Math.PI * 40;
                  return (
                    <>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round"
                        transform="rotate(-90 50 50)" strokeDasharray={`${lPct * circumference} ${circumference}`} />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#F472B6" strokeWidth="12" strokeLinecap="round"
                        transform="rotate(-90 50 50)" strokeDasharray={`${(1 - lPct) * circumference} ${circumference}`} strokeDashoffset={`${-lPct * circumference}`} />
                      <text x="50" y="54" textAnchor="middle" fill="#1f2937" fontSize="12" fontWeight="700">
                        <AnimatedCounter as="tspan" value={total} />
                      </text>
                    </>
                  );
                })()}
              </svg>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Laki-laki</div>
                  <div className="text-lg font-bold text-blue-600">
                    <AnimatedCounter value={rekap?.dataUmum?.total_jiwa_l || 0} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Perempuan</div>
                  <div className="text-lg font-bold text-pink-500">
                    <AnimatedCounter value={rekap?.dataUmum?.total_jiwa_p || 0} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold font-mono text-dashboard mb-4 uppercase tracking-wide">
              <ChartLineUp className="w-4 h-4 text-accent-500" /> Tren Penduduk
            </h3>
            <div className="h-40">
              <svg viewBox="0 0 320 140" preserveAspectRatio="none" className="w-full h-full">
                {(() => {
                  if (!trend || trend.length === 0) {
                    return <text x="160" y="70" textAnchor="middle" fill="#9ca3af" fontSize="11">Belum ada data</text>;
                  }
                  const max = Math.max(...trend.map(t => t.total_jiwa), 1);
                  const padX = 26;
                  const padTop = 26;    // ruang untuk label angka di atas titik
                  const padBottom = 22; // ruang untuk label tahun
                  const innerW = 320 - padX * 2;
                  const innerH = 140 - padTop - padBottom;
                  const n = trend.length;
                  const stepX = n > 1 ? innerW / (n - 1) : 0;
                  const coord = (i, v) => ({
                    x: padX + (n > 1 ? i * stepX : innerW / 2),
                    y: padTop + innerH - (v / max) * innerH,
                  });
                  const pts = trend.map((t, i) => {
                    const { x, y } = coord(i, t.total_jiwa);
                    return `${x},${y}`;
                  }).join(' L ');
                  return (
                    <>
                      <path d={`M ${pts}`} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {trend.map((t, i) => {
                        const { x, y } = coord(i, t.total_jiwa);
                        // Anchor dinamis supaya label di ujung tidak keluar card
                        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="3.5" fill="#fff" stroke="#059669" strokeWidth="2" />
                            <text x={x} y={y - 10} textAnchor={anchor} fill="#064E3B" fontSize="10" fontWeight="700">
                              {Number(t.total_jiwa || 0).toLocaleString('id-ID')}
                            </text>
                            <text x={x} y={140 - 6} textAnchor={anchor} fill="#64748b" fontSize="10">{t.tahun}</text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
