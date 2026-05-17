'use client';

import { ClipboardList, FileLines } from 'flowbite-react-icons/outline';

/**
 * Toggle Excel ↔ Word di header tabel edit.
 *
 * Props:
 *   - mode: 'excel' | 'word'
 *   - onChange: (next) => void
 */
export default function EditModeSwitcher({ mode, onChange }) {
  const items = [
    { value: 'excel', label: 'Excel', icon: ClipboardList },
    { value: 'word', label: 'Word', icon: FileLines },
  ];

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm">
      {items.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            aria-pressed={active}
            title={`Mode ${label}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
