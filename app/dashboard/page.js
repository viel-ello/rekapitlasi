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
import { useYears } from '@/lib/useYears';
import { useRouter } from 'next/navigation';
import DashboardToolbar from '@/components/DashboardToolbar';

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
  const [compareData, setCompareData] = useState(null); // { aggregate, byDesa }
  const [compareDesaIds, setCompareDesaIds] = useState([]); // [] = aggregate only
  const router = useRouter();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [jenisData, setJenisData] = useState('all');
  const [bulan, setBulan] = useState(12);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const { years } = useYears();

  // Jika tahun aktif saat ini tidak ada dalam daftar, pilih tahun pertama
  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) {
      setTahun(years[0]);
    }
  }, [years]);

  useEffect(() => {
    fetchRekap();
  }, [tahun, jenisData, bulan, compareDesaIds.join(',')]);

  const fetchRekap = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: String(tahun),
        jenis: jenisData,
        bulan: String(bulan),
      });
      const trendUrl = compareDesaIds.length > 0
        ? `/api/rekap/trend?desa_ids=${compareDesaIds.join(',')}`
        : '/api/rekap/trend';
      const [resRekap, resTrend] = await Promise.all([
        fetch(`/api/rekap?${params.toString()}`),
        fetch(trendUrl),
      ]);
      setRekap(await resRekap.json());
      const trendJson = await resTrend.json();
      // Backward-compat: kalau aggregate-only, response = array
      if (Array.isArray(trendJson)) {
        setTrend(trendJson);
        setCompareData(null);
      } else {
        setTrend(trendJson.aggregate || []);
        setCompareData(trendJson);
      }
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
        <div className="md:max-w-2xl w-full md:w-auto">
          <DashboardToolbar
            tahun={tahun} setTahun={setTahun} years={years}
            bulan={bulan} setBulan={setBulan} months={MONTHS}
            jenisData={jenisData} setJenisData={setJenisData} tableFilters={TABLE_FILTERS}
            onDownloadExcel={() => handleDownload('excel')}
            onDownloadWord={() => handleDownload('word')}
            onDownloadTemplate={handleDownloadTemplate}
            downloading={downloading}
            downloadingTemplate={downloadingTemplate}
          />
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
                  <tr
                    key={d.id}
                    className="hover:bg-primary-50/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/desa/${d.id}?tahun=${tahun}&bulan=${bulan}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/desa/${d.id}?tahun=${tahun}&bulan=${bulan}`);
                      }
                    }}
                    aria-label={`Lihat detail ${d.nama}`}
                  >
                    <td className="px-4 py-2 font-medium text-gray-700 group">
                      <span className="inline-flex items-center gap-1">
                        {d.nama}
                        <span className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                      </span>
                    </td>
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

          <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h3 className="flex items-center gap-2 text-sm font-bold font-mono text-dashboard uppercase tracking-wide">
                <ChartLineUp className="w-4 h-4 text-accent-500" /> Tren Penduduk
              </h3>
              <DesaCompareSelector
                desaList={completeness.perDesa || []}
                selected={compareDesaIds}
                onChange={setCompareDesaIds}
              />
            </div>
            <div className="h-44 w-full">
              <TrendCompareChart
                aggregate={trend}
                byDesa={compareData?.byDesa}
                desaIds={compareDesaIds}
                field="total_jiwa"
              />
            </div>
            {compareDesaIds.length > 0 && compareData?.byDesa && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                {compareDesaIds.map((id, idx) => {
                  const colors = ['#059669', '#3B82F6', '#F59E0B', '#EF4444', '#A855F7'];
                  const c = colors[idx % colors.length];
                  const nama = compareData.byDesa[id]?.nama || `Desa ${id}`;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 text-xs">
                      <span className="w-3 h-1 rounded-sm" style={{ background: c }} />
                      <span className="text-gray-700">{nama}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

    </motion.div>
  );
}


// ── Helper: dropdown pilih desa untuk comparison ─────────────────────────────
function DesaCompareSelector({ desaList, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = (desaList || []).filter((d) => d.nama.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= 5) return; // max 5 untuk legibility
      onChange([...selected, id]);
    }
  };

  const label = selected.length === 0
    ? 'Total kecamatan'
    : selected.length === 1
      ? (desaList.find((d) => d.id === selected[0])?.nama || 'Desa')
      : `${selected.length} desa terpilih`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin className="w-3.5 h-3.5 text-gray-500" /> {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-50">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari desa..."
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-medium text-primary-700"
              >
                Total kecamatan
              </button>
              <div className="border-t border-gray-50 my-1" />
              {filtered.map((d) => (
                <label key={d.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />
                  <span className="text-gray-700">{d.nama}</span>
                </label>
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">Tidak ditemukan</div>}
            </div>
            <div className="px-3 py-1.5 border-t border-gray-50 text-[10px] text-gray-400">Maksimal 5 desa untuk perbandingan</div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helper: chart trend dengan opsi multi-line untuk comparison ──────────────
function TrendCompareChart({ aggregate, byDesa, desaIds, field }) {
  const COLORS = ['#059669', '#3B82F6', '#F59E0B', '#EF4444', '#A855F7'];

  // Data series
  const series = [];
  if (!desaIds || desaIds.length === 0) {
    if (!aggregate || aggregate.length === 0) {
      return (
        <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid meet" className="block w-full h-full">
          <text x="160" y="70" textAnchor="middle" fill="#9ca3af" fontSize="11">Belum ada data</text>
        </svg>
      );
    }
    series.push({ label: 'Total', color: COLORS[0], rows: aggregate, primary: true });
  } else {
    desaIds.forEach((id, idx) => {
      const d = byDesa?.[id];
      if (d) series.push({ label: d.nama, color: COLORS[idx % COLORS.length], rows: d.rows, primary: idx === 0 });
    });
  }

  if (series.length === 0) {
    return (
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid meet" className="block w-full h-full">
        <text x="160" y="70" textAnchor="middle" fill="#9ca3af" fontSize="11">Belum ada data</text>
      </svg>
    );
  }

  const padLeft = 40, padRight = 40, padTop = 20, padBottom = 22;
  const W = 320, H = 140;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const allValues = series.flatMap((s) => s.rows.map((r) => Number(r[field] || 0)));
  const max = Math.max(...allValues, 1);
  const years = (series[0]?.rows || []).map((r) => r.tahun);
  const n = years.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const xAt = (i) => padLeft + (n > 1 ? i * stepX : innerW / 2);
  const yAt = (v) => padTop + innerH - (v / max) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block w-full h-full">
      {/* Lines */}
      {series.map((s, sidx) => {
        const pts = s.rows.map((r, i) => `${xAt(i)},${yAt(Number(r[field] || 0))}`).join(' L ');
        return <path key={sidx} d={`M ${pts}`} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={s.primary ? 1 : 0.85} />;
      })}

      {/* Points + labels (only primary series) */}
      {series.map((s, sidx) => s.rows.map((r, i) => {
        const x = xAt(i);
        const y = yAt(Number(r[field] || 0));
        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
        return (
          <g key={`${sidx}-${i}`}>
            <circle cx={x} cy={y} r={s.primary ? 3.5 : 2.5} fill="#fff" stroke={s.color} strokeWidth="2" />
            {s.primary && (
              <text x={x} y={y - 10} textAnchor={anchor} fill="#1f2937" fontSize="10" fontWeight="700">
                {Number(r[field] || 0).toLocaleString('id-ID')}
              </text>
            )}
          </g>
        );
      }))}

      {/* X axis (tahun) */}
      {years.map((y, i) => (
        <text key={`yr-${i}`} x={xAt(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fill="#64748b" fontSize="10">{y}</text>
      ))}
    </svg>
  );
}
