'use client';

/**
 * @file Skeleton loader untuk halaman tabel data.
 * Menghindari blank screen / layout shift saat fetch awal.
 */

export default function TableSkeleton({ rows = 9, cols = 6 }) {
  return (
    // role="status" wajib: `aria-label`/`aria-busy` terlarang pada <div> generik
    // tanpa role (axe: aria-prohibited-attr), sehingga labelnya diabaikan
    // screen reader. role="status" juga mengumumkan state loading.
    <div className="animate-in fade-in" role="status" aria-busy="true" aria-label="Memuat data">
      {/* Toolbar skeleton.
          `flex-wrap` + `min-w-0` mencegah overflow horizontal di layar sempit:
          tanpa itu lebar tetap (w-64 + w-24 + w-20 + gap) memaksa dokumen jadi
          468px pada viewport 390px. `max-w-full` membuat bar ikut menyusut. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="skeleton h-6 w-48 max-w-full rounded-lg" />
          <div className="skeleton h-3 w-64 max-w-full rounded" />
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-20 rounded-xl" />
        </div>
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="skeleton h-9 w-full rounded-lg mb-2" />
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-2 mb-2">
            <div className="skeleton h-8 w-10 rounded flex-shrink-0" />
            <div className="skeleton h-8 w-32 rounded flex-shrink-0" />
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="skeleton h-8 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>

      {/* Mobile card skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: Math.min(rows, 5) }).map((_, r) => (
          <div key={r} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="skeleton h-5 w-40 rounded mb-2" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
