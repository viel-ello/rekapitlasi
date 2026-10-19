// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e' });

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export function isProductionUrl(url) {
  return /lumbungdatapkk\.vercel\.app|supabase\.co/i.test(url || '');
}

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.mjs',
  workers: process.env.CI ? 2 : 3,
  fullyParallel: true,
  retries: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-artifacts/html-report', open: 'never' }],
    ['json', { outputFile: 'e2e-artifacts/results.json' }],
  ],
  outputDir: 'e2e-artifacts/test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [
    { name: 'setup', testDir: './e2e', testMatch: /auth\.setup\.mjs/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
});
