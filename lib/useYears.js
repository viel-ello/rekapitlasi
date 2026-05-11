'use client';

import { useEffect, useState } from 'react';

const YEARS_EVENT = 'years-updated';

/**
 * Client hook untuk ambil daftar tahun aktif dari server.
 * Dipakai di semua dropdown tahun supaya konsisten dengan daftar yang diatur admin.
 *
 * Auto refresh pada:
 * - mount komponen
 * - event 'years-updated' dari panel admin
 * - window focus (user pindah tab lalu kembali)
 *
 * @returns {{ years: number[], loading: boolean, refresh: () => Promise<void> }}
 */
export function useYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/years', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data.map((r) => Number(r.tahun)).filter(Boolean) : [];
        setYears(list.length > 0 ? list : fallbackYears());
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

    const onUpdate = () => load();
    const onFocus = () => load();
    window.addEventListener(YEARS_EVENT, onUpdate);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(YEARS_EVENT, onUpdate);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { years, loading, refresh: load };
}

/**
 * Panggil setelah admin menambah/mengaktifkan/menonaktifkan tahun supaya
 * semua hook useYears yang aktif di halaman langsung refresh tanpa reload.
 */
export function notifyYearsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(YEARS_EVENT));
  }
}

function fallbackYears() {
  const y = new Date().getFullYear();
  return [y + 1, y, y - 1, y - 2];
}
