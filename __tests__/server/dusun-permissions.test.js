/**
 * @file Row-level permission tests untuk role kader-dusun.
 * Memastikan canWriteRow enforce scope `own_dusun` dengan benar.
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

describe('canWrite — dusun roles', () => {
  test('dusun_soko boleh write ke data_rekap_dawis', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('dusun_soko', 'data_rekap_dawis')).toBe(true);
  });

  test('dusun_soko boleh write ke alias data_kegiatan_warga (backward compat)', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('dusun_soko', 'data_kegiatan_warga')).toBe(true);
  });

  test('dusun_soko boleh write ke data_umum & data_bumil (scope expanded)', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('dusun_soko', 'data_umum')).toBe(true);
    expect(canWrite('dusun_soko', 'data_bumil')).toBe(true);
  });

  test('dusun_soko TIDAK boleh write ke tabel pokja', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('dusun_soko', 'data_pokja1')).toBe(false);
    expect(canWrite('dusun_soko', 'data_pokja2')).toBe(false);
    expect(canWrite('dusun_soko', 'data_pokja3')).toBe(false);
    expect(canWrite('dusun_soko', 'data_pokja4')).toBe(false);
  });

  test('semua 9 role dusun didefinisikan dengan 4 tabel + 1 alias', () => {
    const { ROLE_PERMISSIONS } = require('@/lib/auth');
    const expected = [
      'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
      'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan',
    ];
    for (const role of expected) {
      const perms = ROLE_PERMISSIONS[role];
      expect(perms).toContain('data_umum');
      expect(perms).toContain('data_rekap_dawis');
      expect(perms).toContain('data_kegiatan_warga');
      expect(perms).toContain('data_bumil');
      // Pokja tetap dilarang
      expect(perms).not.toContain('data_pokja1');
      expect(perms).not.toContain('data_pokja2');
      expect(perms).not.toContain('data_pokja3');
      expect(perms).not.toContain('data_pokja4');
    }
  });
});

describe('canWriteRow — row-level enforcement', () => {
  test('admin boleh write ke semua row (scope all)', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'admin', dusun_id: null };
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 1 })).toBe(true);
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 99 })).toBe(true);
    expect(canWriteRow(user, 'data_pokja1', { dusun_id: 1 })).toBe(true);
  });

  test('dusun_soko (dusun_id=1) hanya boleh write row dusun_id=1 di rekap_dawis', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'dusun_soko', dusun_id: 1 };
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 1 })).toBe(true);
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 2 })).toBe(false);
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 9 })).toBe(false);
  });

  test('dusun_soko boleh write data_umum/data_bumil tapi hanya untuk dusun-nya sendiri', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'dusun_soko', dusun_id: 1 };
    expect(canWriteRow(user, 'data_umum', { dusun_id: 1 })).toBe(true);
    expect(canWriteRow(user, 'data_umum', { dusun_id: 2 })).toBe(false);
    expect(canWriteRow(user, 'data_bumil', { dusun_id: 1 })).toBe(true);
    expect(canWriteRow(user, 'data_bumil', { dusun_id: 5 })).toBe(false);
  });

  test('dusun_belikurip (dusun_id=5) di-reject saat coba edit data_pokja1', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'dusun_belikurip', dusun_id: 5 };
    expect(canWriteRow(user, 'data_pokja1', { dusun_id: 5 })).toBe(false);
  });

  test('kader-dusun tanpa dusun_id assignment di-reject', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'dusun_soko', dusun_id: null };
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 1 })).toBe(false);
  });

  test('pokja1 (scope all) boleh write ke semua dusun di data_pokja1', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'pokja1', dusun_id: null };
    expect(canWriteRow(user, 'data_pokja1', { dusun_id: 1 })).toBe(true);
    expect(canWriteRow(user, 'data_pokja1', { dusun_id: 9 })).toBe(true);
  });

  test('user (scope none) tidak boleh write ke mana pun', () => {
    const { canWriteRow } = require('@/lib/auth');
    const user = { role: 'user', dusun_id: null };
    expect(canWriteRow(user, 'data_rekap_dawis', { dusun_id: 1 })).toBe(false);
    expect(canWriteRow(user, 'data_pokja1', { dusun_id: 1 })).toBe(false);
  });
});

describe('normalizeTableName', () => {
  test('data_kegiatan_warga normalize ke data_rekap_dawis', () => {
    const { normalizeTableName } = require('@/lib/auth');
    expect(normalizeTableName('data_kegiatan_warga')).toBe('data_rekap_dawis');
  });

  test('canonical name passthrough', () => {
    const { normalizeTableName } = require('@/lib/auth');
    expect(normalizeTableName('data_rekap_dawis')).toBe('data_rekap_dawis');
    expect(normalizeTableName('data_pokja1')).toBe('data_pokja1');
  });
});

describe('ROLE_TO_DUSUN_NAME mapping', () => {
  test('mapping role kader-dusun → nama dusun lengkap', () => {
    const { ROLE_TO_DUSUN_NAME } = require('@/lib/auth');
    expect(ROLE_TO_DUSUN_NAME.dusun_soko).toBe('Soko');
    expect(ROLE_TO_DUSUN_NAME.dusun_jamprit_wetan).toBe('Jamprit Wetan');
    expect(ROLE_TO_DUSUN_NAME.dusun_banyuripan).toBe('Banyuripan');
    expect(Object.keys(ROLE_TO_DUSUN_NAME)).toHaveLength(9);
  });
});

describe('DUSUN_LIST', () => {
  test('9 dusun Belikurip dengan urutan resmi', () => {
    const { DUSUN_LIST } = require('@/lib/dusun');
    expect(DUSUN_LIST).toEqual([
      'Soko', 'Melikan', 'Jamprit Wetan', 'Jamprit Kulon',
      'Belikurip', 'Pagersari', 'Klerong', 'Tanjung', 'Banyuripan',
    ]);
  });
});
