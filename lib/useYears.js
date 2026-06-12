'use client';

import { useEffect, useState } from 'react';

const YEARS_EVENT = 'years-updated';

// Cache module-level (shared lintas komponen) supaya navigasi antar halaman
// tidak refetch /api/years berulang. TTL pendek + bisa di-invalidate manual.
const CACHE_TTL_MS = 60_000;
let yearsCache = null; // { data: number[], ts: number }

/**
 * Client hook untuk ambil daftar tahun aktif dari server.
 * Dipakai di semua dropdown tahun supaya konsisten dengan daftar yang diatur admin.
 *
 * Auto refresh pada:
 * - mount komponen (pakai cache kalau masih fresh)
 * - event 'years-updated' dari panel admin (force refresh, bypass cache)
 * - window focus (pakai cache kalau masih fresh)
 *
 * @returns {{ years: number[], loading: boolean, refresh: () => Promise<void> }}
 */
export function useYears() {
  const [years, setYears] = useState(() => (yearsCache ? yearsCache.data : []));
  const [loading, setLoading] = useState(() => !yearsCache);

  const load = async (force = false) => {
    // Pakai cache kalau masih fresh dan tidak dipaksa refresh.
    if (!force && yearsCache && Date.now() - yearsCache.ts < CACHE_TTL_MS) {
      setYears(yearsCache.data);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/years', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data.map((r) => Number(r.tahun)).filter(Boolean) : [];
        const resolved = list.length > 0 ? list : fallbackYears();
        yearsCache = { data: resolved, ts: Date.now() };
        setYears(resolved);
      } else {
        setYears(fallbackYears());
      }
    } catch {
      setYears(fallbackYears());
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    const onUpdate = () => load(true); // admin update → bypass cache
    const onFocus = () => load();
    window.addEventListener(YEARS_EVENT, onUpdate);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(YEARS_EVENT, onUpdate);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { years, loading, refresh: () => load(true) };
}

/**
 * Panggil setelah admin menambah/mengaktifkan/menonaktifkan tahun supaya
 * semua hook useYears yang aktif di halaman langsung refresh tanpa reload.
 */
export function notifyYearsUpdated() {
  yearsCache = null; // invalidate cache
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(YEARS_EVENT));
  }
}

function fallbackYears() {
  const y = new Date().getFullYear();
  return [y + 1, y, y - 1, y - 2];
}
