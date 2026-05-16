'use client';

/**
 * @file OnboardingTour — overlay ringan tanpa library eksternal.
 *
 * Pemakaian:
 *   import OnboardingTour from '@/components/OnboardingTour';
 *   <OnboardingTour />   // letak di dashboard layout, otomatis cek localStorage.
 *
 * Tour terbuka kalau localStorage 'onboarding-completed' belum di-set.
 * Step menargetkan element via querySelector pada `target`.
 * Kalau target tidak ditemukan, step di-render sebagai modal tengah.
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Close } from 'flowbite-react-icons/outline';

const STORAGE_KEY = 'onboarding-completed';

const STEPS = [
  {
    target: null,
    title: 'Selamat datang di Sistem Rekapitulasi PKK',
    body: 'Tour singkat akan memandu Anda mengenali fitur utama. Bisa di-skip kapan saja.',
  },
  {
    target: '.sidebar',
    title: 'Menu utama',
    body: 'Akses Dashboard, Data Umum, Pokja I-IV, Kegiatan Warga, Bumil, dan Report Builder dari sidebar ini.',
    placement: 'right',
  },
  {
    target: '[aria-label="Pilih tahun dashboard"]',
    title: 'Filter tahun',
    body: 'Ubah tahun untuk melihat data periode tertentu. Filter ini juga ada di tiap halaman data.',
    placement: 'bottom',
  },
  {
    target: 'table',
    title: 'Matrix kelengkapan',
    body: 'Pantau status pengisian per desa. Klik baris desa untuk masuk ke detail drill-down.',
    placement: 'top',
  },
  {
    target: '[aria-label="Buka PKK Assistant"]',
    title: 'AI Assistant',
    body: 'Klik bubble di pojok kanan bawah untuk tanya statistik atau import data Excel.',
    placement: 'left',
  },
  {
    target: '[aria-label="Menu profil"]',
    title: 'Profil & tema',
    body: 'Ganti password, lihat aktivitas Anda, atau aktifkan tema gelap dari menu ini.',
    placement: 'bottom',
  },
];

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  // Cek localStorage di mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = window.localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Delay sedikit supaya UI selesai render
      const t = setTimeout(() => setActive(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = useCallback((skipped = false) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, skipped ? 'skipped' : 'done');
    }
    setActive(false);
  }, []);

  // Hitung posisi target setiap step berubah + scroll into view
  useEffect(() => {
    if (!active) return;
    const target = STEPS[step]?.target;
    if (!target) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      // Auto scroll kalau target di luar viewport
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    // Re-measure setelah scroll selesai
    const t = setTimeout(update, 400);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, step]);

  // Keyboard nav
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { finish(true); }
      if (e.key === 'ArrowRight') { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
      if (e.key === 'ArrowLeft') { setStep((s) => Math.max(0, s - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active) return null;

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const tooltipPos = computeTooltipPosition(rect, cur?.placement || 'bottom');

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {/* Backdrop with cutout */}
        {rect ? (
          <svg className="absolute inset-0 w-full h-full pointer-events-auto" aria-hidden="true">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="#fff" />
                <rect
                  x={Math.max(0, rect.left - 8)}
                  y={Math.max(0, rect.top - 8)}
                  width={rect.width + 16}
                  height={rect.height + 16}
                  rx="12"
                  fill="#000"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(15,23,42,0.55)" mask="url(#tour-mask)" />
            <rect
              x={Math.max(0, rect.left - 8)}
              y={Math.max(0, rect.top - 8)}
              width={rect.width + 16}
              height={rect.height + 16}
              rx="12"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 bg-gray-900/55 pointer-events-auto" />
        )}

        {/* Tooltip / center modal */}
        <motion.div
          key={`tour-step-${step}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5 max-w-sm w-[calc(100%-2rem)] pointer-events-auto"
          style={tooltipPos}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                Langkah {step + 1} dari {STEPS.length}
              </div>
              <h3 id="tour-title" className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {cur.title}
              </h3>
            </div>
            <button
              onClick={() => finish(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Tutup tour"
            >
              <Close className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{cur.body}</p>

          <div className="flex items-center justify-between mt-4 gap-3">
            <button
              onClick={() => finish(true)}
              className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              Jangan tampilkan lagi
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg"
                >
                  <ArrowLeft className="w-3 h-3" /> Sebelumnya
                </button>
              )}
              {!isLast ? (
                <button
                  onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg"
                >
                  Selanjutnya <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => finish(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1 mt-3">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`block h-1 rounded-full transition-all ${i === step ? 'w-6 bg-primary-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hitung posisi tooltip relatif ke target rect.
 * Kalau target null, render di tengah viewport.
 * Auto-flip ke center kalau tooltip tidak muat di sisi yang diminta.
 */
function computeTooltipPosition(rect, placement) {
  if (typeof window === 'undefined') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  // Estimasi ukuran tooltip card (max-w-sm = ~384px, height ~220px)
  const tw = Math.min(360, vw - 32);
  const th = 220;
  const margin = 16;

  // Coba placement yang diminta dulu
  const tryPlacement = (p) => {
    let top, left;
    if (p === 'top') {
      top = rect.top - th - margin;
      left = rect.left + rect.width / 2 - tw / 2;
    } else if (p === 'bottom') {
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - tw / 2;
    } else if (p === 'left') {
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.left - tw - margin;
    } else if (p === 'right') {
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.left + rect.width + margin;
    }
    const fits = top >= margin && top + th <= vh - margin && left >= margin && left + tw <= vw - margin;
    return { top, left, fits };
  };

  // Try requested, then alternates
  const candidates = [placement || 'bottom', 'bottom', 'top', 'right', 'left'];
  for (const p of candidates) {
    const r = tryPlacement(p);
    if (r.fits) {
      return { top: `${r.top}px`, left: `${r.left}px`, transform: 'none' };
    }
  }

  // Tidak ada yang muat — fallback ke center viewport
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}
