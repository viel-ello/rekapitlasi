'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/AnimatedCounter';

/**
 * Bar chart horizontal per dusun untuk satu metrik.
 * Animasi: bar grow dari kiri.
 *
 * Props:
 *   - data: [{ nama, ...metrics }]
 *   - metrics: [{ key, label, color }]
 *   - defaultMetric: string (key di metrics)
 *   - title, subtitle: string
 */
export default function DusunBarChart({ data = [], metrics, defaultMetric, title, subtitle }) {
  const [activeKey, setActiveKey] = useState(defaultMetric || metrics[0]?.key);
  const active = metrics.find((m) => m.key === activeKey) || metrics[0];

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => Number(b[active.key] || 0) - Number(a[active.key] || 0));
  }, [data, active.key]);

  const max = Math.max(...sorted.map((d) => Number(d[active.key] || 0)), 1);
  const total = sorted.reduce((s, d) => s + Number(d[active.key] || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveKey(m.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                m.key === active.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              aria-pressed={m.key === active.key}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Per dusun</span>
          <span>Total: <AnimatedCounter value={total} duration={1.1} /></span>
        </div>
        {sorted.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-6">Belum ada data</div>
        ) : (
          sorted.map((d, i) => {
            const value = Number(d[active.key] || 0);
            const percent = (value / max) * 100;
            return (
              <motion.div
                key={d.id || d.nama}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="grid grid-cols-[1.2rem_minmax(0,1fr)_4rem] items-center gap-2"
              >
                <span className="text-[10px] font-bold text-gray-400 text-right">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate">{d.nama}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      key={`${active.key}-${d.id || d.nama}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 + i * 0.04 }}
                      className="h-full rounded-full"
                      style={{ background: active.color }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-900 text-right tabular-nums">
                  <AnimatedCounter value={value} duration={1.0} />
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
