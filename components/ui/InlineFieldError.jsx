'use client';

import React from 'react';
import { ExclamationCircle, InfoCircle } from 'flowbite-react-icons/outline';
import { cn } from '@/lib/utils';

/**
 * InlineFieldError — Validasi kontekstual per-field dan info helper (Typeform style).
 * Menghilangkan kebergantungan pada toast global saja.
 *
 * Props:
 *   - error?: string
 *   - warning?: string
 *   - hint?: string
 *   - unit?: string
 *   - className?: string
 */
export default function InlineFieldError({
  error,
  warning,
  hint,
  unit,
  className = '',
}) {
  if (!error && !warning && !hint && !unit) return null;

  return (
    <div className={cn('flex flex-col gap-0.5 mt-1 text-xs', className)}>
      {error && (
        <span
          className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium animate-in fade-in slide-in-from-top-1"
          role="alert"
        >
          <ExclamationCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </span>
      )}

      {!error && warning && (
        <span
          className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium animate-in fade-in slide-in-from-top-1"
          role="status"
        >
          <ExclamationCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
          <span>{warning}</span>
        </span>
      )}

      {!error && !warning && hint && (
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[11px]">
          <InfoCircle className="w-3 h-3 flex-shrink-0 text-gray-400" />
          <span>{hint}</span>
        </span>
      )}

      {unit && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          Satuan: {unit}
        </span>
      )}
    </div>
  );
}
