/**
 * @file Fuzzy matching untuk nama dusun (sebelumnya: desa) dari Excel ke database.
 * Pure function — no side effects, no DB calls.
 *
 * Backward-compat: nama file dipertahankan (`matchDesa.js`) supaya import lama
 * tidak break. Export `matchDusun` sebagai canonical alias.
 */

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Normalize unit name: strip prefixes (desa/kel./dusun/lingk.), lowercase, trim.
 */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/^(desa|kel\.?|kelurahan|kec\.?|kecamatan|dusun|lingk\.?|lingkungan)\s+/i, '')
    .trim();
}

/**
 * Match input name terhadap daftar unit (dusun saat ini, dulu desa).
 * Strategy: exact → normalized → Levenshtein (threshold relatif panjang).
 *
 * @param {string} inputName
 * @param {Array<{id: number, nama: string, nomor_urut: number}>} unitList
 * @returns {{ matched: boolean, desa?: object, dusun?: object, confidence?: number, suggestions?: string[] }}
 */
export function matchDusun(inputName, unitList) {
  if (!inputName || !inputName.trim()) {
    return { matched: false, suggestions: [] };
  }

  const norm = normalize(inputName);

  const exact = unitList.find((d) => d.nama.toLowerCase() === norm);
  if (exact) return { matched: true, desa: exact, dusun: exact, confidence: 1.0 };

  const normMatch = unitList.find((d) => normalize(d.nama) === norm);
  if (normMatch) return { matched: true, desa: normMatch, dusun: normMatch, confidence: 0.9 };

  const maxDist = norm.length <= 4 ? 1 : 2;

  let bestMatch = null;
  let bestDist = Infinity;

  for (const d of unitList) {
    const dist = levenshtein(normalize(d.nama), norm);
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      bestMatch = d;
    }
  }

  if (bestMatch) {
    return {
      matched: true,
      desa: bestMatch,
      dusun: bestMatch,
      confidence: bestDist === 1 ? 0.7 : 0.5,
    };
  }

  const ranked = unitList
    .map((d) => ({ desa: d, dist: levenshtein(normalize(d.nama), norm) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  return {
    matched: false,
    suggestions: ranked.map((r) => r.desa.nama),
  };
}

/** Backward-compat alias: caller lama yang panggil matchDesa() tetap valid. */
export const matchDesa = matchDusun;

export { levenshtein, normalize };
