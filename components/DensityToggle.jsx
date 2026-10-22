'use client';

/**
 * @file Toggle kepadatan tabel: Nyaman / Ringkas.
 * Dipakai di toolbar halaman tabel data (desktop).
 */
import { motion } from 'framer-motion';
import { TableRow } from 'flowbite-react-icons/outline';

const MODES = [
  { id: 'comfortable', label: 'Nyaman', title: 'Tata letak nyaman (padding lega)' },
  { id: 'compact', label: 'Ringkas', title: 'Tata letak ringkas (lebih banyak baris terlihat)' },
];

export default function DensityToggle({ density, onChange }) {
  return (
    <div
      className="hidden md:inline-flex items-center rounded-xl glass-pill p-0.5"
      role="group"
      aria-label="Kepadatan tabel"
    >
      {MODES.map((mode) => {
        const isActive = density === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            aria-pressed={isActive}
            title={mode.title}
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'text-white font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="densityTogglePill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-primary-600 rounded-lg shadow-sm -z-10"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <TableRow className="w-3.5 h-3.5" /> {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
