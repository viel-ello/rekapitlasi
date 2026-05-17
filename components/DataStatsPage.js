'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  ClipboardList,
  ExclamationCircle,
  Pen,
} from 'flowbite-react-icons/outline';
import { MONTHS } from '@/lib/dataPages';
import { buildColumnTotals, buildDusunRanking, buildStatsSummary } from '@/lib/chartStats';
import { validateRow, countIssues } from '@/lib/validation';
import { applyColumnOverrides } from '@/lib/columnOverrides';
import { useYears } from '@/lib/useYears';
import AnimatedCounter from '@/components/AnimatedCounter';
import { DataPageIcon } from '@/components/DataPageIcon';
import EditModeModal from '@/components/EditModeModal';

function AnimatedBar({ percent, className = 'bg-primary-600' }) {
  return (
    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`h-full rounded-full ${className}`}
      />
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-700 border-primary-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      className={`rounded-xl border p-4 bg-white ${tones[tone] || tones.primary}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-gray-800">
            <AnimatedCounter value={value} />
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
          <div className="text-xs text-gray-500 mt-1">{sub}</div>
        </div>
        <div className={`rounded-lg p-2 ${tones[tone] || tones.primary}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DataStatsPage({ config }) {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [editModeOpen, setEditModeOpen] = useState(false);
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [prevRows, setPrevRows] = useState([]);
  const [dusunList, setDusunList] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(config.primaryMetric || config.columns[0]?.key);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overrides, setOverrides] = useState([]);
  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]);

  useEffect(() => {
    setSelectedMetric(config.primaryMetric || config.columns[0]?.key);
  }, [config]);

  // Load column overrides (rename/hide) — public read for logged-in users
  useEffect(() => {
    let cancelled = false;
    async function loadOverrides() {
      try {
        const res = await fetch(`/api/admin/column-overrides?table_name=${encodeURIComponent(config.tableName)}`);
        if (res.ok && !cancelled) {
          setOverrides(await res.json());
        }
      } catch {
        // silent — fallback ke default labels
      }
    }
    loadOverrides();
    return () => { cancelled = true; };
  }, [config.tableName]);

  const effectiveColumns = useMemo(
    () => applyColumnOverrides(config.columns, overrides).filter((c) => !c.hidden),
    [config.columns, overrides]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ tahun: String(tahun) });
        const prevParams = new URLSearchParams({ tahun: String(tahun - 1) });
        if (config.hasMonth) {
          params.set('bulan', String(bulan));
          prevParams.set('bulan', String(bulan));
        }

        const [desaRes, dataRes, prevRes] = await Promise.all([
          fetch('/api/dusun'),
          fetch(`${config.apiEndpoint}?${params.toString()}`),
          fetch(`${config.apiEndpoint}?${prevParams.toString()}`),
        ]);

        if (!desaRes.ok || !dataRes.ok || !prevRes.ok) {
          throw new Error('Gagal memuat statistik data');
        }

        const [desaData, rowData, prevData] = await Promise.all([
          desaRes.json(),
          dataRes.json(),
          prevRes.json(),
        ]);

        if (!cancelled) {
          setDusunList(Array.isArray(desaData) ? desaData : []);
          setRows(Array.isArray(rowData) ? rowData : []);
          setPrevRows(Array.isArray(prevData) ? prevData : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Gagal memuat statistik data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [tahun, bulan, config]);

  const prevMap = useMemo(() => {
    const map = {};
    prevRows.forEach((row) => { map[(row.dusun_id ?? row.desa_id)] = row; });
    return map;
  }, [prevRows]);

  const summary = useMemo(() => buildStatsSummary(rows, effectiveColumns, dusunList), [rows, effectiveColumns, dusunList]);
  const totals = summary.totals;
  const maxTotal = Math.max(...totals.map((item) => item.total), 1);
  const ranking = useMemo(() => buildDusunRanking(rows, dusunList, selectedMetric), [rows, dusunList, selectedMetric]);
  const maxRankValue = Math.max(...ranking.map(item => item.value), 1);
  const selectedColumn = effectiveColumns.find((column) => column.key === selectedMetric) || effectiveColumns[0];

  const needsCheck = useMemo(() => {
    return rows.reduce((sum, row) => {
      const validation = validateRow(row, effectiveColumns, prevMap[(row.dusun_id ?? row.desa_id)]);
      const issues = countIssues(validation);
      return sum + (issues.errors > 0 || issues.warnings > 0 ? 1 : 0);
    }, 0);
  }, [rows, effectiveColumns, prevMap]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-64 rounded-xl bg-gray-100 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => <div key={index} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="h-96 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DataPageIcon name={config.icon} className="w-7 h-7" /> {config.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{config.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {config.hasMonth && (
            <select
              value={bulan}
              onChange={(event) => setBulan(Number(event.target.value))}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
              aria-label="Pilih bulan statistik"
            >
              {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          )}
          <select
            value={tahun}
            onChange={(event) => setTahun(Number(event.target.value))}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            aria-label="Pilih tahun statistik"
          >
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setEditModeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Pen className="w-4 h-4" /> Edit Data
          </button>
        </div>
      </div>

      <EditModeModal
        open={editModeOpen}
        onClose={() => setEditModeOpen(false)}
        editPath={config.editPath}
      />

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <ExclamationCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Dusun Aktif"
          value={summary.totalDusun}
          sub={<><AnimatedCounter value={summary.filledDusun} duration={1.2} /> dusun sudah punya record</>}
          icon={CheckCircle}
          tone="green"
        />
        <KpiCard label="Indikator" value={summary.indicatorCount} sub="kolom standar divisualkan" icon={ClipboardList} tone="blue" />
        <KpiCard label="Total Nilai" value={summary.totalValue} sub="akumulasi semua indikator" icon={ChartLineUp} tone="primary" />
        <KpiCard label="Perlu Dicek" value={needsCheck} sub="dusun dengan warning/anomali" icon={ExclamationCircle} tone="amber" />
      </motion.div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Total Semua Indikator</h2>
            <p className="text-xs text-gray-500 mt-1">Akumulasi per kolom untuk tahun terpilih</p>
          </div>
          <div className="p-4 space-y-3 max-h-[560px] overflow-y-auto">
            {totals.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-700 truncate" title={item.label}>{item.label}</span>
                  <span className="font-bold text-gray-900">
                    <AnimatedCounter value={item.total} duration={1.2} />
                  </span>
                </div>
                <AnimatedBar percent={(item.total / maxTotal) * 100} className={index % 3 === 0 ? 'bg-primary-600' : index % 3 === 1 ? 'bg-blue-500' : 'bg-amber-500'} />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Ranking Dusun</h2>
              <p className="text-xs text-gray-500 mt-1">Perbandingan dusun berdasarkan indikator fokus</p>
            </div>
            <select
              value={selectedMetric}
              onChange={(event) => setSelectedMetric(event.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
              aria-label="Pilih indikator ranking dusun"
            >
              {effectiveColumns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
          </div>
          <div className="p-4">
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center justify-between">
              <span>Indikator</span>
              <span className="font-bold">{selectedColumn?.label}</span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {ranking.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.025 }}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_4.5rem] items-center gap-3"
                >
                  <span className="text-xs font-bold text-gray-400 text-right">{index + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{item.nama}</span>
                    </div>
                    <AnimatedBar percent={(item.value / maxRankValue) * 100} className="bg-primary-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 text-right">
                    <AnimatedCounter value={item.value} duration={1.2} />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setEditModeOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        Buka tabel input dan validasi <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
