'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import AnimatedCounter from '@/components/AnimatedCounter';

const COVERAGE_LABELS = {
  out_of_filter: 'Tidak dapat diperiksa pada filter ini',
  unfilled: 'Belum ada nilai pada kolom yang diperiksa',
  partial: 'Sebagian tabel sumber belum terisi pada kolom yang diperiksa',
  unknown: 'Status tabel sumber tidak tersedia',
};

function hasNumericValue(row, key) {
  return row?.[key] !== null && row?.[key] !== undefined && Number.isFinite(Number(row[key]));
}

export default function DusunBarChart({ data = [], metrics = [], defaultMetric, title, subtitle, selectedDusunId, highlightedDusunId, onSelectDusun, onHighlightDusun }) {
  const [activeKey, setActiveKey] = useState(defaultMetric || metrics[0]?.key);
  const reduceMotion = useReducedMotion();
  const active = metrics.find(m => m.key === activeKey) || metrics[0];
  const sorted = useMemo(() => active ? [...data].sort((a, b) => {
    const aHasValue = hasNumericValue(a, active.key);
    const bHasValue = hasNumericValue(b, active.key);
    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
    if (!aHasValue) return String(a.nama).localeCompare(String(b.nama));
    return Number(b[active.key]) - Number(a[active.key]) || String(a.nama).localeCompare(String(b.nama));
  }) : [], [data, active]);
  if (!active) return null;
  const availableCount = sorted.filter(d => hasNumericValue(d, active.key)).length;
  const max = Math.max(...sorted.filter(d => hasNumericValue(d, active.key)).map(d => Number(d[active.key])), 1);
  const total = sorted.reduce((sum, d) => sum + (hasNumericValue(d, active.key) ? Number(d[active.key]) : 0), 0);
  let rank = 0;
  return (
    <section className="glass rounded-3xl p-5 md:p-6 overflow-hidden" aria-label={`Grafik batang ${title || 'per dusun'}`}>
      <div className="pb-4 border-b border-white/60 dark:border-white/10">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2><span className="text-xs text-gray-600 dark:text-gray-300 text-right">Total tercatat <strong className="text-gray-900 dark:text-white">{availableCount ? <AnimatedCounter value={total} /> : '—'}</strong><span className="block text-[10px]">{availableCount}/{sorted.length} dusun dapat diperiksa</span></span></div>
        {subtitle && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>}
        <div className="flex gap-1.5 flex-wrap mt-4" aria-label="Indikator grafik">
          {metrics.map(m => <button type="button" key={m.key} onClick={() => setActiveKey(m.key)} aria-pressed={m.key === active.key} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-primary-600 ${m.key === active.key ? 'bg-primary-600 text-white shadow-sm' : 'glass-pill text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10'}`}>{m.label}</button>)}
        </div>
      </div>
      <div className="pt-4 space-y-1">
        {!sorted.length ? <p className="text-sm text-gray-600 dark:text-gray-300 py-8 text-center">Belum ada dusun untuk dibandingkan.</p> : sorted.map(d => {
          const id = String(d.id);
          const available = hasNumericValue(d, active.key);
          const value = available ? Number(d[active.key]) : null;
          if (available) rank += 1;
          const coverageLabel = COVERAGE_LABELS[d[`${active.key}Coverage`]] || 'Nilai tidak tersedia';
          const selected = String(selectedDusunId) === id;
          const highlighted = String(highlightedDusunId) === id;
          const displayRank = available ? rank : '—';
          const contents = <><span className="text-[10px] text-gray-500 dark:text-gray-400 text-right">{displayRank}</span><div className="min-w-0"><div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5 truncate">{d.nama}</div><div className="h-2.5 rounded-full bg-gray-100 dark:bg-surface-dark-elevated overflow-hidden" aria-hidden="true"><motion.div initial={false} animate={{ width: available ? `${Math.max(0, Math.min(100, value / max * 100))}%` : '0%' }} transition={{ duration: reduceMotion ? 0 : 0.55, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: active.color }} /></div>{!available && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{coverageLabel}</p>}</div><span className="text-sm font-bold text-gray-900 dark:text-white text-right tabular-nums">{available ? <AnimatedCounter value={value} duration={0.55} /> : '—'}</span></>;
          const className = `w-full grid grid-cols-[1rem_minmax(0,1fr)_4.5rem] items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${selected ? 'bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary-300 dark:ring-primary-700' : highlighted ? 'bg-white/80 dark:bg-white/10' : ''}`;
          const accessibleValue = available ? `${value.toLocaleString('id-ID')} ${active.label}` : coverageLabel;
          return onSelectDusun ? <button type="button" key={id} aria-pressed={selected} aria-label={`${d.nama}: ${accessibleValue}. Fokus dusun`} onClick={() => onSelectDusun(id)} onFocus={() => onHighlightDusun?.(id)} onBlur={() => onHighlightDusun?.(null)} className={`${className} hover:bg-primary-50/70 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600`}>{contents}</button> : <div key={id} className={className} aria-label={`${d.nama}: ${accessibleValue}`}>{contents}</div>;
        })}
      </div>
      {!!sorted.length && availableCount > 0 && availableCount < sorted.length && <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">Jumlah merupakan agregat dari {availableCount} dusun yang tabel sumbernya dapat diperiksa pada filter ini.</p>}
      {!!sorted.length && availableCount === 0 && <p role="status" className="text-xs text-gray-600 dark:text-gray-300 mt-3">Nilai indikator tidak tersedia pada filter dan status sumber yang dipilih.</p>}
    </section>
  );
}
