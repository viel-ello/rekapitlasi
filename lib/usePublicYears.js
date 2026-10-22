'use client';
import { useEffect, useState } from 'react';
export function usePublicYears() {
  const [years, setYears] = useState([]);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetch('/api/public/years', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Daftar tahun belum dapat dimuat.');
        const rows = await response.json();
        if (!controller.signal.aborted) setYears(rows.map((row) => Number(row.tahun)).filter(Number.isInteger));
      }).catch(() => { if (!controller.signal.aborted) setError('Daftar tahun belum dapat dimuat.'); });
    return () => controller.abort();
  }, [attempt]);
  return { years, error, retry: () => setAttempt((value) => value + 1) };
}
