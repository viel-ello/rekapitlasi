/**
 * @file Test row-level enforcement di importToSupabase untuk role kader-dusun.
 * Memastikan kader-dusun hanya bisa import baris dusun miliknya, dan role
 * scope `all` (admin) bisa import semua baris.
 */

let capturedUpserts = [];

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

// Mock supabase: tangkap records yang di-upsert lewat global (jest.mock factory
// tidak boleh reference variable out-of-scope kecuali prefiks `mock`/global).
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: (records) => {
        global.__capturedUpserts.push(...records);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

const DUSUN_LIST = [
  { id: 1, nama: 'Soko' },
  { id: 2, nama: 'Melikan' },
  { id: 5, nama: 'Belikurip' },
];

function makeSheet() {
  return {
    sheetName: 'REKAP DAWIS',
    table: 'data_rekap_dawis',
    rows: [
      { dusunName: 'Soko', fields: { jml_kk: '10' } },
      { dusunName: 'Melikan', fields: { jml_kk: '20' } },
      { dusunName: 'Belikurip', fields: { jml_kk: '30' } },
    ],
    unmatched: [],
  };
}

beforeEach(() => {
  capturedUpserts = [];
  global.__capturedUpserts = capturedUpserts;
});

describe('importToSupabase — row-level enforcement', () => {
  test('kader-dusun (dusun_soko, id=1) hanya import baris dusun-nya', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    const user = { role: 'dusun_soko', dusun_id: 1 };
    const allowed = ['data_rekap_dawis'];

    const results = await importToSupabase([makeSheet()], 2026, allowed, DUSUN_LIST, user);

    // Hanya 1 record (Soko) yang di-upsert.
    expect(capturedUpserts).toHaveLength(1);
    expect(capturedUpserts[0].dusun_id).toBe(1);
    expect(results[0].success).toBe(1);
    expect(results[0].rowLevelSkipped).toBe(2);
  });

  test('admin (scope all) import semua baris', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    const user = { role: 'admin', dusun_id: null };
    const allowed = ['data_rekap_dawis'];

    const results = await importToSupabase([makeSheet()], 2026, allowed, DUSUN_LIST, user);

    expect(capturedUpserts).toHaveLength(3);
    expect(results[0].success).toBe(3);
    expect(results[0].rowLevelSkipped).toBeUndefined();
  });

  test('kader-dusun tanpa dusun_id assignment di-skip total', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    const user = { role: 'dusun_soko', dusun_id: null };
    const allowed = ['data_rekap_dawis'];

    const results = await importToSupabase([makeSheet()], 2026, allowed, DUSUN_LIST, user);

    expect(capturedUpserts).toHaveLength(0);
    expect(results[0].skipped).toBe(true);
  });

  test('tabel di luar allowedTables di-skip (table-level)', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    const user = { role: 'dusun_soko', dusun_id: 1 };
    const allowed = ['data_rekap_dawis'];
    const sheet = { ...makeSheet(), sheetName: 'POKJA I', table: 'data_pokja1' };

    const results = await importToSupabase([sheet], 2026, allowed, DUSUN_LIST, user);

    expect(capturedUpserts).toHaveLength(0);
    expect(results[0].skipped).toBe(true);
  });

  test('tabel per-bulan dapat default bulan 12 saat row tidak bawa bulan', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    const user = { role: 'admin', dusun_id: null };
    const allowed = ['data_umum'];
    const sheet = {
      sheetName: 'DATA UMUM',
      table: 'data_umum',
      rows: [{ dusunName: 'Soko', fields: { jml_kk: '10' } }],
      unmatched: [],
    };

    await importToSupabase([sheet], 2026, allowed, DUSUN_LIST, user);

    expect(capturedUpserts[0].bulan).toBe(12);
  });
});
