'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/AnimatedCounter';

const SERIES = [
  { key: 'ibuHamil', label: 'Ibu Hamil', color: '#EC4899' },
  { key: 'ibuMelahirkan', label: 'Melahirkan', color: '#A855F7' },
  { key: 'ibuNifas', label: 'Nifas', color: '#3B82F6' },
  { key: 'bayiLahir', label: 'Bayi Lahir', color: '#22C55E' },
];

/**
 * Stacked horizontal bar untuk metrik bumil per dusun.
 * Animasi: setiap segmen tumbuh ke kanan dengan delay bertahap.
 *
 * Props:
 *   - data: [{ id, nama, ibuHamil, ibuMelahirkan, ibuNifas, bayiLahir }]
 */
export default function StackedBumilBar({ data = [] }) {
  // Find global max total per row supaya scale konsisten
  const totals = data.map((d) => SERIES.reduce((s, x) => s + Number(d[x.key] || 0), 0));
  const max = Math.max(...totals, 1);

  return (
    <div
      className="glass rounded-3xl p-5 overflow-hidden"
      role="region"
      aria-label="Grafik komposisi ibu hamil, melahirkan, nifas, dan bayi lahir per dusun"
    >
      <div className="pb-4 border-b border-white/60 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">Bumil & Bayi per Dusun</h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Komposisi ibu hamil, melahirkan, nifas, bayi lahir</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-gray-700 dark:text-gray-300 font-medium">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="pt-4 space-y-3">
        {data.length === 0 ? (
          <div className="text-center text-xs text-gray-600 dark:text-gray-300 py-6">Belum ada data</div>
        ) : (
          data.map((d, i) => {
            const total = totals[i];
            return (
              <motion.div
                key={d.id || d.nama}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-2"
              >
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{d.nama}</span>
                <div
                  className="h-3 rounded-full bg-gray-100 dark:bg-surface-dark-elevated overflow-hidden flex"
                  role="group"
                  aria-label={`Komposisi ${d.nama}, total ${total}`}
                >
                  {SERIES.map((s, si) => {
                    const v = Number(d[s.key] || 0);
                    const percent = max > 0 ? (v / max) * 100 : 0;
                    return (
                      <motion.div
                        key={s.key}
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 + i * 0.04 + si * 0.05 }}
                        className="h-full"
                        style={{ background: s.color }}
                        title={`${s.label}: ${v}`}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 text-right tabular-nums">
                  <AnimatedCounter value={total} duration={1.0} />
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
