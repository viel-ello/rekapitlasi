'use client';

import { useEffect, useState } from 'react';

/**
 * Client hook untuk ambil daftar tahun aktif dari server.
 * Dipakai di semua dropdown tahun supaya konsisten dengan daftar yang diatur admin.
 *
 * @returns {{ years: number[], loading: boolean, refresh: () => Promise<void> }}
 */
export function useYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/years');
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
  }, []);

  return { years, loading, refresh: load };
}

function fallbackYears() {
  const y = new Date().getFullYear();
  return [y + 1, y, y - 1, y - 2];
}
