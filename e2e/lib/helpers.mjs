/**
 * @file Helper bersama untuk suite review E2E.
 * Semua fungsi di sini read-only terhadap aplikasi: hanya observasi, tidak menulis data.
 */

import fs from 'node:fs';
import path from 'node:path';

export const ARTIFACT_DIR = 'e2e-artifacts';

/**
 * Pasang kolektor error di page. Kembalikan objek yang terus terisi selama page hidup.
 * Panggil SEBELUM navigasi pertama, kalau tidak event awal terlewat.
 *
 * @param {import('@playwright/test').Page} page
 */
export function collectErrors(page) {
  const bucket = {
    console: [],   // pesan console.error
    pageErrors: [], // exception JS yang tidak tertangkap
    badResponses: [], // HTTP >= 400
    failedRequests: [], // gagal di level jaringan
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      bucket.console.push({ text: msg.text(), url: page.url() });
    }
  });

  page.on('pageerror', (err) => {
    bucket.pageErrors.push({ text: String(err), url: page.url() });
  });

  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400) {
      bucket.badResponses.push({ status, url: res.url(), page: page.url() });
    }
  });

  page.on('requestfailed', (req) => {
    // net::ERR_ABORTED normal saat navigasi dibatalkan; bukan bug aplikasi.
    const failure = req.failure()?.errorText || 'unknown';
    if (failure.includes('ERR_ABORTED')) return;
    bucket.failedRequests.push({ url: req.url(), error: failure, page: page.url() });
  });

  return bucket;
}

/**
 * Cek overflow horizontal dan elemen yang keluar viewport.
 * Ini penyebab paling umum layout rusak di mobile.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function checkOverflow(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewWidth = window.innerWidth;
    // Toleransi 2px untuk pembulatan sub-pixel.
    const hasOverflow = docWidth > viewWidth + 2;

    const offenders = [];
    if (hasOverflow) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > viewWidth + 2) {
          const cs = getComputedStyle(el);
          // Elemen yang sengaja di-scroll bukan bug.
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
          if (cs.position === 'fixed' && cs.visibility === 'hidden') continue;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 120),
            right: Math.round(r.right),
            text: (el.textContent || '').trim().slice(0, 60),
          });
          if (offenders.length >= 8) break;
        }
      }
    }

    return { hasOverflow, docWidth, viewWidth, offenders };
  });
}

/**
 * Cari tap target di bawah ukuran minimum (WCAG 2.2 SC 2.5.8 = 24x24 CSS px).
 * Hanya bermakna pada viewport mobile.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function checkTapTargets(page, min = 24) {
  return page.evaluate((minSize) => {
    const results = [];
    const selector = 'a[href], button, input, select, textarea, [role="button"], [role="link"]';
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // tersembunyi
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.width < minSize || r.height < minSize) {
        results.push({
          tag: el.tagName.toLowerCase(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 50),
        });
      }
      if (results.length >= 15) break;
    }
    return results;
  }, min);
}

/**
 * Deteksi halaman kosong: sudah selesai load tapi praktis tidak ada konten.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function checkBlankPage(page) {
  return page.evaluate(() => {
    const text = (document.body?.innerText || '').trim();
    return {
      textLength: text.length,
      isBlank: text.length < 30,
      hasH1: !!document.querySelector('h1'),
      title: document.title,
      sample: text.slice(0, 80),
    };
  });
}

/** Ambil semua href same-origin dari halaman saat ini. */
export async function extractLinks(page, origin) {
  return page.evaluate((baseOrigin) => {
    const out = { internal: [], external: [] };
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (!href) continue;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      let url;
      try {
        url = new URL(href, location.href);
      } catch { continue; }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      if (url.origin === baseOrigin) {
        out.internal.push(url.pathname + url.search);
      } else {
        out.external.push(url.href);
      }
    }
    out.internal = [...new Set(out.internal)];
    out.external = [...new Set(out.external)];
    return out;
  }, origin);
}

/**
 * Katalog form tanpa men-submit-nya.
 * Aplikasi ini menunjuk produksi — submit berarti menulis data asli.
 */
export async function catalogForms(page) {
  return page.evaluate(() => {
    const forms = [];
    for (const f of document.querySelectorAll('form')) {
      forms.push({
        action: f.getAttribute('action') || '(handler js)',
        method: (f.getAttribute('method') || 'get').toLowerCase(),
        fields: [...f.querySelectorAll('input, select, textarea')]
          .map((el) => el.getAttribute('name') || el.id || el.getAttribute('type') || '?')
          .slice(0, 20),
      });
    }
    return forms;
  });
}

/** Normalisasi URL supaya halaman sama tidak dikunjungi dua kali. */
export function normalizePath(p) {
  try {
    const u = new URL(p, 'http://x');
    const params = [...u.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    const qs = params.map(([k, v]) => `${k}=${v}`).join('&');
    let pathname = u.pathname.replace(/\/+$/, '') || '/';
    return qs ? `${pathname}?${qs}` : pathname;
  } catch {
    return p;
  }
}

/** Tulis JSON ke e2e-artifacts/, buat direktori kalau belum ada. */
export function writeArtifact(name, data) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const file = path.join(ARTIFACT_DIR, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

/**
 * Tulis satu shard per worker.
 *
 * Playwright menjalankan beberapa worker sebagai proses terpisah, masing-masing
 * dengan salinan array in-memory sendiri. Kalau setiap worker menulis ke nama
 * file yang sama saat teardown, worker terakhir menimpa semuanya dan laporan
 * hanya memuat sebagian hasil. Tiap worker karena itu menulis shard unik,
 * lalu report.mjs menggabungkannya.
 */
export function writeShard(prefix, data) {
  const dir = path.join(ARTIFACT_DIR, 'shards');
  fs.mkdirSync(dir, { recursive: true });
  const id = `${process.pid}-${process.env.TEST_WORKER_INDEX ?? '0'}`;
  const file = path.join(dir, `${prefix}-${id}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

/** Baca dan gabungkan semua shard dengan prefix tertentu. */
export function readShards(prefix) {
  const dir = path.join(ARTIFACT_DIR, 'shards');
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  } catch {
    return [];
  }
}

/** Baca JSON dari e2e-artifacts/, kembalikan fallback kalau tidak ada. */
export function readArtifact(name, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, name), 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Tunggu halaman benar-benar tenang. `networkidle` sendiri tidak cukup untuk
 * aplikasi ini: Topbar melakukan polling notifikasi tiap 60 detik, jadi jaringan
 * tidak pernah benar-benar idle di dalam dashboard.
 */
export async function settle(page, ms = 1200) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  } catch { /* sudah lewat */ }
  await page.waitForTimeout(ms);
}
