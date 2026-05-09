/**
 * @file Fuzzy matching for desa names from Excel to database
 * Pure function — no side effects, no database calls
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a
 * @param {string} b
 * @returns {number}
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
 * Normalize desa name: strip prefixes, lowercase, trim
 * Handles: "Desa Setorejo", "Kel. Setorejo", "KELURAHAN SETOREJO", "  Setorejo  "
 * @param {string} name
 * @returns {string}
 */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/^(desa|kel\.?|kelurahan|kec\.?|kecamatan)\s+/i, '')
    .trim();
}

/**
 * Match an input desa name against a list of known desa from the database.
 * Matching priority: exact → normalized → Levenshtein (with length-relative threshold)
 *
 * @param {string} inputName — Name from Excel cell
 * @param {Array<{id: number, nama: string, nomor_urut: number}>} desaList — Desa from DB
 * @returns {{ matched: boolean, desa?: object, confidence?: number, suggestions?: string[] }}
 */
export function matchDesa(inputName, desaList) {
  if (!inputName || !inputName.trim()) {
    return { matched: false, suggestions: [] };
  }

  const norm = normalize(inputName);

  // 1. Exact match (case-insensitive)
  const exact = desaList.find(d => d.nama.toLowerCase() === norm);
  if (exact) return { matched: true, desa: exact, confidence: 1.0 };

  // 2. Normalized match (strip prefixes on both sides)
  const normMatch = desaList.find(d => normalize(d.nama) === norm);
  if (normMatch) return { matched: true, desa: normMatch, confidence: 0.9 };

  // 3. Levenshtein distance with length-relative threshold
  // Short names (≤4 chars): max distance 1 (prevents "Waru" → "Baru" false positive)
  // Longer names (>4 chars): max distance 2
  const maxDist = norm.length <= 4 ? 1 : 2;

  let bestMatch = null;
  let bestDist = Infinity;

  for (const d of desaList) {
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
      confidence: bestDist === 1 ? 0.7 : 0.5,
    };
  }

  // No match — return top 3 suggestions for user visibility
  const ranked = desaList
    .map(d => ({ desa: d, dist: levenshtein(normalize(d.nama), norm) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  return {
    matched: false,
    suggestions: ranked.map(r => r.desa.nama),
  };
}

// Export for testing
export { levenshtein, normalize };
