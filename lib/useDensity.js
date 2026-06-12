'use client';

import { useEffect, useState } from 'react';

const KEY = 'table-density';
const EVENT = 'density-changed';

/**
 * Hook density tabel: 'comfortable' (default) atau 'compact'.
 * Disimpan di localStorage + sinkron antar komponen via custom event.
 *
 * @returns {{ density: 'comfortable'|'compact', setDensity: (d) => void, isCompact: boolean }}
 */
export function useDensity() {
  const [density, setDensityState] = useState('comfortable');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'compact' || saved === 'comfortable') setDensityState(saved);
    } catch { /* silent */ }

    const onChange = (e) => {
      const val = e.detail || (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
      if (val === 'compact' || val === 'comfortable') setDensityState(val);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setDensity = (d) => {
    const val = d === 'compact' ? 'compact' : 'comfortable';
    setDensityState(val);
    try { localStorage.setItem(KEY, val); } catch { /* silent */ }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: val }));
    }
  };

  return { density, setDensity, isCompact: density === 'compact' };
}
