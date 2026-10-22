'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle, ExclamationCircle, MapPin } from 'flowbite-react-icons/outline';
import AnimatedCounter from '@/components/AnimatedCounter';
import DashboardToolbar from '@/components/DashboardToolbar';
import TodoTodayPanel from '@/components/TodoTodayPanel';
import ConfirmModal from '@/components/ConfirmModal';
import DusunBarChart from '@/components/charts/DusunBarChart';
import CompletenessHeatmap from '@/components/CompletenessHeatmap';
import DataQualityAuditor from '@/components/DataQualityAuditor';
import { useToast } from '@/lib/useToast';
import { useYears } from '@/lib/useYears';

const TABLE_FILTERS = [
  { value: 'all', label: 'Semua Data', short: 'Semua' },
  { value: 'data_umum', label: 'Data Umum', short: 'Umum' },
  { value: 'data_pokja1', label: 'Pokja I', short: 'P1' },
  { value: 'data_pokja2', label: 'Pokja II', short: 'P2' },
  { value: 'data_pokja3', label: 'Pokja III', short: 'P3' },
  { value: 'data_pokja4', label: 'Pokja IV', short: 'P4' },
  { value: 'data_rekap_dawis', label: 'Rekap Dawis', short: 'Dawis' },
  { value: 'data_bumil', label: 'Bumil', short: 'Bumil' },
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];


const METRICS = [
  { key: 'kk', label: 'KK', color: '#059669', sources: ['data_umum'] },
  { key: 'jiwa', label: 'Jiwa', color: '#3B82F6', sources: ['data_umum'] },
  { key: 'dasaWisma', label: 'Dasa Wisma', color: '#22C55E', sources: ['data_umum'] },
  { key: 'kaderTotal', label: 'Kader', color: '#F59E0B', sources: ['data_umum', 'data_pokja1', 'data_pokja3', 'data_pokja4'] },
  { key: 'posyandu', label: 'Posyandu', color: '#A855F7', sources: ['data_pokja4'] },
  { key: 'rumahSehat', label: 'Rumah Sehat', color: '#10B981', sources: ['data_pokja3', 'data_rekap_dawis'] },
  { key: 'jknBpjs', label: 'JKN/BPJS', color: '#EC4899', sources: ['data_rekap_dawis'] },
];
const statusLabel = status => status === 'lengkap' ? 'Lengkap' : status === 'perlu_dicek' ? 'Perlu dicek' : 'Belum lengkap';
const statusColor = status => status === 'lengkap' ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300' : status === 'perlu_dicek' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300';

function getMetricCoverage(dusunStatus, sourceTables, activeFilter) {
  if (activeFilter !== 'all' && sourceTables.some(table => table !== activeFilter)) return 'out_of_filter';
  const statuses = sourceTables.map(table => dusunStatus?.tableStatuses?.[table]?.status);
  if (statuses.some(status => !status)) return 'unknown';
  if (statuses.every(status => status === 'belum_lengkap')) return 'unfilled';
  if (statuses.some(status => status === 'belum_lengkap')) return 'partial';
  return 'tracked';
}

function metricCoverageLabel(coverage) {
  if (coverage === 'out_of_filter') return 'Tidak dapat diperiksa pada filter ini';
  if (coverage === 'unfilled') return 'Belum ada nilai pada kolom yang diperiksa';
  if (coverage === 'partial') return 'Sebagian tabel sumber belum terisi pada kolom yang diperiksa';
  if (coverage === 'unknown') return 'Status tabel sumber tidak tersedia';
  return '';
}

export default function DashboardPage() {
  const [rekap, setRekap] = useState(null);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(12);
  const [jenisData, setJenisData] = useState('all');
  const [loadedPeriod, setLoadedPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedDusun, setSelectedDusun] = useState(null);
  const [highlightedDusun, setHighlightedDusun] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(null);
  const [confirmExport, setConfirmExport] = useState(null);
  const requestRef = useRef(0);
  const controllerRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { showToast } = useToast();
  const { years } = useYears();

  useEffect(() => {
    if (years.length && !years.includes(tahun)) setTahun(years[0]);
  }, [years, tahun]);

  const fetchRekap = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const request = ++requestRef.current;
    const period = { tahun, bulan, jenis: jenisData };
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan), jenis: jenisData });
      const response = await fetch(`/api/rekap?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Gagal memuat rekap');
      const json = await response.json();
      if (controller.signal.aborted || request !== requestRef.current) return;
      setRekap(json);
      setLoadedPeriod(period);
    } catch (error) {
      if (controller.signal.aborted || request !== requestRef.current) return;
      setFetchError(true);
    } finally {
      if (!controller.signal.aborted && request === requestRef.current) setLoading(false);
    }
  }, [tahun, bulan, jenisData]);

  useEffect(() => {
    setConfirmExport(null);
    fetchRekap();
    return () => { controllerRef.current?.abort(); requestRef.current += 1; };
  }, [fetchRekap]);

  const _performDownload = async (type) => {
    setDownloading(type);
    try {
      const exportUrl = `/api/export/${type}?tahun=${tahun}&bulan=${bulan}`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error('Gagal mengunduh');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel'
        ? `Rekapitulasi_PKK_Belikurip_${tahun}_Bulan_${bulan}.xlsx`
        : `Data_Kegiatan_PKK_${tahun}${bulan ? `_Bulan_${bulan}` : ''}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      showToast({ type: 'error', message: 'Terjadi kesalahan saat mengunduh file.' });
    }
    setDownloading(null);
  };

  const handleDownload = async (type) => {
    const needsCheck = rekap?.completeness?.needsCheck || 0;
    const incomplete = rekap?.completeness?.incomplete || 0;
    if (needsCheck > 0 || incomplete > 0) {
      // Konfirmasi via Dialog (ganti window.confirm).
      setConfirmExport({ type, needsCheck, incomplete });
      return;
    }
    await _performDownload(type);
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
    } catch (err) {
      console.error('Template download error:', err);
      showToast({ type: 'error', message: 'Terjadi kesalahan saat mengunduh template.' });
    }
    setDownloadingTemplate(null);
  };


  const completeness = rekap?.completeness;
  const dusunList = (completeness?.perDusun || completeness?.perDesa || []).map(d => ({ ...d, id: String(d.id) }));
  const period = loadedPeriod || { tahun, bulan, jenis: jenisData };
  const metrics = (rekap?.perDusunMetrics || []).map(d => {
    const id = String(d.id);
    const dusunStatus = dusunList.find(item => item.id === id);
    const normalized = { ...d, id };
    for (const metric of METRICS) {
      const coverage = getMetricCoverage(dusunStatus, metric.sources, period.jenis);
      normalized[metric.key] = coverage === 'tracked' ? d[metric.key] : null;
      normalized[`${metric.key}Coverage`] = coverage;
    }
    return normalized;
  });
  const chartMetrics = period.jenis === 'all'
    ? METRICS
    : METRICS.filter(metric => metric.sources.length === 1 && metric.sources[0] === period.jenis);
  const metricSummaries = Object.fromEntries(METRICS.map(metric => {
    const available = metrics.filter(row => row[`${metric.key}Coverage`] === 'tracked');
    const coverageStates = metrics.map(row => row[`${metric.key}Coverage`]);
    const summaryCoverage = available.length
      ? 'tracked'
      : coverageStates.length && coverageStates.every(value => value === 'out_of_filter')
        ? 'out_of_filter'
        : coverageStates.length && coverageStates.every(value => value === 'unfilled')
          ? 'unfilled'
          : coverageStates.includes('partial') || coverageStates.includes('unfilled')
            ? 'partial'
            : 'unknown';
    return [metric.key, {
      value: available.length ? available.reduce((sum, row) => sum + Number(row[metric.key] || 0), 0) : null,
      tracked: available.length,
      total: dusunList.length,
      coverage: summaryCoverage,
    }];
  }));
  const total = Number(completeness?.total || 0);
  const complete = Number(completeness?.complete || 0);
  const percent = total ? Math.round(complete / total * 100) : 0;
  const focused = dusunList.find(d => d.id === selectedDusun);
  const focusedMetrics = metrics.find(d => d.id === selectedDusun);
  const periodLabel = `${MONTHS[period.bulan - 1]} ${period.tahun}`;
  const targetPeriodLabel = `${MONTHS[bulan - 1]} ${tahun}`;
  const filterLabel = TABLE_FILTERS.find(f => f.value === period.jenis)?.label || 'Semua Data';
  const isStale = !!rekap && (period.tahun !== tahun || period.bulan !== bulan || period.jenis !== jenisData);
  const selectDusun = id => setSelectedDusun(id == null ? null : String(id));

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <ConfirmModal isOpen={!!confirmExport} type="warning" title="Tetap export laporan?"
        message={`Masih ada ${confirmExport?.needsCheck || 0} dusun perlu dicek dan ${confirmExport?.incomplete || 0} dusun belum lengkap. Tetap export laporan?`}
        confirmText="Ya, export" cancelText="Batal"
        onConfirm={() => { const type = confirmExport?.type; setConfirmExport(null); if (type) _performDownload(type); }}
        onCancel={() => setConfirmExport(null)} />
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-primary-700 dark:text-primary-300 font-semibold">TP PKK Desa Belikurip</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">Studio Data</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">Pantau pelaporan, temukan dusun yang perlu ditinjau, dan lanjutkan pekerjaan dari satu ruang.</p>
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">Kecamatan Baturetno</span>
      </header>
      <div className="glass rounded-2xl p-3 md:p-4">
        <DashboardToolbar tahun={tahun} setTahun={setTahun} years={years}
          bulan={bulan} setBulan={setBulan} months={MONTHS}
          jenisData={jenisData} setJenisData={setJenisData} tableFilters={TABLE_FILTERS}
          onDownloadExcel={() => handleDownload('excel')} onDownloadWord={() => handleDownload('word')}
          onDownloadTemplate={handleDownloadTemplate} downloading={downloading} downloadingTemplate={downloadingTemplate}
          actionsDisabled={loading || isStale || !rekap} />
      </div>
      <div role="status" aria-live="polite" className={`text-xs min-h-5 ${fetchError ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>
        {fetchError ? <span className="inline-flex items-center gap-2 flex-wrap"><ExclamationCircle className="w-4 h-4" /> Gagal memuat {targetPeriodLabel}.{rekap && ` Data ${periodLabel} tetap ditampilkan.`}<button type="button" onClick={fetchRekap} className="font-bold underline underline-offset-4">Coba lagi</button></span>
          : loading ? `${rekap ? `Menampilkan ${periodLabel} · ${filterLabel}. ` : ''}Memuat ${targetPeriodLabel} · ${TABLE_FILTERS.find(f => f.value === jenisData)?.label}…`
          : `Data ${periodLabel} · ${filterLabel}`}
      </div>
      {!rekap ? loading ? <DashboardSkeleton /> : <div className="glass rounded-3xl p-8 text-center text-sm text-gray-600 dark:text-gray-300">Data belum dapat ditampilkan. Gunakan Coba lagi untuk memuat periode ini.</div> : (
        <div className="space-y-5" aria-busy={loading} data-displayed-period={`${period.tahun}-${period.bulan}-${period.jenis}`}>
          <div className="grid gap-5 xl:grid-cols-12">
            <section className="glass rounded-3xl p-5 md:p-7 xl:col-span-7 relative overflow-hidden" aria-label="Kelengkapan seluruh dusun">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">Semua dusun</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{periodLabel} · {filterLabel}</p>
                </div>
                <span className="glass-pill px-3 py-1 rounded-full text-xs font-semibold text-primary-700 dark:text-primary-300">{total} dusun</span>
              </div>
              <div className="flex items-center gap-5 md:gap-9 mt-6">
                <div className="relative w-36 h-36 md:w-44 md:h-44 shrink-0" role="img" aria-label={total ? `${complete} dari ${total} dusun lengkap, ${percent} persen, ${periodLabel}, ${filterLabel}` : `Belum ada dusun pada ${periodLabel}`}>
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" className="text-primary-100 dark:text-white/10" />
                    <motion.circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" pathLength="100"
                      initial={false} animate={{ strokeDasharray: `${percent} 100` }} transition={{ duration: reduceMotion ? 0 : 0.6 }} className="text-primary-600 dark:text-primary-400" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center" aria-hidden="true"><span className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{total ? <AnimatedCounter value={percent} suffix="%" /> : '—'}</span><span aria-label="Dusun Lengkap" className="text-xs text-gray-600 dark:text-gray-300 mt-1">Dusun Lengkap</span></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"><AnimatedCounter value={complete} /> <span className="text-base font-medium text-gray-500 dark:text-gray-400">dari {total} dusun</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">Memenuhi pemeriksaan kelengkapan untuk jenis data yang dipilih.</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs">
                    <span className="text-amber-700 dark:text-amber-300"><strong><AnimatedCounter value={completeness.needsCheck || 0} /></strong> perlu dicek</span>
                    <span className="text-red-700 dark:text-red-300"><strong><AnimatedCounter value={completeness.incomplete || 0} /></strong> belum lengkap</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/60 dark:border-white/10 mt-6 pt-4">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-3">Ringkasan Data Umum</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[['KK', 'kk'], ['Jiwa', 'jiwa'], ['Dasa Wisma', 'dasaWisma']].map(([label, key]) => {
                    const summary = metricSummaries[key];
                    return <div key={label}>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{label}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{summary.value == null ? '—' : <AnimatedCounter value={summary.value} />}</p>
                      <p className="text-[10px] leading-snug text-gray-500 dark:text-gray-400 mt-1">{summary.tracked ? `Sumber dapat diperiksa di ${summary.tracked}/${summary.total} dusun` : metricCoverageLabel(summary.coverage)}</p>
                    </div>;
                  })}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3">Tanda — menunjukkan sumber di luar filter atau belum berisi nilai pada kolom yang diperiksa. API menghitung kolom angka kosong atau nonnumerik sebagai 0, sehingga angka agregat tetap perlu dibaca bersama status sumber.</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">Data Umum, Rekap Dawis, dan Bumil mengikuti bulan terpilih. Pokja I sampai IV merupakan catatan tahunan.</p>
            </section>
            <section className="glass rounded-3xl p-5 md:p-6 xl:col-span-5" aria-label="Fokus dusun">
              <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-lg text-gray-900 dark:text-white">Fokus dusun</h2>{focused && <button type="button" onClick={() => selectDusun(null)} className="text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline">Lihat semua</button>}</div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Pilih dusun di sini, grafik, atau heatmap.</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-4">Dusun</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {dusunList.map(d => <button key={d.id} type="button" aria-pressed={selectedDusun === d.id} onClick={() => selectDusun(d.id)} onFocus={() => setHighlightedDusun(d.id)} onBlur={() => setHighlightedDusun(null)}
                  className={`px-2.5 py-2 text-xs rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${selectedDusun === d.id ? 'bg-primary-600 text-white' : 'glass-pill text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-white/10'}`}>{d.nama}</button>)}
              </div>
              <div className="mt-5 border-t border-white/60 dark:border-white/10 pt-4 min-h-40">
                {focused ? <><div className="flex justify-between gap-3 items-center"><h3 className="font-bold text-gray-900 dark:text-white">{focused.nama}</h3><span className={`text-xs rounded-full px-2.5 py-1 font-semibold ${statusColor(focused.status)}`}>{statusLabel(focused.status)}</span></div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{focused.filled} dari {focused.total} tabel lengkap · {periodLabel}</p>
                  <div className="grid grid-cols-3 gap-2 mt-4">{[['KK', 'kk'], ['Jiwa', 'jiwa'], ['Kader', 'kaderTotal']].map(([label, key]) => {
                    const value = focusedMetrics?.[key];
                    return <div key={label}><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{value == null ? '—' : <AnimatedCounter value={value} />}</p></div>;
                  })}</div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">Nilai — menandai sumber di luar filter atau belum berisi nilai pada kolom yang diperiksa.</p>
                  <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300 mt-4" href={`/dashboard/dusun/${focused.id}?tahun=${period.tahun}&bulan=${period.bulan}`}>Buka detail dusun <ArrowRight className="w-4 h-4" /></Link>
                </> : <div className="text-sm text-gray-600 dark:text-gray-300 flex gap-3 items-start py-2"><MapPin className="w-5 h-5 shrink-0 text-primary-600" /><p>Pilih salah satu dusun untuk melihat ringkasannya. Persentase di sebelah kiri selalu mencakup seluruh dusun.</p></div>}
              </div>
            </section>
          </div>
          <div className="grid gap-5 xl:grid-cols-12 items-start">
            <div className="xl:col-span-8">{chartMetrics.length
              ? <DusunBarChart data={metrics} metrics={chartMetrics} defaultMetric="kk" title="Perbandingan dusun" subtitle={`Nilai agregasi API untuk ${periodLabel}. — berarti sumber tidak tercakup atau tidak memiliki nilai pada kolom yang diperiksa.`} selectedDusunId={selectedDusun} highlightedDusunId={highlightedDusun} onSelectDusun={selectDusun} onHighlightDusun={setHighlightedDusun} />
              : <section className="glass rounded-3xl p-5 md:p-6" aria-label="Perbandingan dusun"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Perbandingan dusun</h2><p role="status" className="text-sm text-gray-600 dark:text-gray-300 mt-2">Belum ada indikator per dusun yang tersedia pada filter {filterLabel}. Pilih Semua Data atau filter dengan indikator grafik yang tersedia.</p></section>}
            </div>
            <div className="xl:col-span-4 space-y-5">
              <TodoTodayPanel completeness={completeness} />
              <section className="glass rounded-3xl p-5"><h2 className="text-sm font-bold text-gray-900 dark:text-white">Tinjau laporan</h2><p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{periodLabel} · {filterLabel}</p>
                <div className="mt-3 max-h-60 overflow-y-auto space-y-1">{dusunList.filter(d => d.status !== 'lengkap').length ? dusunList.filter(d => d.status !== 'lengkap').map(d => <button type="button" key={d.id} aria-pressed={selectedDusun === d.id} onClick={() => selectDusun(d.id)} className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 focus-visible:outline-primary-600"><span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{d.nama}</span><span className={`rounded-full text-[11px] px-2 py-1 ${statusColor(d.status)}`}>{statusLabel(d.status)}</span></button>) : <p className="text-sm text-gray-600 dark:text-gray-300 py-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Semua dusun lengkap pada filter ini.</p>}</div>
              </section>
            </div>
          </div>
          <CompletenessHeatmap tahun={period.tahun} activeBulan={period.bulan} jenisData={period.jenis} selectedDusunId={selectedDusun} highlightedDusunId={highlightedDusun} onHighlightDusun={setHighlightedDusun}
            onSelectBulan={(month, dusunId) => { setBulan(Number(month)); if (dusunId != null) selectDusun(dusunId); }} currentRekap={rekap} />
          <details className="glass rounded-3xl p-5"><summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-100">Pemeriksaan silang kualitas data</summary><div className="mt-4"><DataQualityAuditor rekap={rekap} tahun={period.tahun} bulan={period.bulan} /></div></details>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return <div aria-label="Memuat ringkasan dashboard" className="space-y-5"><div className="grid xl:grid-cols-12 gap-5"><div className="glass rounded-3xl h-80 animate-pulse xl:col-span-7" /><div className="glass rounded-3xl h-80 animate-pulse xl:col-span-5" /></div><div className="glass rounded-3xl h-96 animate-pulse" /></div>;
}
