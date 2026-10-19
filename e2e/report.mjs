#!/usr/bin/env node
/**
 * @file Rangkum artefak JSON hasil run jadi e2e-artifacts/REVIEW.md.
 * Jalankan setelah `npx playwright test`:  node e2e/report.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const DIR = 'e2e-artifacts';

function read(name, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
  } catch {
    return fallback;
  }
}

/** Gabungkan shard per worker (lihat helpers.writeShard). */
function readShards(prefix) {
  try {
    return fs.readdirSync(path.join(DIR, 'shards'))
      .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, 'shards', f), 'utf8')));
  } catch {
    return [];
  }
}

const discovery = read('discovery.json', {});
const crawl = read('crawl.json');
const results = read('results.json');

// --- Gabungkan hasil responsif dari semua worker ---
// Test yang gagal dijalankan ulang (retries: 1), jadi shard bisa memuat entri
// ganda untuk kombinasi route+viewport yang sama. Ambil yang terakhir.
function dedupeBy(items, keyFn) {
  const m = new Map();
  for (const it of items) m.set(keyFn(it), it);
  return [...m.values()];
}

const respShards = readShards('responsive');
const respFindings = dedupeBy(
  respShards.flatMap((s) => s.findings || []),
  (f) => `${f.route}@${f.viewport}`
);
const responsive = respFindings.length === 0 ? null : {
  viewports: respShards[0]?.viewports || [],
  routesTested: [...new Set(respFindings.map((f) => f.route))],
  overflowFailures: respFindings.filter((f) => f.overflow?.hasOverflow),
  smallTapTargets: respFindings
    .filter((f) => (f.tapTargets || []).length > 0)
    .map((f) => ({ route: f.route, count: f.tapTargets.length, items: f.tapTargets })),
  all: respFindings,
};

// --- Gabungkan hasil a11y dari semua worker, kelompokkan per rule ---
const a11yShards = readShards('a11y');
const perRoute = dedupeBy(a11yShards.flatMap((s) => s.perRoute || []), (r) => r.route);
let a11y = null;
if (perRoute.length > 0) {
  const byRule = new Map();
  for (const r of perRoute) {
    for (const v of [...(r.blocking || []), ...(r.advisory || [])]) {
      const e = byRule.get(v.id) || {
        id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
        routes: [], totalNodes: 0, sampleNodes: v.nodes || [],
      };
      e.routes.push(r.route);
      e.totalNodes += v.nodeCount;
      byRule.set(v.id, e);
    }
  }
  a11y = {
    tags: a11yShards[0]?.tags || [],
    routesScanned: perRoute.length,
    blockingTotal: perRoute.reduce((n, r) => n + (r.blocking || []).length, 0),
    advisoryTotal: perRoute.reduce((n, r) => n + (r.advisory || []).length, 0),
    byRule: [...byRule.values()].sort((a, b) => b.totalNodes - a.totalNodes),
    perRoute,
  };
  fs.writeFileSync(path.join(DIR, 'a11y.json'), JSON.stringify(a11y, null, 2), 'utf8');
}
if (responsive) {
  fs.writeFileSync(path.join(DIR, 'responsive.json'), JSON.stringify(responsive, null, 2), 'utf8');
}

// Halaman yang berakhir di route lain (mis. /login saat sudah login diarahkan
// ke /dashboard) bukan bukti halaman itu sendiri kehilangan <h1>.
const noH1 = (crawl?.pages || []).filter(
  (p) => !p.navError && !p.hasH1 && !(p.redirectedTo && p.redirectedTo !== p.path)
);

const lines = [];
const P = (s = '') => lines.push(s);

P('# Review Website — Lumbung Data PKK');
P();
P(`- Target: \`${discovery.baseURL || '(tidak diketahui)'}\``);
P(`- Login sebagai: \`${discovery.loggedInAs || '-'}\``);
P(`- Dusun terdeteksi: ${discovery.dusunCount ?? '-'}`);
P();

// --- Ringkasan ---
P('## Ringkasan');
P();
P('| Metrik | Nilai |');
P('|---|---|');
if (results?.stats) {
  P(`| Test dijalankan | ${(results.stats.expected ?? 0) + (results.stats.unexpected ?? 0) + (results.stats.flaky ?? 0)} |`);
  P(`| Lulus | ${results.stats.expected ?? 0} |`);
  P(`| Gagal | ${results.stats.unexpected ?? 0} |`);
  P(`| Flaky | ${results.stats.flaky ?? 0} |`);
  P(`| Dilewati | ${results.stats.skipped ?? 0} |`);
}
if (crawl) {
  P(`| Halaman di-crawl | ${crawl.counts.visited} |`);
  P(`| Link internal rusak | ${crawl.counts.brokenInternal} |`);
  P(`| Link eksternal mati | ${crawl.counts.brokenExternal} |`);
  P(`| Halaman kosong | ${crawl.counts.blankPages} |`);
  P(`| Halaman tanpa h1 | ${noH1.length} |`);
  P(`| Error console | ${crawl.counts.consoleErrors} |`);
  P(`| Exception JS | ${crawl.counts.pageErrors} |`);
}
if (responsive) P(`| Kegagalan layout responsif | ${responsive.overflowFailures.length} |`);
if (a11y) {
  P(`| a11y serius/kritis | ${a11y.blockingTotal} |`);
  P(`| a11y sedang/ringan | ${a11y.advisoryTotal} |`);
}
P();

// --- Temuan ---
P('## Temuan');
P();
let n = 0;

if (crawl?.counts.brokenInternal > 0) {
  P(`### ${++n}. Halaman internal error (${crawl.counts.brokenInternal})`);
  P();
  for (const p of crawl.pages.filter((x) => x.navError || (x.status !== null && x.status >= 400))) {
    P(`- \`${p.path}\` — ${p.navError ? `gagal navigasi: ${p.navError}` : `HTTP ${p.status}`}`);
  }
  P();
}

const badLegacy = (crawl?.legacyRedirects || []).filter((l) => !l.ok);
if (badLegacy.length > 0) {
  P(`### ${++n}. Redirect legacy tidak sesuai (${badLegacy.length})`);
  P();
  for (const l of badLegacy) P(`- \`${l.from}\` seharusnya ke \`${l.expected}\`, hasil: \`${l.actual || l.error}\``);
  P();
}

if (crawl?.counts.brokenExternal > 0) {
  P(`### ${++n}. Link eksternal mati (${crawl.counts.brokenExternal})`);
  P();
  for (const r of crawl.externalResults.filter((x) => x.status === null || x.status >= 400)) {
    P(`- ${r.url} — ${r.status ?? r.error}`);
  }
  P();
}

if (crawl?.counts.blankPages > 0) {
  P(`### ${++n}. Halaman kosong (${crawl.counts.blankPages})`);
  P();
  for (const p of crawl.pages.filter((x) => x.isBlank)) P(`- \`${p.path}\` — hanya ${p.textLength} karakter teks`);
  P();
}

if (responsive?.overflowFailures.length > 0) {
  P(`### ${++n}. Overflow horizontal (${responsive.overflowFailures.length})`);
  P();
  for (const f of responsive.overflowFailures) {
    P(`- \`${f.route}\` @ **${f.viewport}** — konten ${f.overflow.docWidth}px > viewport ${f.overflow.viewWidth}px`);
    for (const o of f.overflow.offenders.slice(0, 3)) {
      P(`  - \`<${o.tag}>\` tepi kanan ${o.right}px — ${o.text || o.cls}`);
    }
    P(`  - Screenshot: \`${f.screenshot}\``);
  }
  P();
}

if (a11y?.byRule?.length > 0) {
  const blocking = a11y.byRule.filter((r) => r.impact === 'critical' || r.impact === 'serious');
  if (blocking.length > 0) {
    P(`### ${++n}. Aksesibilitas — serius/kritis (${blocking.length} rule)`);
    P();
    for (const r of blocking) {
      P(`- **${r.id}** (${r.impact}) — ${r.help}`);
      P(`  - ${r.totalNodes} elemen di ${new Set(r.routes).size} halaman`);
      P(`  - Halaman: ${[...new Set(r.routes)].map((x) => `\`${x}\``).join(', ')}`);
      for (const nd of (r.sampleNodes || []).slice(0, 2)) {
        P(`  - Contoh: \`${nd.target}\``);
      }
      P(`  - ${r.helpUrl}`);
    }
    P();
  }

  const advisory = a11y.byRule.filter((r) => r.impact !== 'critical' && r.impact !== 'serious');
  if (advisory.length > 0) {
    P(`### ${++n}. Aksesibilitas — sedang/ringan (${advisory.length} rule)`);
    P();
    for (const r of advisory) P(`- **${r.id}** (${r.impact}) — ${r.help} · ${r.totalNodes} elemen`);
    P();
  }
}

const smallTargets = responsive?.smallTapTargets || [];
if (smallTargets.length > 0) {
  P(`### ${++n}. Tap target di bawah 24x24px (mobile)`);
  P();
  for (const s of smallTargets) P(`- \`${s.route}\` — ${s.count} elemen`);
  P();
}

// Halaman yang berakhir di route lain (mis. /login saat sudah login diarahkan
// ke /dashboard) bukan bukti halaman itu sendiri kehilangan <h1>.
// `noH1` sudah dihitung di atas untuk tabel ringkasan.
if (noH1.length > 0) {
  P(`### ${++n}. Halaman tanpa <h1> (${noH1.length})`);
  P();
  P('Setiap halaman perlu tepat satu `<h1>` sebagai judul utama. Tanpa itu, pengguna screen reader kehilangan penanda struktur teratas.');
  P();
  for (const p of noH1) {
    P(`- \`${p.path}\` — judul dokumen: "${p.title || '(kosong)'}"`);
  }
  P();
}

if (n === 0) P('Tidak ada temuan.');
P();

// --- Yang TIDAK dicakup ---
P('## Yang tidak dicakup');
P();
P('- **Form tidak pernah di-submit.** Target adalah deployment produksi; submit akan menulis data asli ke Supabase. Form hanya dikatalogkan.');
P('- **Endpoint `/api/*` tidak dinavigasi.** Sebagian memicu download berat (export Excel/Word), sebagian sudah deprecated.');
P('- **Test login-gagal dilewati secara default.** `lib/rate-limit.js` memblokir IP 30 menit setelah 5 percobaan gagal.');
P('- **Hanya Chromium.** Firefox dan WebKit tidak dijalankan.');
if (crawl?.limits?.hitCap) {
  P(`- **Cakupan crawl PARSIAL.** Batas ${crawl.limits.maxPages} halaman tercapai; masih ada URL yang belum dikunjungi.`);
}
if ((crawl?.skipped || []).length > 0) {
  P(`- ${crawl.skipped.length} URL sengaja dilewati (lihat \`crawl.json\`).`);
}
P();
P('Report interaktif dengan trace: `npx playwright show-report e2e-artifacts/html-report`');
P();

fs.mkdirSync(DIR, { recursive: true });
const out = path.join(DIR, 'REVIEW.md');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Laporan ditulis: ${out}`);
