'use client';

/**
 * @file Cache ringan untuk daftar dusun (`/api/dusun`).
 *
 * Daftar dusun jarang berubah (9 dusun statis). Banyak komponen fetch endpoint
 * ini saat mount, sehingga navigasi antar halaman memicu request berulang.
 * Cache module-level (shared lintas komponen) + in-flight dedupe mengurangi
 * beban DB saat banyak kader memakai aplikasi serentak.
 *
 * Pola sama dengan cache di lib/useYears.js.
 */

const CACHE_TTL_MS = 60_000;
let dusunCache = null;      // { data: array, ts: number }
let inFlight = null;        // Promise<array> — dedupe request paralel

/**
 * Ambil daftar dusun dengan cache. Mengembalikan array (kosong kalau gagal).
 * @param {boolean} [force] - bypass cache.
 * @returns {Promise<Array>}
 */
export async function getDusunCached(force = false) {
  if (!force && dusunCache && Date.now() - dusunCache.ts < CACHE_TTL_MS) {
    return dusunCache.data;
  }
  // Dedupe: kalau sudah ada request berjalan, pakai promise yang sama.
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/dusun');
      if (!res.ok) return dusunCache ? dusunCache.data : [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      dusunCache = { data: list, ts: Date.now() };
      return list;
    } catch {
      return dusunCache ? dusunCache.data : [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Invalidate cache (panggil setelah admin ubah daftar/status dusun). */
export function invalidateDusunCache() {
  dusunCache = null;
}
