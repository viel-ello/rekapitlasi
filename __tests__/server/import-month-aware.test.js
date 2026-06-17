/**
 * @file Test import Excel month-aware: tabel bulanan (data_umum, data_rekap_dawis,
 * data_bumil) harus tersimpan ke bulan yang dipilih caller, bukan default 12.
 */

let capturedUpserts = [];

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

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
];

function sheet(table) {
  return {
    sheetName: table,
    table,
    rows: [{ dusunName: 'Soko', fields: { jml_kk: '10' } }],
    unmatched: [],
  };
}

beforeEach(() => {
  capturedUpserts = [];
  global.__capturedUpserts = capturedUpserts;
});

describe('importToSupabase — month-aware', () => {
  const admin = { role: 'admin', dusun_id: null };
  const allowed = ['data_umum', 'data_rekap_dawis', 'data_bumil'];

  test('data_umum tersimpan ke bulan yang dipilih (bukan 12)', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    await importToSupabase([sheet('data_umum')], 2026, allowed, DUSUN_LIST, admin, 7);
    expect(capturedUpserts[0].bulan).toBe(7);
  });

  test('data_rekap_dawis tersimpan ke bulan 3', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    await importToSupabase([sheet('data_rekap_dawis')], 2026, allowed, DUSUN_LIST, admin, 3);
    expect(capturedUpserts[0].bulan).toBe(3);
  });

  test('data_bumil tersimpan ke bulan 1', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    await importToSupabase([sheet('data_bumil')], 2026, allowed, DUSUN_LIST, admin, 1);
    expect(capturedUpserts[0].bulan).toBe(1);
  });

  test('tanpa argumen bulan → fallback ke 12 (snapshot Desember)', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    await importToSupabase([sheet('data_umum')], 2026, allowed, DUSUN_LIST, admin);
    expect(capturedUpserts[0].bulan).toBe(12);
  });

  test('tabel non-bulanan (data_pokja1) tidak dapat kolom bulan', async () => {
    const { importToSupabase } = require('@/lib/excel/importToSupabase');
    await importToSupabase([{ ...sheet('data_pokja1'), table: 'data_pokja1' }], 2026, ['data_pokja1'], DUSUN_LIST, admin, 5);
    expect(capturedUpserts[0].bulan).toBeUndefined();
  });
});
