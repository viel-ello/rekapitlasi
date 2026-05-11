/**
 * @file Data quality tests
 * Verifies completeness status and operational table catalog.
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  jest.resetModules();
});

describe('data quality completeness', () => {
  test('marks missing row as belum_lengkap', () => {
    const { evaluateRecordCompleteness } = require('@/lib/dataQuality');
    const result = evaluateRecordCompleteness(null, ['jml_kk', 'jml_jiwa_l']);

    expect(result.status).toBe('belum_lengkap');
  });

  test('marks complete numeric row as lengkap', () => {
    const { evaluateRecordCompleteness } = require('@/lib/dataQuality');
    const result = evaluateRecordCompleteness({ jml_kk: 10, jml_jiwa_l: 20 }, ['jml_kk', 'jml_jiwa_l']);

    expect(result.status).toBe('lengkap');
  });

  test('marks negative values as perlu_dicek', () => {
    const { evaluateRecordCompleteness } = require('@/lib/dataQuality');
    const result = evaluateRecordCompleteness({ jml_kk: -1, jml_jiwa_l: 20 }, ['jml_kk', 'jml_jiwa_l']);

    expect(result.status).toBe('perlu_dicek');
    expect(result.issues.errors).toBe(1);
  });

  test('marks large year-over-year spike as perlu_dicek', () => {
    const { evaluateRecordCompleteness } = require('@/lib/dataQuality');
    const result = evaluateRecordCompleteness(
      { jml_kk: 100 },
      ['jml_kk'],
      { jml_kk: 20 }
    );

    expect(result.status).toBe('perlu_dicek');
    expect(result.issues.warnings).toBe(1);
  });
});

describe('operational table catalog', () => {
  test('includes kegiatan warga keys for templates and import', () => {
    const { getTableKeys, isKnownOperationalTable } = require('@/lib/dataQuality');

    expect(isKnownOperationalTable('data_kegiatan_warga')).toBe(true);
    expect(getTableKeys('data_kegiatan_warga')).toContain('jml_kk');
    expect(getTableKeys('data_kegiatan_warga')).toContain('jkn_bpjs');
  });

  test('sheet import permissions include tables allowed by app auth', () => {
    const { ROLE_TABLE_MAP } = require('@/lib/excel/sheetMap');

    expect(ROLE_TABLE_MAP.admin).toContain('data_kegiatan_warga');
    expect(ROLE_TABLE_MAP.sekretaris).toContain('data_kegiatan_warga');
  });
});
