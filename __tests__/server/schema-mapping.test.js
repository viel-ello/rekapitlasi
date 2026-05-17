/**
 * @file Schema mapping tests untuk DATA_PAGES & SHEET_MAP konsistensi.
 * Memastikan kolom baru (akte_l, akte_p, keterangan, tiga_buta, dll) ada di semua tempat yang relevan.
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

describe('DATA_PAGES — kolom baru migrasi v5', () => {
  test('Pokja II punya kolom Pokja II baru (Annex C)', () => {
    const { DATA_PAGES } = require('@/lib/dataPages');
    const keys = DATA_PAGES.pokja2.columns.map((c) => c.key);
    expect(keys).toContain('jml_warga_3_buta');
    expect(keys).toContain('kf_klp');
    expect(keys).toContain('kf_wrg');
    expect(keys).toContain('paud_sejenis');
    expect(keys).toContain('bkb_klp');
    expect(keys).toContain('bkb_jml_ibu_peserta');
    expect(keys).toContain('bkb_ape_set_a');
    expect(keys).toContain('bkb_ape_set_b');
    expect(keys).toContain('kader_tutor_kf');
    expect(keys).toContain('kader_tutor_paud');
    expect(keys).toContain('kader_bkb');
    expect(keys).toContain('yg_dilatih_lp3pkk');
    expect(keys).toContain('yg_dilatih_tp3pkk');
    expect(keys).toContain('yg_dilatih_damaspkk');
    expect(keys).toContain('keterangan');
  });

  test('Pokja II tidak lagi punya kolom legacy', () => {
    const { DATA_PAGES } = require('@/lib/dataPages');
    const keys = DATA_PAGES.pokja2.columns.map((c) => c.key);
    expect(keys).not.toContain('rumah_dilan');
    expect(keys).not.toContain('kampung_mandiri');
    expect(keys).not.toContain('usaha_mikro');
    expect(keys).not.toContain('toko_pkk');
    expect(keys).not.toContain('koperasi_belum_bh_kop');
    expect(keys).not.toContain('koperasi_belum_bh_angg');
  });

  test('Bumil punya akte_l, akte_p, keterangan', () => {
    const { DATA_PAGES } = require('@/lib/dataPages');
    const keys = DATA_PAGES.bumil.columns.map((c) => c.key);
    expect(keys).toContain('akte_l');
    expect(keys).toContain('akte_p');
    expect(keys).toContain('keterangan');
  });

  test('Pokja I/III/IV semua punya kolom keterangan', () => {
    const { DATA_PAGES } = require('@/lib/dataPages');
    expect(DATA_PAGES.pokja1.columns.map((c) => c.key)).toContain('keterangan');
    expect(DATA_PAGES.pokja3.columns.map((c) => c.key)).toContain('keterangan');
    expect(DATA_PAGES.pokja4.columns.map((c) => c.key)).toContain('keterangan');
  });

  test('Rekap Dawis (rename dari Kegiatan Warga) punya kolom baru', () => {
    const { DATA_PAGES } = require('@/lib/dataPages');
    expect(DATA_PAGES.rekapDawis).toBeDefined();
    expect(DATA_PAGES.rekapDawis.tableName).toBe('data_rekap_dawis');
    expect(DATA_PAGES.rekapDawis.slug).toBe('rekap-dawis');
    const keys = DATA_PAGES.rekapDawis.columns.map((c) => c.key);
    expect(keys).toContain('tiga_buta');
    expect(keys).toContain('berkebutuhan_khusus');
    expect(keys).not.toContain('jml_dusun');
    expect(keys).not.toContain('tiga_buta_l');
    expect(keys).not.toContain('tiga_buta_p');
    expect(keys).not.toContain('ikut_industri');
  });

  test('DATA_PAGES.kegiatanWarga adalah alias non-enumerable ke rekapDawis', () => {
    const { DATA_PAGES } = require('@/lib/dataPages');
    // Alias accessible
    expect(DATA_PAGES.kegiatanWarga).toBe(DATA_PAGES.rekapDawis);
    // Tidak duplikat di Object.values (non-enumerable)
    const tableNames = Object.values(DATA_PAGES).map((p) => p.tableName);
    const rekapCount = tableNames.filter((t) => t === 'data_rekap_dawis').length;
    expect(rekapCount).toBe(1);
  });
});

describe('SHEET_MAP — sheet mapping migrasi v5', () => {
  test('REKAP DAWIS sheet didefinisikan dengan tabel data_rekap_dawis', () => {
    const { SHEET_MAP } = require('@/lib/excel/sheetMap');
    expect(SHEET_MAP['REKAP DAWIS']).toBeDefined();
    expect(SHEET_MAP['REKAP DAWIS'].table).toBe('data_rekap_dawis');
  });

  test('KEGIATAN WARGA sheet alias backward-compat ke data_rekap_dawis', () => {
    const { SHEET_MAP } = require('@/lib/excel/sheetMap');
    expect(SHEET_MAP['KEGIATAN WARGA']).toBeDefined();
    expect(SHEET_MAP['KEGIATAN WARGA'].table).toBe('data_rekap_dawis');
  });

  test('POKJA II keys tidak include legacy & include kolom baru', () => {
    const { SHEET_MAP } = require('@/lib/excel/sheetMap');
    const keys = SHEET_MAP['POKJA II'].keys;
    expect(keys).toContain('jml_warga_3_buta');
    expect(keys).toContain('bkb_ape_set_a');
    expect(keys).toContain('keterangan');
    expect(keys).not.toContain('usaha_mikro');
    expect(keys).not.toContain('toko_pkk');
  });

  test('DATA BUMIL keys include akte_l, akte_p, keterangan', () => {
    const { SHEET_MAP } = require('@/lib/excel/sheetMap');
    const keys = SHEET_MAP['DATA BUMIL'].keys;
    expect(keys).toContain('akte_l');
    expect(keys).toContain('akte_p');
    expect(keys).toContain('keterangan');
  });
});
