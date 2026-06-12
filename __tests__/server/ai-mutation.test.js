/**
 * @file Test validateAiMutation — validasi & sanitasi proposal mutasi AI.
 * Memastikan whitelist tabel/kolom, row-level (kader-dusun), sanitasi nilai,
 * dan resolve bulan untuk tabel per-bulan bekerja benar.
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

const ADMIN_TABLES = [
  'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
  'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil',
];

describe('validateAiMutation', () => {
  test('admin update kolom valid → sukses + sanitasi integer', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_pokja1',
      rawUnitId: 3,
      updates: { kader_pkbn: '12' },
      allowedTables: ADMIN_TABLES,
    });
    expect(res.valid).toBe(true);
    expect(res.tableName).toBe('data_pokja1');
    expect(res.dusunId).toBe(3);
    expect(res.sanitizedUpdates.kader_pkbn).toBe(12);
    expect(res.isMonthly).toBe(false);
    expect(res.bulan).toBeNull();
  });

  test('tabel tidak valid → error', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_hacker',
      rawUnitId: 1,
      updates: { x: 1 },
      allowedTables: ADMIN_TABLES,
    });
    expect(res.error).toMatch(/tidak valid/i);
  });

  test('kolom tidak valid → error', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_pokja1',
      rawUnitId: 1,
      updates: { kolom_ngawur: 5 },
      allowedTables: ADMIN_TABLES,
    });
    expect(res.error).toMatch(/Kolom tidak valid/i);
  });

  test('role tanpa izin tabel → akses ditolak', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'dusun_soko', dusun_id: 1 },
      rawTable: 'data_pokja1',
      rawUnitId: 1,
      updates: { kader_pkbn: 1 },
      allowedTables: ['data_umum', 'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil'],
    });
    expect(res.error).toMatch(/Akses ditolak/i);
  });

  test('kader-dusun tidak boleh edit dusun lain (row-level)', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'dusun_soko', dusun_id: 1 },
      rawTable: 'data_rekap_dawis',
      rawUnitId: 2, // dusun lain
      updates: { jml_kk: 10 },
      allowedTables: ['data_umum', 'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil'],
    });
    expect(res.error).toMatch(/dusun Anda sendiri/i);
  });

  test('kader-dusun edit dusun sendiri → sukses, bulan default ke bulan berjalan', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'dusun_soko', dusun_id: 1 },
      rawTable: 'data_rekap_dawis',
      rawUnitId: 1,
      updates: { jml_kk: '50' },
      allowedTables: ['data_umum', 'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil'],
    });
    expect(res.valid).toBe(true);
    expect(res.isMonthly).toBe(true);
    expect(res.bulan).toBe(new Date().getMonth() + 1);
    expect(res.dusunId).toBe(1);
  });

  test('tabel per-bulan pakai bulan eksplisit', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_bumil',
      rawUnitId: 5,
      updates: { ibu_hamil: '3' },
      rawBulan: 6,
      allowedTables: ADMIN_TABLES,
    });
    expect(res.valid).toBe(true);
    expect(res.bulan).toBe(6);
  });

  test('alias data_kegiatan_warga ter-normalize ke data_rekap_dawis', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_kegiatan_warga',
      rawUnitId: 1,
      updates: { jml_kk: 10 },
      allowedTables: ADMIN_TABLES,
    });
    expect(res.valid).toBe(true);
    expect(res.tableName).toBe('data_rekap_dawis');
  });

  test('keterangan di-treat sebagai text (tidak dipaksa integer)', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_pokja1',
      rawUnitId: 1,
      updates: { keterangan: 'catatan bebas' },
      allowedTables: ADMIN_TABLES,
    });
    expect(res.valid).toBe(true);
    expect(res.sanitizedUpdates.keterangan).toBe('catatan bebas');
  });

  test('updates kosong → error', () => {
    const { validateAiMutation } = require('@/lib/aiMutation');
    const res = validateAiMutation({
      user: { role: 'admin', dusun_id: null },
      rawTable: 'data_pokja1',
      rawUnitId: 1,
      updates: {},
      allowedTables: ADMIN_TABLES,
    });
    expect(res.error).toMatch(/Minimal satu kolom/i);
  });
});
