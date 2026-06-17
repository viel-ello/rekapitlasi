/**
 * @file Server-side module-level cache untuk daftar dusun aktif.
 *
 * Daftar dusun jarang berubah (9 dusun statis). Cache ini mengurangi hit ke
 * Supabase saat banyak request datang ke `/api/dusun` (mis. banyak kader login
 * bersamaan, cold page loads). TTL pendek + in-flight dedupe.
 *
 * Catatan: di serverless (Vercel) cache hidup per-instance, jadi efektif untuk
 * burst dalam satu instance. Tetap auth-gated di route handler.
 */

const { supabase } = require('../supabase');

const TTL_MS = 60_000;
let cache = null;     // { data, ts }
let inFlight = null;

async function fetchFromDb() {
  const { data, error } = await supabase
    .from('dusun')
    .select('id, nama, nomor_urut, is_active')
    .eq('is_active', 1)
    .order('nomor_urut', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Ambil daftar dusun aktif (cached). Throw kalau DB error & belum ada cache.
 * @param {boolean} [force] - bypass cache.
 */
async function getActiveDusun(force = false) {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) {
    return cache.data;
  }
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const data = await fetchFromDb();
      cache = { data, ts: Date.now() };
      return data;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Invalidate cache (panggil setelah admin create/update/nonaktif dusun). */
function invalidateDusunServerCache() {
  cache = null;
}

module.exports = { getActiveDusun, invalidateDusunServerCache, DUSUN_CACHE_TTL_MS: TTL_MS };
