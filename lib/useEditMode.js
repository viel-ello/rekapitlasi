'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const STORAGE_KEY = 'pkk_edit_mode_default';

/**
 * Hook untuk mode edit data ('excel' | 'word').
 *
 * Resolusi:
 *   1. Query string ?mode=excel atau ?mode=word (priority tertinggi)
 *   2. localStorage 'pkk_edit_mode_default'
 *   3. Default 'excel'
 *
 * Setiap perubahan mode di-persist ke localStorage + dirimkan ke URL.
 *
 * Return: { mode, setMode, isExcel, isWord }
 */
export function useEditMode() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = (() => {
    const fromQuery = searchParams.get('mode');
    if (fromQuery === 'excel' || fromQuery === 'word') return fromQuery;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'excel' || saved === 'word') return saved;
    }
    return 'excel';
  })();

  const [mode, setModeState] = useState(initial);

  useEffect(() => {
    const fromQuery = searchParams.get('mode');
    if (fromQuery === 'excel' || fromQuery === 'word') {
      if (fromQuery !== mode) setModeState(fromQuery);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMode = (next) => {
    if (next !== 'excel' && next !== 'word') return;
    setModeState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    // Update URL without scroll/refresh
    const params = new URLSearchParams(searchParams);
    params.set('mode', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return { mode, setMode, isExcel: mode === 'excel', isWord: mode === 'word' };
}
