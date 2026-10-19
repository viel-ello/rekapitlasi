/**
 * @file Smoke — halaman publik, proteksi route, dan alur login.
 *
 * Test di file ini sengaja TIDAK memakai storageState: sebagian justru
 * memverifikasi perilaku saat belum login.
 */

import { test, expect } from '@playwright/test';
import { collectErrors, checkBlankPage, settle, writeArtifact } from '../lib/helpers.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Halaman publik', () => {
  test('landing page load dengan konten dan judul', async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto('/');

    expect(res?.status(), 'GET / harus 200').toBeLessThan(400);
    await settle(page);

    const info = await checkBlankPage(page);
    expect(info.isBlank, `Body hampir kosong: "${info.sample}"`).toBe(false);
    expect(info.title.trim(), 'title tidak boleh kosong').not.toBe('');
    expect(info.hasH1, 'landing page harus punya <h1>').toBe(true);

    // Link utama dari app/page.js
    await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/publik"]').first()).toBeVisible();

    writeArtifact('smoke-landing.json', { info, errors });
    expect(errors.pageErrors, 'tidak boleh ada exception JS').toEqual([]);
  });

  test('halaman /publik bisa diakses tanpa login', async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto('/publik');
    expect(res?.status()).toBeLessThan(400);
    await settle(page);

    // Harus tetap di /publik, bukan dilempar ke /login.
    expect(page.url()).toContain('/publik');

    const info = await checkBlankPage(page);
    expect(info.isBlank, `/publik hampir kosong: "${info.sample}"`).toBe(false);
    expect(errors.pageErrors).toEqual([]);
  });

  test('halaman /login menampilkan form lengkap', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();

    // Toggle password harus punya nama aksesibel (app/login/page.js pakai aria-label).
    const toggle = page.getByRole('button', { name: /(tampilkan|sembunyikan) kata sandi/i });
    await expect(toggle).toBeVisible();

    // Verifikasi toggle benar-benar mengubah type input.
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  });
});

test.describe('Proteksi route', () => {
  // proxy.js melakukan jwtVerify untuk /dashboard/*, bukan sekadar cek cookie ada.
  for (const route of ['/dashboard', '/dashboard/admin', '/dashboard/pokja1']) {
    test(`${route} tanpa sesi dialihkan ke /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }

  test('cookie auth-token palsu ditolak dan dibersihkan', async ({ page, context, baseURL }) => {
    await context.addCookies([{
      name: 'auth-token',
      value: 'ini.bukan.jwt.valid',
      url: baseURL,
    }]);

    await page.goto('/dashboard');
    await expect(page, 'JWT invalid harus dialihkan ke /login').toHaveURL(/\/login/, { timeout: 15_000 });

    const cookies = await context.cookies();
    const token = cookies.find((c) => c.name === 'auth-token');
    expect(token?.value || '', 'proxy.js harus meng-clear cookie invalid').toBe('');
  });
});

test.describe('Alur login', () => {
  test.describe.configure({ mode: 'serial' });

  test('kredensial valid masuk ke dashboard', async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto('/login');
    await page.locator('#username').fill(process.env.E2E_USER || 'admin');
    await page.locator('#password').fill(process.env.E2E_PASS || 'admin123');
    await page.getByRole('button', { name: /masuk/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await settle(page);

    const info = await checkBlankPage(page);
    expect(info.isBlank, 'dashboard tidak boleh kosong setelah login').toBe(false);

    writeArtifact('smoke-login.json', { landed: page.url(), errors });
    expect(errors.pageErrors).toEqual([]);
  });

  // DIMATIKAN secara default. lib/rate-limit.js memblokir IP 30 menit setelah
  // 5 percobaan gagal. Nyalakan hanya saat menguji localhost.
  test('kredensial salah menampilkan pesan error', async ({ page }) => {
    test.skip(
      process.env.E2E_TEST_BAD_LOGIN !== '1',
      'Dilewati: memicu rate limit produksi (5 gagal/IP = blokir 30 menit). Set E2E_TEST_BAD_LOGIN=1 untuk localhost.'
    );
    // Jangan retry — setiap percobaan menambah counter rate limit.
    test.info().annotations.push({ type: 'warning', description: 'menambah 1 percobaan gagal pada counter rate limit' });

    await page.goto('/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('pasti-salah-' + process.pid);
    await page.getByRole('button', { name: /masuk/i }).click();

    // API mengembalikan "Username atau password salah" (app/api/auth/route.js).
    await expect(page.getByText(/username atau password salah|terlalu banyak percobaan/i))
      .toBeVisible({ timeout: 15_000 });

    // Harus tetap di /login, tidak boleh lolos.
    expect(page.url()).toContain('/login');
  });
});
