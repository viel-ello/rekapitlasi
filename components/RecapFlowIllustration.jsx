'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { DUSUN_LIST as DUSUN } from '@/lib/dusunNames';

const FLOW_EASE = [0.22, 1, 0.36, 1];

/** Ilustrasi alur agregasi PKK, bukan peta atau gambaran batas wilayah. */
export default function RecapFlowIllustration() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = useReducedMotion();
  const showFinalState = isInView || reduceMotion;

  return (
    <figure ref={ref} className="recap-flow mx-auto w-full max-w-[620px]" aria-labelledby="recap-flow-caption">
      <div className="relative aspect-[1.55/1] min-h-[250px] w-full overflow-hidden rounded-[1.4rem] bg-[radial-gradient(ellipse_at_52%_40%,rgba(209,250,229,.72),transparent_68%),linear-gradient(145deg,#fbfdfb,#eef8f1)] p-2 sm:p-3">
        <svg
          className="recap-flow-desktop h-full w-full"
          viewBox="0 0 720 460"
          role="img"
          aria-labelledby="recap-flow-title recap-flow-description"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="recap-flow-title">Alur rekap data PKK Desa Belikurip</title>
          <desc id="recap-flow-description">
            Sembilan dusun, yaitu {DUSUN.join(', ')}, menyumbangkan data untuk direkapitulasi menjadi laporan PKK.
          </desc>
          <defs>
            <linearGradient id="flowLine" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#6ee7b7" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="recapCard" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#ecfdf5" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#14532d" floodOpacity=".10" />
            </filter>
          </defs>

          {/* Alur data masuk dari sembilan dusun ke satu rekap, lalu menjadi laporan. */}
          <g fill="none" stroke="url(#flowLine)" strokeLinecap="round" strokeWidth="2.2" opacity=".72">
            {DUSUN.map((name, index) => {
              const col = index % 3;
              const row = Math.floor(index / 3);
              const startX = 20 + col * 91 + 78;
              const startY = 91 + row * 104 + 27;
              const endY = 190 + row * 39;
              return (
                <motion.path
                  key={`path-${name}`}
                  d={`M ${startX} ${startY} C 280 ${startY}, 250 ${endY}, 294 ${endY}`}
                  initial={reduceMotion ? false : { pathLength: 0, opacity: 0.18 }}
                  animate={showFinalState ? { pathLength: 1, opacity: 0.72 } : { pathLength: 0, opacity: 0.18 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 1.4, delay: 0.18 + index * 0.025, ease: FLOW_EASE }}
                />
              );
            })}
            <motion.path
              d="M 470 230 C 505 230 500 230 535 230"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0.18 }}
              animate={showFinalState ? { pathLength: 1, opacity: 0.9 } : { pathLength: 0, opacity: 0.18 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.2, delay: 0.45, ease: FLOW_EASE }}
            />
          </g>

          <text x="20" y="43" className="recap-flow-kicker">SUMBER DATA · 9 DUSUN</text>
          {DUSUN.map((name, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = 20 + col * 91;
            const y = 91 + row * 104;
            return (
              <motion.g
                key={name}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={showFinalState ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: index * 0.06, ease: FLOW_EASE }}
                filter="url(#softShadow)"
              >
                <rect x={x} y={y} width="82" height="54" rx="15" fill="#ffffff" stroke="#d7ebe0" />
                <circle cx={x + 15} cy={y + 27} r="5" fill="#059669" />
                {name.startsWith('Jamprit ') ? (
                  <text x={x + 41} textAnchor="middle" className="recap-flow-label">
                    <tspan x={x + 41} y={y + 24}>Jamprit</tspan>
                    <tspan x={x + 41} y={y + 39}>{name.slice('Jamprit '.length)}</tspan>
                  </text>
                ) : (
                  <text x={x + 27} y={y + 30} className="recap-flow-label">{name}</text>
                )}
              </motion.g>
            );
          })}

          <motion.g
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={showFinalState ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.28, ease: FLOW_EASE }}
            filter="url(#softShadow)"
          >
            <rect x="294" y="132" width="176" height="196" rx="24" fill="url(#recapCard)" stroke="#b8dfca" strokeWidth="1.5" />
            <rect x="314" y="153" width="38" height="38" rx="12" fill="#d1fae5" />
            <path d="M325 172h16m-13-6 13 6-13 6" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="314" y="216" className="recap-flow-title">Rekap PKK</text>
            <text x="314" y="237" className="recap-flow-subtitle">Data antar dusun</text>
            <rect x="314" y="253" width="136" height="9" rx="4.5" fill="#dcefe3" />
            <rect x="314" y="253" width="98" height="9" rx="4.5" fill="#34d399" />
            <rect x="314" y="274" width="136" height="9" rx="4.5" fill="#dcefe3" />
            <rect x="314" y="274" width="116" height="9" rx="4.5" fill="#6ee7b7" />
            <text x="314" y="309" className="recap-flow-tiny">Ringkasan · Kelengkapan · Periode</text>
          </motion.g>

          <motion.g
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={showFinalState ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.55, ease: FLOW_EASE }}
            filter="url(#softShadow)"
          >
            <rect x="535" y="163" width="164" height="136" rx="22" fill="#ffffff" stroke="#cde5d6" strokeWidth="1.5" />
            <rect x="553" y="181" width="36" height="42" rx="8" fill="#ecfdf5" stroke="#86c6a1" />
            <path d="M561 192h19m-19 7h19m-19 7h12" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
            <text x="553" y="246" className="recap-flow-title">Laporan</text>
            <text x="553" y="266" className="recap-flow-subtitle">PKK Belikurip</text>
            <circle cx="673" cy="191" r="12" fill="#d1fae5" />
            <path d="m668 191 3.5 3.5 6.5-7" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>

          <text x="20" y="430" className="recap-flow-footer">Satu alur pencatatan untuk kegiatan dan indikator PKK</text>
        </svg>
        <div className="recap-flow-mobile" aria-hidden="true">
          <p className="text-[11px] font-bold tracking-[.12em] text-emerald-800">SUMBER DATA · 9 DUSUN</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DUSUN.map((name, index) => (
              <motion.span
                key={`mobile-${name}`}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={showFinalState ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: index * 0.06, ease: FLOW_EASE }}
                className="flex min-h-9 items-center justify-center rounded-xl border border-emerald-100 bg-white px-1.5 text-center text-[10px] font-semibold leading-tight text-emerald-950 shadow-sm"
              >
                {name}
              </motion.span>
            ))}
          </div>
          <div className="recap-flow-mobile-arrow" aria-hidden="true">↓</div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={showFinalState ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.35, ease: FLOW_EASE }}
            className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm"
          >
            <strong className="block text-sm text-emerald-950">Rekap data PKK</strong>
            <span className="text-xs text-emerald-800">Ringkasan · Kelengkapan · Periode</span>
          </motion.div>
          <div className="recap-flow-mobile-arrow" aria-hidden="true">↓</div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={showFinalState ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.55, ease: FLOW_EASE }}
            className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3"
          >
            <strong className="block text-sm text-emerald-950">Laporan PKK Belikurip</strong>
            <span className="text-xs text-emerald-800">Satu alur pencatatan antar dusun</span>
          </motion.div>
        </div>
      </div>
      <figcaption id="recap-flow-caption" className="sr-only">Alur pengumpulan data dari sembilan dusun menjadi rekap dan laporan PKK.</figcaption>
    </figure>
  );
}
