'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

/** Decorative, non-geographic relief illustration for the Belikurip landing page. */
export default function MapWonogiri3D({ className = '' }) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-4, 4]), { stiffness: 140, damping: 24 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4, -4]), { stiffness: 140, damping: 24 });

  const handlePointerMove = (event) => {
    if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <figure data-reduced-motion={reduceMotion ? 'true' : 'false'} className={`relative mx-auto w-full max-w-[520px] select-none ${className}`}>
      <div className="relative aspect-[1.12/1] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 p-3 sm:p-5">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_48%_42%,rgba(255,255,255,.9),transparent_62%)]" />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12, rotateX: 7 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
          className="relative z-[1] flex h-full items-center justify-center"
          style={{ perspective: 900, transformStyle: 'preserve-3d', rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }}
        >
          <svg
            viewBox="0 0 520 420"
            className="h-full w-full overflow-visible drop-shadow-[0_22px_18px_rgba(6,95,70,0.2)]"
            role="img"
            aria-labelledby="relief-title"
            aria-describedby="relief-description"
          >
            <title id="relief-title">Ilustrasi relief hijau Desa Belikurip</title>
            <desc id="relief-description">Ilustrasi konsep tiga dimensi dengan hamparan hijau bertingkat untuk halaman Desa Belikurip. Bentuk dan penandanya dekoratif, bukan representasi lokasi atau batas administratif.</desc>
            <defs>
              <linearGradient id="terrainTop" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d1fae5" />
                <stop offset=".55" stopColor="#86efac" />
                <stop offset="1" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="terrainSide" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#16876a" />
                <stop offset="1" stopColor="#075a49" />
              </linearGradient>
              <linearGradient id="fieldTop" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#f0fdf4" />
                <stop offset="1" stopColor="#a7f3d0" />
              </linearGradient>
            </defs>
            {/* Stacked terrain planes create depth without implying cadastral boundaries. */}
            <path d="M74 142 239 72q18-8 37-1l133 49q23 9 28 31l22 96q5 20-15 31l-153 82q-20 11-43 2L96 306q-22-9-27-32l-15-99q-3-22 20-33Z" fill="url(#terrainSide)" transform="translate(0 27)" />
            <path d="M74 142 239 72q18-8 37-1l133 49q23 9 28 31l22 96q5 20-15 31l-153 82q-20 11-43 2L96 306q-22-9-27-32l-15-99q-3-22 20-33Z" fill="url(#terrainTop)" stroke="#ffffff" strokeOpacity=".8" strokeWidth="3" />
            <path d="M104 154 238 99l148 51 24 83-140 76-160-68Z" fill="#34d399" opacity=".32" />
            {/* Raised green fields: decorative shapes, not village polygons. */}
            <path d="m114 166 88-36 38 16-91 38Z" fill="url(#fieldTop)" stroke="#ffffff" strokeOpacity=".74" strokeWidth="2" />
            <path d="m258 118 102 36 10 34-105-38Z" fill="url(#fieldTop)" stroke="#ffffff" strokeOpacity=".74" strokeWidth="2" />
            <path d="m174 207 107-45 80 30-111 60Z" fill="#d1fae5" stroke="#ffffff" strokeOpacity=".8" strokeWidth="2" />
            <path d="m120 228 89-38 39 15-94 44Z" fill="#bbf7d0" stroke="#ffffff" strokeOpacity=".8" strokeWidth="2" />
            <path d="m298 269 93-51 5 20-92 51Z" fill="#a7f3d0" stroke="#ffffff" strokeOpacity=".8" strokeWidth="2" />
            <path d="m202 275 75-41 37 15-77 44Z" fill="#ecfdf5" stroke="#ffffff" strokeOpacity=".85" strokeWidth="2" />
            {/* Abstract village marker. */}
            <ellipse cx="267" cy="204" rx="25" ry="9" fill="#047857" opacity=".18" />
            <path d="m250 184 17-12 18 12v21h-35Z" fill="#fff7ed" stroke="#ffffff" strokeWidth="2" />
            <path d="m246 185 21-16 22 16-4 4-18-13-17 13Z" fill="#047857" />
            <rect x="264" y="190" width="8" height="15" rx="1" fill="#f59e0b" />
            <circle cx="268" cy="155" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="4" />
            <path d="M268 164v8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>
        <div aria-hidden="true" className="absolute bottom-4 left-1/2 h-5 w-2/3 -translate-x-1/2 rounded-full bg-emerald-900/10 blur-xl" />
      </div>
      <figcaption className="mt-3 text-center text-[11px] text-gray-500">
        Ilustrasi relief konsep · <span className="font-semibold text-primary-700">Desa Belikurip</span>
      </figcaption>
    </figure>
  );
}
