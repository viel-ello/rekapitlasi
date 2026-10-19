/**
 * @file Audit aksesibilitas — axe-core, WCAG 2.0/2.1 level A & AA.
 *
 * Kebijakan severity: `critical` dan `serious` menggagalkan test.
 * `moderate` dan `minor` hanya dicatat ke laporan supaya hasil tetap
 * bisa ditindaklanjuti, tidak tenggelam dalam ratusan pelanggaran kecil.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ARTIFACT_DIR, settle, writeShard } from '../lib/helpers.mjs';
import { PUBLIC_ROUTES, DASHBOARD_ROUTES } from '../lib/routes.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING = new Set(['critical', 'serious']);

const results = [];

async function scan(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await settle(page);

  // Tunggu animasi masuk selesai sebelum memindai.
  // OnboardingTour (framer-motion) beranimasi opacity 0 -> 1 selama 0.25 detik.
  // Memindai di tengah animasi membuat axe mengukur warna hasil blending dan
  // melaporkan color-contrast palsu pada tombol yang warnanya sebenarnya benar.
  await page.waitForFunction(() => {
    const els = document.querySelectorAll('[class*="fixed"], [role="dialog"], .animate-in');
    for (const el of els) {
      const op = parseFloat(getComputedStyle(el).opacity);
      if (!Number.isNaN(op) && op > 0 && op < 1) return false;
    }
    return true;
  }, null, { timeout: 5_000 }).catch(() => { /* lanjut memindai apa adanya */ });

  const scanResult = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  const violations = scanResult.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodeCount: v.nodes.length,
    nodes: v.nodes.slice(0, 5).map((n) => ({
      target: n.target.join(' '),
      snippet: (n.html || '').slice(0, 160),
      // Ringkasan axe memuat warna terukur dan rasio — wajib untuk membedakan
      // pelanggaran nyata dari artefak animasi.
      failureSummary: (n.failureSummary || '').slice(0, 300),
    })),
  }));

  const blocking = violations.filter((v) => BLOCKING.has(v.impact));
  const advisory = violations.filter((v) => !BLOCKING.has(v.impact));

  results.push({ route, blocking, advisory });

  expect(
    blocking,
    `Pelanggaran a11y serius/kritis di ${route}:\n${JSON.stringify(blocking, null, 2)}`
  ).toEqual([]);
}

test.describe('Aksesibilitas — halaman publik', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of PUBLIC_ROUTES) {
    test(`axe ${route}`, async ({ page }) => scan(page, route));
  }
});

test.describe('Aksesibilitas — dashboard', () => {
  test.use({ storageState: `${ARTIFACT_DIR}/storage-state.json` });

  for (const route of DASHBOARD_ROUTES) {
    test(`axe ${route}`, async ({ page }) => scan(page, route));
  }
});

test.afterAll(async () => {
  if (results.length === 0) return;
  // Satu shard per worker; report.mjs yang menggabungkan dan mengelompokkan.
  writeShard('a11y', { tags: TAGS, perRoute: results });
});
