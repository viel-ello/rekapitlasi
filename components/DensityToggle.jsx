'use client';

/**
 * @file Toggle kepadatan tabel: Nyaman / Ringkas.
 * Dipakai di toolbar halaman tabel data (desktop).
 */
import { TableRow } from 'flowbite-react-icons/outline';

export default function DensityToggle({ density, onChange }) {
  return (
    <div
      className="hidden md:inline-flex items-center rounded-xl glass-pill p-0.5"
      role="group"
      aria-label="Kepadatan tabel"
    >
      <button
        type="button"
        onClick={() => onChange('comfortable')}
        aria-pressed={density === 'comfortable'}
        title="Tata letak nyaman (padding lega)"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          density === 'comfortable' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <TableRow className="w-3.5 h-3.5" /> Nyaman
      </button>
      <button
        type="button"
        onClick={() => onChange('compact')}
        aria-pressed={density === 'compact'}
        title="Tata letak ringkas (lebih banyak baris terlihat)"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          density === 'compact' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <TableRow className="w-3.5 h-3.5" /> Ringkas
      </button>
    </div>
  );
}
