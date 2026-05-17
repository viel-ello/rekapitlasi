/**
 * @file Test redirect endpoint legacy desa → dusun.
 * Memastikan path /publik/desa/[id], /dashboard/desa/[id], /api/public/desa/[id],
 * /api/rekap/desa/[id] mengarahkan ke counterpart canonical /dusun/[id].
 */

const path = require('path');

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

describe('Legacy desa routes — redirect ke /dusun', () => {
  test('app/publik/desa/[id]/page.js memanggil redirect ke /publik/dusun/[id]', () => {
    const fs = require('fs');
    const file = fs.readFileSync(
      path.join(process.cwd(), 'app/publik/desa/[id]/page.js'),
      'utf8'
    );
    expect(file).toMatch(/redirect/);
    expect(file).toMatch(/\/publik\/dusun\//);
  });

  test('app/dashboard/desa/[id]/page.js memanggil redirect ke /dashboard/dusun/[id]', () => {
    const fs = require('fs');
    const file = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/desa/[id]/page.js'),
      'utf8'
    );
    expect(file).toMatch(/redirect/);
    expect(file).toMatch(/\/dashboard\/dusun\//);
  });

  test('app/api/public/desa/[id]/route.js redirect 308 ke /api/public/dusun/[id]', async () => {
    const mod = require('@/app/api/public/desa/[id]/route');
    expect(typeof mod.GET).toBe('function');

    const ctx = { params: Promise.resolve({ id: '5' }) };
    const request = { url: 'http://localhost/api/public/desa/5?tahun=2026' };
    const response = await mod.GET(request, ctx);
    expect(response.status).toBe(308);
    const location = response.headers.get('location');
    expect(location).toMatch(/\/api\/public\/dusun\/5/);
    expect(location).toMatch(/tahun=2026/);
    expect(response.headers.get('deprecation')).toBe('true');
  });

  test('app/api/rekap/desa/[id]/route.js redirect 308 ke /api/rekap/dusun/[id]', async () => {
    const mod = require('@/app/api/rekap/desa/[id]/route');
    expect(typeof mod.GET).toBe('function');

    const ctx = { params: Promise.resolve({ id: '3' }) };
    const request = { url: 'http://localhost/api/rekap/desa/3' };
    const response = await mod.GET(request, ctx);
    expect(response.status).toBe(308);
    const location = response.headers.get('location');
    expect(location).toMatch(/\/api\/rekap\/dusun\/3/);
    expect(response.headers.get('deprecation')).toBe('true');
  });
});

describe('Canonical dusun routes — file existence', () => {
  test('app/publik/dusun/[id]/page.js exists', () => {
    const fs = require('fs');
    expect(
      fs.existsSync(path.join(process.cwd(), 'app/publik/dusun/[id]/page.js'))
    ).toBe(true);
  });

  test('app/dashboard/dusun/[id]/page.js exists', () => {
    const fs = require('fs');
    expect(
      fs.existsSync(path.join(process.cwd(), 'app/dashboard/dusun/[id]/page.js'))
    ).toBe(true);
  });

  test('app/api/public/dusun/[id]/route.js exists & exports GET', () => {
    const mod = require('@/app/api/public/dusun/[id]/route');
    expect(typeof mod.GET).toBe('function');
  });

  test('app/api/rekap/dusun/[id]/route.js exists & exports GET', () => {
    const mod = require('@/app/api/rekap/dusun/[id]/route');
    expect(typeof mod.GET).toBe('function');
  });
});

describe('Endpoint canonical tidak select desa_id (schema baru)', () => {
  const fs = require('fs');

  function readFile(rel) {
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  }

  test('/api/public/dusun/[id] tidak select kolom desa_id', () => {
    const content = readFile('app/api/public/dusun/[id]/route.js');
    expect(content).not.toMatch(/select\([^)]*desa_id/);
    expect(content).not.toMatch(/'desa_id'/);
  });

  test('/api/rekap/dusun/[id] tidak select kolom desa_id', () => {
    const content = readFile('app/api/rekap/dusun/[id]/route.js');
    expect(content).not.toMatch(/select\([^)]*desa_id/);
  });

  test('/api/public/summary tidak select kolom desa_id', () => {
    const content = readFile('app/api/public/summary/route.js');
    expect(content).not.toMatch(/'desa_id'\s*,/);
    expect(content).not.toMatch(/'dusun_id',\s*'desa_id'/);
  });

  test('/api/rekap/trend tidak select kolom desa_id', () => {
    const content = readFile('app/api/rekap/trend/route.js');
    // Tidak boleh ada select yang mention desa_id (schema baru tidak punya).
    expect(content).not.toMatch(/select\([^)]*desa_id/);
  });

  test('/api/reports/build tidak filter desa_id.in', () => {
    const content = readFile('app/api/reports/build/route.js');
    expect(content).not.toMatch(/desa_id\.in\(/);
  });

  test('/api/chat tidak fallback update via desa_id', () => {
    const content = readFile('app/api/chat/route.js');
    expect(content).not.toMatch(/\.eq\('desa_id',/);
  });
});
