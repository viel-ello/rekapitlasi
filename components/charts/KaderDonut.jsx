'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '@/components/AnimatedCounter';

const COLORS = ['#059669', '#3B82F6', '#F59E0B', '#A855F7'];

/**
 * Donut chart distribusi kader per kategori.
 * Animasi: stroke-dasharray grow dari 0 → target value.
 *
 * Props:
 *   - segments: [{ label, value, color? }]
 */
export default function KaderDonut({ segments = [] }) {
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0);
  const safeTotal = total || 1;

  // Build cumulative offsets
  const C = 2 * Math.PI * 40; // circumference (r=40)
  let cumulative = 0;
  const arcs = segments.map((s, i) => {
    const value = Number(s.value || 0);
    const len = (value / safeTotal) * C;
    const start = cumulative;
    cumulative += len;
    return {
      ...s,
      length: len,
      offset: -start, // SVG strokeDashoffset rotates negative
      color: s.color || COLORS[i % COLORS.length],
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
        Distribusi Kader
      </h3>
      <div className="flex items-center justify-between gap-4">
        <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
          {/* Background ring */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="14" />
          {/* Animated segments */}
          {arcs.map((a, i) => (
            <motion.circle
              key={`${a.label}-${i}`}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={a.color}
              strokeWidth="14"
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
              strokeDasharray={`0 ${C}`}
              animate={{ strokeDasharray: `${a.length} ${C}` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 + i * 0.12 }}
              strokeDashoffset={a.offset}
            />
          ))}
          <text x="50" y="48" textAnchor="middle" fill="#1f2937" fontSize="10" fontWeight="700">
            <AnimatedCounter as="tspan" value={total} duration={1.1} />
          </text>
          <text x="50" y="60" textAnchor="middle" fill="#6b7280" fontSize="6">
            kader total
          </text>
        </svg>
        <ul className="space-y-2 flex-1 min-w-0">
          {arcs.map((a, i) => {
            const pct = total > 0 ? (a.value / total) * 100 : 0;
            return (
              <motion.li
                key={a.label}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2 text-xs"
              >
                <span className="w-2.5 h-2.5 rounded-sm mt-1 shrink-0" style={{ background: a.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-700 truncate">{a.label}</span>
                    <span className="text-gray-400 text-[10px] tabular-nums">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="font-bold text-gray-900 tabular-nums">
                    <AnimatedCounter value={a.value} duration={1.0} />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
