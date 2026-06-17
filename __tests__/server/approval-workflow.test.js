/**
 * @file Guard: workflow approval — aksi "return" wajib alasan revisi, dan
 * queue endpoint mendukung filter. Berbasis konten sumber (ringan, tanpa DB).
 */
const fs = require('fs');
const path = require('path');

function readFile(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('app/api/periods/route.js — return wajib alasan', () => {
  const content = readFile('app/api/periods/route.js');

  test('aksi return memvalidasi panjang alasan minimal', () => {
    expect(content).toMatch(/action === 'return'/);
    expect(content).toMatch(/trimmedNotes/);
    expect(content).toMatch(/Alasan revisi wajib diisi/i);
  });

  test('notes disimpan sebagai trimmedNotes', () => {
    expect(content).toMatch(/notes: trimmedNotes \|\| null/);
  });
});

describe('app/api/periods/queue/route.js — filter queue', () => {
  const content = readFile('app/api/periods/queue/route.js');

  test('mendukung filter tahun, bulan, table_name, status', () => {
    expect(content).toMatch(/searchParams\.get\('tahun'\)/);
    expect(content).toMatch(/searchParams\.get\('bulan'\)/);
    expect(content).toMatch(/searchParams\.get\('table_name'\)/);
    expect(content).toMatch(/searchParams\.get\('status'\)/);
  });
});
