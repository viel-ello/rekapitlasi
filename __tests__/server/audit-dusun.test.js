/**
 * @file Test audit log canonical pakai dusun_nama dengan fallback desa_nama.
 */

const path = require('path');
const fs = require('fs');

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

function readFile(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('Audit log — canonical dusun_nama dengan fallback desa_nama', () => {
  test('lib/audit.js menulis dusun_nama (canonical)', () => {
    const content = readFile('lib/audit.js');
    expect(content).toMatch(/dusun_nama/);
    expect(content).toMatch(/dusunNama/);
  });

  test('/api/admin/logs select & filter pakai dusun_nama (or fallback desa_nama)', () => {
    const content = readFile('app/api/admin/logs/route.js');
    // Filter input: param `dusun` (canonical), `desa` sebagai alias.
    expect(content).toMatch(/searchParams\.get\('dusun'\)/);
    // Server query OR pakai dusun_nama,desa_nama
    expect(content).toMatch(/dusun_nama\.eq\.\$\{unitNama\}/);
    expect(content).toMatch(/desa_nama\.eq\.\$\{unitNama\}/);
  });

  test('/api/admin/logs/export select dusun_nama + fallback', () => {
    const content = readFile('app/api/admin/logs/export/route.js');
    expect(content).toMatch(/select\([^)]*dusun_nama/);
    // Header CSV pakai 'Dusun' (canonical)
    expect(content).toMatch(/'Dusun'/);
  });

  test('/api/auth/me/activity normalisasi dusun_nama dengan fallback', () => {
    const content = readFile('app/api/auth/me/activity/route.js');
    expect(content).toMatch(/dusun_nama/);
    expect(content).toMatch(/desa_nama/);
    // Output normalized di field dusun_nama
    expect(content).toMatch(/row\.dusun_nama \|\| row\.desa_nama/);
  });

  test('UI admin page tampilkan dusun_nama (fallback ke desa_nama)', () => {
    const content = readFile('app/dashboard/admin/page.js');
    // Header table: 'Dusun'
    expect(content).toMatch(/<th>Dusun<\/th>/);
    // Field render fallback chain
    expect(content).toMatch(/l\.dusun_nama \|\| l\.desa_nama/);
  });

  test('UI profile page tampilkan dusun_nama (fallback ke desa_nama)', () => {
    const content = readFile('app/dashboard/profile/page.js');
    expect(content).toMatch(/a\.dusun_nama \|\| a\.desa_nama/);
  });
});
