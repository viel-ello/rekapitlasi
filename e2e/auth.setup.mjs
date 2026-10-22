/**
 * @file Setup autentikasi — jalan sekali sebelum semua test lain.
 *
 * Login satu kali, simpan storageState (cookie auth-token + localStorage `user`),
 * lalu ambil daftar dusun untuk mengisi route dinamis.
 *
 * Login sukses juga MENGHAPUS catatan rate limit untuk IP ini
 * (lib/rate-limit.js clearAttempts), jadi setup ini sekaligus mereset counter.
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import { writeArtifact, ARTIFACT_DIR } from './lib/helpers.mjs';
import { isProductionUrl } from '../playwright.config.mjs';

export const STORAGE_STATE = `${ARTIFACT_DIR}/storage-state.json`;

setup('authenticate + discover', async ({ page, baseURL }) => {
  if (isProductionUrl(baseURL) && process.env.E2E_ALLOW_PROD_READ !== '1') {
    throw new Error(
      `[SECURITY GUARD] E2E execution aborted: baseURL "${baseURL}" is a production environment. Set E2E_ALLOW_PROD_READ=1 to permit read-only execution.`
    );
  }

  const user = process.env.E2E_USER || 'admin';
  const pass = process.env.E2E_PASS || 'admin123';

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  await page.goto('/login');

  // Selector dari app/login/page.js — input pakai id eksplisit.
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pass);
  await page.getByRole('button', { name: /masuk/i }).click();

  // Login sukses -> router.push('/dashboard').
  // Kalau gagal, hentikan seluruh run: 20 test gagal karena sesi kosong
  // hanya akan menutupi penyebab aslinya.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  await page.context().storageState({ path: STORAGE_STATE });

  // Ambil id dusun asli lewat API (GET, read-only) untuk route dinamis.
  let dusunIds = [];
  try {
    const res = await page.request.get('/api/dusun');
    if (res.ok()) {
      const body = await res.json();
      const list = Array.isArray(body) ? body : (body?.data ?? []);
      dusunIds = list.map((d) => d?.id).filter((id) => id !== undefined && id !== null);
    }
  } catch { /* route dinamis akan dilewati, dicatat di laporan */ }

  writeArtifact('discovery.json', {
    baseURL,
    loggedInAs: user,
    landedOn: page.url(),
    dusunIds,
    dusunCount: dusunIds.length,
  });

  expect(dusunIds.length, 'GET /api/dusun harus mengembalikan minimal satu dusun').toBeGreaterThan(0);
});
