/**
 * @file Crawl seluruh situs — link mati, halaman kosong, error console.
 *
 * KEBIJAKAN READ-ONLY: crawler hanya melakukan navigasi GET. Tidak pernah
 * mengklik tombol atau men-submit form, karena target adalah deployment
 * produksi dan submit berarti menulis data asli ke Supabase. Form yang
 * ditemukan dicatat, tidak dijalankan.
 */

import { test, expect } from '@playwright/test';
import {
  ARTIFACT_DIR, collectErrors, extractLinks, catalogForms, checkBlankPage,
  normalizePath, settle, writeArtifact, readArtifact,
} from '../lib/helpers.mjs';
import { LEGACY_REDIRECTS } from '../lib/routes.mjs';

test.use({ storageState: `${ARTIFACT_DIR}/storage-state.json` });

const MAX_PAGES = Number(process.env.E2E_CRAWL_MAX_PAGES || 60);
const MAX_DEPTH = Number(process.env.E2E_CRAWL_MAX_DEPTH || 4);

/** Path yang tidak boleh dinavigasi. */
function shouldSkip(pathname) {
  // Route handler: sebagian memicu download berat (export excel/word),
  // sebagian deprecated (410). Tidak relevan untuk review UI.
  if (pathname.startsWith('/api/')) return 'endpoint API';
  // Logout akan membuang sesi dan merusak sisa crawl.
  if (/logout|keluar/i.test(pathname)) return 'aksi logout';
  return null;
}

test('crawl situs: kumpulkan link mati, halaman kosong, dan error console', async ({ page, baseURL }) => {
  test.setTimeout(10 * 60 * 1000);

  const origin = new URL(baseURL).origin;
  const errors = collectErrors(page);

  const visited = new Map();     // path -> hasil
  const skipped = [];            // path yang sengaja tidak dinavigasi
  const externalLinks = new Set();
  const queue = [{ path: '/', depth: 0 }, { path: '/dashboard', depth: 0 }, { path: '/publik', depth: 0 }];
  const seen = new Set(queue.map((q) => q.path));

  let hitCap = false;

  while (queue.length > 0) {
    if (visited.size >= MAX_PAGES) { hitCap = true; break; }

    const { path: current, depth } = queue.shift();
    const reason = shouldSkip(current);
    if (reason) { skipped.push({ path: current, reason }); continue; }

    let status = null;
    let redirectedTo = null;
    let navError = null;

    try {
      const res = await page.goto(current, { waitUntil: 'domcontentloaded' });
      status = res?.status() ?? null;
      await settle(page);
      const landed = normalizePath(new URL(page.url()).pathname + new URL(page.url()).search);
      if (landed !== current) redirectedTo = landed;
    } catch (e) {
      navError = String(e).split('\n')[0];
    }

    if (navError) {
      visited.set(current, { path: current, depth, navError });
      continue;
    }

    const content = await checkBlankPage(page);
    const forms = await catalogForms(page);
    const links = await extractLinks(page, origin);

    links.external.forEach((u) => externalLinks.add(u));

    visited.set(current, {
      path: current,
      depth,
      status,
      redirectedTo,
      title: content.title,
      hasH1: content.hasH1,
      isBlank: content.isBlank,
      textLength: content.textLength,
      formCount: forms.length,
      forms,
      internalLinkCount: links.internal.length,
    });

    if (depth < MAX_DEPTH) {
      for (const raw of links.internal) {
        const norm = normalizePath(raw);
        if (seen.has(norm)) continue;
        seen.add(norm);
        queue.push({ path: norm, depth: depth + 1 });
      }
    }
  }

  // Cek link eksternal sekali saja, tanpa menavigasinya.
  const externalResults = [];
  for (const url of [...externalLinks].slice(0, 40)) {
    try {
      const res = await page.request.head(url, { timeout: 10_000, failOnStatusCode: false });
      externalResults.push({ url, status: res.status() });
    } catch (e) {
      externalResults.push({ url, status: null, error: String(e).split('\n')[0] });
    }
  }

  // Route legacy migrasi v5 harus redirect ke canonical.
  const legacy = [];
  for (const { from, to } of LEGACY_REDIRECTS) {
    try {
      await page.goto(from, { waitUntil: 'domcontentloaded' });
      // Tunggu URL benar-benar berubah, bukan sleep tetap: redirect bisa
      // diselesaikan setelah hidrasi dan sleep pendek menghasilkan false positive.
      await page.waitForURL(`**${to}`, { timeout: 15_000 }).catch(() => {});
      const landed = new URL(page.url()).pathname;
      legacy.push({ from, expected: to, actual: landed, ok: landed === to });
    } catch (e) {
      legacy.push({ from, expected: to, actual: null, ok: false, error: String(e).split('\n')[0] });
    }
  }

  const pages = [...visited.values()];
  const brokenInternal = pages.filter((p) => p.navError || (p.status !== null && p.status >= 400));
  const blankPages = pages.filter((p) => p.isBlank);
  const missingH1 = pages.filter((p) => !p.navError && !p.hasH1);
  const brokenExternal = externalResults.filter((r) => r.status === null || r.status >= 400);

  writeArtifact('crawl.json', {
    origin,
    limits: { maxPages: MAX_PAGES, maxDepth: MAX_DEPTH, hitCap },
    counts: {
      visited: pages.length,
      skipped: skipped.length,
      externalChecked: externalResults.length,
      brokenInternal: brokenInternal.length,
      brokenExternal: brokenExternal.length,
      blankPages: blankPages.length,
      missingH1: missingH1.length,
      consoleErrors: errors.console.length,
      pageErrors: errors.pageErrors.length,
    },
    pages,
    skipped,
    legacyRedirects: legacy,
    externalResults,
    errors,
  });

  // Batas crawl dilaporkan eksplisit — cakupan parsial jangan terbaca sebagai lengkap.
  if (hitCap) {
    test.info().annotations.push({
      type: 'warning',
      description: `Batas crawl ${MAX_PAGES} halaman tercapai; masih ada ${queue.length} URL dalam antrean. Cakupan PARSIAL.`,
    });
  }

  expect(pages.length, 'crawl harus mengunjungi minimal beberapa halaman').toBeGreaterThan(3);
  expect(brokenInternal, `Halaman internal error: ${JSON.stringify(brokenInternal, null, 2)}`).toEqual([]);
  expect(blankPages, `Halaman kosong: ${JSON.stringify(blankPages.map((p) => p.path))}`).toEqual([]);
  expect(
    legacy.filter((l) => !l.ok),
    `Redirect legacy gagal: ${JSON.stringify(legacy.filter((l) => !l.ok), null, 2)}`
  ).toEqual([]);
  expect(
    brokenExternal,
    `Link eksternal mati: ${JSON.stringify(brokenExternal, null, 2)}`
  ).toEqual([]);
  expect(
    errors.pageErrors,
    `Exception JS: ${JSON.stringify(errors.pageErrors, null, 2)}`
  ).toEqual([]);
});
