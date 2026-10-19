/**
 * @file Review responsif — screenshot 3 viewport + assertion layout.
 *
 * Screenshot saja memaksa orang memelototi ratusan gambar. Karena itu setiap
 * capture disertai probe terprogram: overflow horizontal dan tap target kecil.
 *
 * Catatan: daftar route dinamis TIDAK bisa dibaca saat collection, karena
 * discovery.json baru ditulis project `setup` yang jalan setelah semua spec
 * di-load. Route dinamis karena itu ditangani di dalam satu test runtime.
 */

import { test, expect } from '@playwright/test';
import {
  ARTIFACT_DIR, checkOverflow, checkTapTargets, settle, writeShard, readArtifact,
} from '../lib/helpers.mjs';
import { PUBLIC_ROUTES, DASHBOARD_ROUTES, DYNAMIC_TEMPLATES, slug } from '../lib/routes.mjs';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const findings = [];

/** Kunjungi satu route pada satu viewport, capture + probe. */
async function auditRoute(page, route, vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await settle(page);

  const file = `${ARTIFACT_DIR}/screenshots/${slug(route)}--${vp.name}.png`;
  await page.screenshot({ path: file, fullPage: true });

  const overflow = await checkOverflow(page);
  const tapTargets = vp.name === 'mobile' ? await checkTapTargets(page) : [];

  const result = { route, viewport: vp.name, screenshot: file, overflow, tapTargets };
  findings.push(result);
  return result;
}

function assertNoOverflow(r) {
  expect(
    r.overflow.hasOverflow,
    `Overflow horizontal di ${r.route} @ ${r.viewport}: konten ${r.overflow.docWidth}px > viewport ${r.overflow.viewWidth}px. ` +
    `Penyebab: ${JSON.stringify(r.overflow.offenders, null, 2)}`
  ).toBe(false);
}

test.describe('Responsif — halaman publik', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of PUBLIC_ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route} @ ${vp.name}`, async ({ page }) => {
        assertNoOverflow(await auditRoute(page, route, vp));
      });
    }
  }

  test('route publik dinamis (/publik/dusun/:id) di semua viewport', async ({ page }) => {
    const { dusunIds = [] } = readArtifact('discovery.json', {});
    test.skip(dusunIds.length === 0, 'Tidak ada id dusun dari discovery.json');

    const routes = DYNAMIC_TEMPLATES.public.map((t) => t.replace(':id', dusunIds[0]));
    for (const route of routes) {
      for (const vp of VIEWPORTS) {
        assertNoOverflow(await auditRoute(page, route, vp));
      }
    }
  });
});

test.describe('Responsif — dashboard', () => {
  test.use({ storageState: `${ARTIFACT_DIR}/storage-state.json` });

  for (const route of DASHBOARD_ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route} @ ${vp.name}`, async ({ page }) => {
        assertNoOverflow(await auditRoute(page, route, vp));
      });
    }
  }

  test('route dashboard dinamis (/dashboard/dusun/:id) di semua viewport', async ({ page }) => {
    const { dusunIds = [] } = readArtifact('discovery.json', {});
    test.skip(dusunIds.length === 0, 'Tidak ada id dusun dari discovery.json');

    const routes = DYNAMIC_TEMPLATES.dashboard.map((t) => t.replace(':id', dusunIds[0]));
    for (const route of routes) {
      for (const vp of VIEWPORTS) {
        assertNoOverflow(await auditRoute(page, route, vp));
      }
    }
  });
});

test.afterAll(async () => {
  if (findings.length === 0) return;
  // Satu shard per worker; report.mjs yang menggabungkan.
  writeShard('responsive', { viewports: VIEWPORTS, findings });
});
