jest.mock('server-only', () => ({}), { virtual: true });

let mockTables;
let mockFailure;
let mockLegacy;
let mockProjections;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from(table) {
      const filters = [];
      let projection = '*';
      const query = {
        select(columns) { projection = columns; mockProjections.push({ table, columns }); return query; },
        eq(key, value) { filters.push((row) => row[key] === value); if (key === 'bulan' && mockLegacy.has(table)) query.missingMonth = true; return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        order() { return query; },
        then(resolve, reject) {
          if (mockFailure === table) return Promise.resolve({ data: null, error: { code: '42501', message: 'private database error' } }).then(resolve, reject);
          if (query.missingMonth) return Promise.resolve({ data: null, error: { code: '42703', message: 'column bulan does not exist' } }).then(resolve, reject);
          const rows = (mockTables[table] || []).filter((row) => filters.every((filter) => filter(row))).map((row) => projection === '*' ? { ...row } : Object.fromEntries(projection.split(',').map((key) => [key.trim(), row[key.trim()]])));
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  })),
}));

const { readPublicPeriod, serializePublicRow, getPublicYears } = require('@/lib/publicRepository');
const { GET: summary } = require('@/app/api/public/summary/route');
const { GET: detail } = require('@/app/api/public/dusun/[id]/route');
const { GET: years } = require('@/app/api/public/years/route');
const { createClient } = require('@supabase/supabase-js');

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-private-key';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
  mockFailure = null;
  mockLegacy = new Set();
  mockProjections = [];
  mockTables = {
    dusun: [{ id: 1, nama: 'Soko', nomor_urut: 1, is_active: 1 }, { id: 2, nama: 'Inactive', is_active: 0 }],
    report_years: [{ tahun: 2026, is_active: 1 }, { tahun: 2025, is_active: 0 }],
    table_column_overrides: [],
    data_umum: [
      { dusun_id: 1, tahun: 2026, bulan: 12, jml_kk: '0', jml_jiwa_l: '3', jml_jiwa_p: '4', keterangan: 'PRIVATE NOTE', custom_columns: { nik: 'PRIVATE ID' } },
      { dusun_id: 2, tahun: 2026, bulan: 12, jml_kk: 9999, updated_at: '2099-01-01' },
      { dusun_id: 1, tahun: 2026, bulan: 11, jml_kk: 15 },
    ],
  };
});

test('server client uses only service credential and missing credential fails closed', async () => {
  await readPublicPeriod(2026, 12);
  expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'server-private-key', expect.any(Object));
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  await expect(readPublicPeriod(2026, 12)).rejects.toThrow('configuration');
});

test('summary filters inactive dusun and other months, preserves aliases and boolean availability', async () => {
  const response = await summary(new Request('http://localhost/api/public/summary?tahun=2026&bulan=12'));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.totalDusun).toBe(1);
  expect(result.totalDesa).toBe(result.totalDusun);
  expect(result.desa).toEqual(result.dusun);
  expect(result.totals.total_kk).toBe(0);
  expect(result.totals.total_jiwa).toBe(7);
  expect(result.lastUpdated).toBeNull();
  expect(result.availability.data_umum).toBe(true);
  expect(result.availability.data_bumil).toBe(false);
  expect(result.periods.data_umum).toBe('monthly');
  expect(result.periods.data_pokja1).toBe('annual');
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|custom_columns|keterangan|server-private-key/);
  expect(mockProjections.every(({ columns }) => columns !== '*')).toBe(true);
  const umumProjection = mockProjections.find(({ table }) => table === 'data_umum').columns.split(',');
  expect(umumProjection).toEqual(expect.arrayContaining(['dusun_id', 'tahun', 'updated_at', 'jml_kk']));
  expect(umumProjection).not.toContain('bulan');
});

test('failed read becomes 503 with no internal error leak, not a zero summary', async () => {
  mockFailure = 'data_umum';
  const response = await summary(new Request('http://localhost/api/public/summary'));
  expect(response.status).toBe(503);
  const result = await response.json();
  expect(result).toHaveProperty('error');
  expect(result).not.toHaveProperty('totals');
  expect(JSON.stringify(result)).not.toMatch(/42501|private database/);
});

test('detail DTO returns only allowlisted finite numbers and refuses inactive unit', async () => {
  const response = await detail(new Request('http://localhost/api/public/dusun/1?tahun=2026&bulan=12'), { params: Promise.resolve({ id: '1' }) });
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.desa).toEqual(result.dusun);
  expect(result.availability.data_umum).toBe(true);
  expect(result.tables.data_umum.jml_kk).toBe(0);
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|custom_columns|keterangan/);
  const inactive = await detail(new Request('http://localhost/api/public/dusun/2'), { params: Promise.resolve({ id: '2' }) });
  expect(inactive.status).toBe(404);
  expect(serializePublicRow({ jml_kk: 'not a number', secret_key: 'secret' }, 'data_umum').jml_kk).toBe(0);
});

test('no records differs from valid zero record and legacy annual fallback is labelled', async () => {
  const absent = await readPublicPeriod(2024, 12);
  expect(absent.hasData).toBe(false);
  expect(absent.availability.data_umum).toBe(false);
  mockLegacy.add('data_umum');
  const legacy = await readPublicPeriod(2026, 12);
  expect(legacy.periods.data_umum).toBe('annual_legacy');
  expect(legacy.availability.data_umum).toBe(true);
  expect(mockProjections.filter(({ table }) => table === 'data_umum').every(({ columns }) => !columns.split(',').includes('bulan'))).toBe(true);
});

test('Pokja-only period reports general population data as unavailable', async () => {
  mockTables.data_umum = [];
  mockTables.data_pokja1 = [{ dusun_id: 1, tahun: 2026, kader_pkbn: 2 }];
  const response = await summary(new Request('http://localhost/api/public/summary?tahun=2026&bulan=12'));
  const result = await response.json();
  expect(result.hasData).toBe(true);
  expect(result.availability.data_umum).toBe(false);
  expect(result.availability.data_pokja1).toBe(true);
});

test('public years exposes active year numbers only without auth', async () => {
  expect(await getPublicYears()).toEqual([{ tahun: 2026 }]);
  const response = await years();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{ tahun: 2026 }]);
  mockFailure = 'report_years';
  expect((await years()).status).toBe(503);
});
