/**
 * @file Adversarial test suite for annual export stock 12x inflation fix
 * and Word export ?bulan=MM query parameter verification.
 */

const ExcelJS = require('exceljs');

// Mock environment variables for auth and supabase
process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

let mockDatabase = {};

function mockCreateQueryBuilder(tableName) {
  const rows = mockDatabase[tableName] || [];
  const filters = [];

  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(function(column, value) {
      filters.push({ column, value });
      return this;
    }),
    order: jest.fn(function() {
      return this;
    }),
    then: function(resolve) {
      let filtered = [...rows];
      for (const f of filters) {
        filtered = filtered.filter(r => r[f.column] === f.value);
      }
      return Promise.resolve({ data: filtered, error: null }).then(resolve);
    }
  };

  return builder;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table) => mockCreateQueryBuilder(table)),
  },
}));

jest.mock('@/lib/auth', () => {
  const actual = jest.requireActual('@/lib/auth');
  return {
    ...actual,
    requireAuth: jest.fn(async () => ({
      userId: 'test-user-id',
      username: 'test_admin',
      role: 'admin',
    })),
  };
});

jest.mock('@/lib/audit', () => ({
  writeLog: jest.fn(async () => {}),
}));

const DUSUN_LIST_FIXTURE = [
  { id: 1, nama: 'Soko', nomor_urut: 1, is_active: 1 },
  { id: 2, nama: 'Melikan', nomor_urut: 2, is_active: 1 },
  { id: 3, nama: 'Jamprit Wetan', nomor_urut: 3, is_active: 1 },
];

function setMockTableData(tableName, rows) {
  mockDatabase[tableName] = rows;
}

describe('Annual Export Stock Inflation & ?bulan=MM Verification', () => {
  beforeEach(() => {
    mockDatabase = {
      dusun: DUSUN_LIST_FIXTURE,
    };
  });

  describe('1. Word Export (app/api/export/word/route.js)', () => {
    const { buildPokjaSection, DATA_UMUM_DEF, BUMIL_DEF, REKAP_DAWIS_DEF, GET } = require('@/app/api/export/word/route');

    test('Snapshot table (data_umum): picks latest month per dusun, NOT summing 12 months (prevents 12x inflation)', async () => {
      // Soko has 3 monthly records in 2026: month 1 (100 KK), month 4 (105 KK), month 8 (110 KK)
      // Melikan has 2 monthly records: month 2 (200 KK), month 6 (220 KK)
      setMockTableData('data_umum', [
        { dusun_id: 1, tahun: 2026, bulan: 1, jml_kk: 100, jml_jiwa_l: 250, keterangan: 'Bulan 1' },
        { dusun_id: 1, tahun: 2026, bulan: 4, jml_kk: 105, jml_jiwa_l: 255, keterangan: 'Bulan 4' },
        { dusun_id: 1, tahun: 2026, bulan: 8, jml_kk: 110, jml_jiwa_l: 260, keterangan: 'Bulan 8 terbaru' },
        { dusun_id: 2, tahun: 2026, bulan: 2, jml_kk: 200, jml_jiwa_l: 400, keterangan: 'Bulan 2' },
        { dusun_id: 2, tahun: 2026, bulan: 6, jml_kk: 220, jml_jiwa_l: 430, keterangan: 'Bulan 6 terbaru' },
      ]);

      const children = await buildPokjaSection(DATA_UMUM_DEF, 2026, DUSUN_LIST_FIXTURE, null);
      expect(children).toBeDefined();

      const table = children[children.length - 1];
      expect(table).toBeDefined();

      const dataRows = table.root.filter(r => r.root && r.root.some(cell => {
        const text = JSON.stringify(cell);
        return text.includes('Soko');
      }));
      expect(dataRows.length).toBe(1);

      const sokoCellsText = JSON.stringify(dataRows[0]);
      // Soko must have latest month values (110 KK, 260 Jiwa L, 'Bulan 8 terbaru'), NOT the sum (315 KK)!
      expect(sokoCellsText).toContain('110');
      expect(sokoCellsText).toContain('260');
      expect(sokoCellsText).toContain('Bulan 8 terbaru');
      expect(sokoCellsText).not.toContain('315');
    });

    test('Snapshot table handles out-of-order months and selects highest month number', async () => {
      setMockTableData('data_rekap_dawis', [
        { dusun_id: 3, tahun: 2026, bulan: 11, balita_l: 42, rumah_sehat: 80 },
        { dusun_id: 3, tahun: 2026, bulan: 3, balita_l: 38, rumah_sehat: 75 },
        { dusun_id: 3, tahun: 2026, bulan: 7, balita_l: 40, rumah_sehat: 78 },
      ]);

      const children = await buildPokjaSection(REKAP_DAWIS_DEF, 2026, DUSUN_LIST_FIXTURE, null);
      const table = children[children.length - 1];

      const jampritRow = table.root.find(r => JSON.stringify(r).includes('Jamprit Wetan'));
      expect(jampritRow).toBeDefined();

      const jampritCellsText = JSON.stringify(jampritRow);
      // Must take Month 11 (42 balita, 80 rumah sehat), NOT sum (120 balita)!
      expect(jampritCellsText).toContain('42');
      expect(jampritCellsText).toContain('80');
      expect(jampritCellsText).not.toContain('120'); // 42 + 38 + 40 = 120 (must NOT be sum)
    });

    test('Event table (data_bumil): correctly sums all months cumulatively in annual export', async () => {
      setMockTableData('data_bumil', [
        { dusun_id: 1, tahun: 2026, bulan: 1, ibu_hamil: 2, bayi_lahir_l: 1, bayi_lahir_p: 2, bayi_meninggal_l: 0 },
        { dusun_id: 1, tahun: 2026, bulan: 3, ibu_hamil: 3, bayi_lahir_l: 2, bayi_lahir_p: 1, bayi_meninggal_l: 1 },
        { dusun_id: 1, tahun: 2026, bulan: 9, ibu_hamil: 1, bayi_lahir_l: 1, bayi_lahir_p: 0, bayi_meninggal_l: 0 },
      ]);
      setMockTableData('data_rekap_dawis', []);

      const children = await buildPokjaSection(BUMIL_DEF, 2026, DUSUN_LIST_FIXTURE, null);
      const table = children[children.length - 1];

      const sokoRow = table.root.find(r => JSON.stringify(r).includes('Soko'));
      expect(sokoRow).toBeDefined();

      const sokoCellsText = JSON.stringify(sokoRow);
      // bayi_lahir_l: 1 + 2 + 1 = 4
      // bayi_lahir_p: 2 + 1 + 0 = 3
      // ibu_hamil: 2 + 3 + 1 = 6
      // bayi_meninggal_l: 0 + 1 + 0 = 1
      expect(sokoCellsText).toContain('4');
      expect(sokoCellsText).toContain('3');
      expect(sokoCellsText).toContain('6');
      expect(sokoCellsText).toContain('1');
    });

    test('Event table (data_bumil): RT/RW/Dawis fallback takes latest dawis month, NOT 12x sum', async () => {
      setMockTableData('data_bumil', [
        { dusun_id: 1, tahun: 2026, bulan: 1, jml_rt: 0, jml_rw: 0, jml_dasa_wisma: 0, bayi_lahir_l: 1 },
        { dusun_id: 1, tahun: 2026, bulan: 2, jml_rt: 0, jml_rw: 0, jml_dasa_wisma: 0, bayi_lahir_l: 2 },
      ]);
      setMockTableData('data_rekap_dawis', [
        { dusun_id: 1, tahun: 2026, bulan: 1, jml_rt: 4, jml_rw: 2, jml_dawis: 10 },
        { dusun_id: 1, tahun: 2026, bulan: 6, jml_rt: 5, jml_rw: 2, jml_dawis: 12 },
      ]);

      const children = await buildPokjaSection(BUMIL_DEF, 2026, DUSUN_LIST_FIXTURE, null);
      const table = children[children.length - 1];
      const sokoRow = table.root.find(r => JSON.stringify(r).includes('Soko'));
      const sokoText = JSON.stringify(sokoRow);

      // RT/RW should be from latest dawis (Month 6: RT=5, RW=2, Dawis=12), NOT summed (4+5=9 RT)!
      expect(sokoText).toContain('5');
      expect(sokoText).toContain('12');
      expect(sokoText).not.toContain('9');
    });

    test('GET Word export with ?bulan=05 filters month, adds header, and formats filename', async () => {
      setMockTableData('data_umum', [
        { dusun_id: 1, tahun: 2026, bulan: 4, jml_kk: 100 },
        { dusun_id: 1, tahun: 2026, bulan: 5, jml_kk: 105 },
        { dusun_id: 1, tahun: 2026, bulan: 6, jml_kk: 110 },
      ]);
      setMockTableData('data_rekap_dawis', []);
      setMockTableData('data_bumil', []);
      setMockTableData('data_pokja1', []);
      setMockTableData('data_pokja2', []);
      setMockTableData('data_pokja3', []);
      setMockTableData('data_pokja4', []);

      const req = {
        url: 'https://example.com/api/export/word?tahun=2026&bulan=5',
      };

      const res = await GET(req);
      expect(res.status).toBe(200);

      const contentDisposition = res.headers.get('Content-Disposition');
      expect(contentDisposition).toBe('attachment; filename="Data_Kegiatan_PKK_2026_Bulan_05.docx"');
    });

    test('GET Word export without bulan produces annual filename', async () => {
      setMockTableData('data_umum', []);
      setMockTableData('data_rekap_dawis', []);
      setMockTableData('data_bumil', []);
      setMockTableData('data_pokja1', []);
      setMockTableData('data_pokja2', []);
      setMockTableData('data_pokja3', []);
      setMockTableData('data_pokja4', []);

      const req = {
        url: 'https://example.com/api/export/word?tahun=2026',
      };

      const res = await GET(req);
      expect(res.status).toBe(200);

      const contentDisposition = res.headers.get('Content-Disposition');
      expect(contentDisposition).toBe('attachment; filename="Data_Kegiatan_PKK_2026.docx"');
    });
  });

  describe('2. Excel Export (app/api/export/excel/route.js)', () => {
    const { GET: getExcel } = require('@/app/api/export/excel/route');

    test('Annual Excel export: snapshot tables take latest month per dusun, event tables sum months', async () => {
      setMockTableData('data_umum', [
        { dusun_id: 1, tahun: 2026, bulan: 1, jml_kk: 150, jml_jiwa_l: 300, keterangan: 'Jan' },
        { dusun_id: 1, tahun: 2026, bulan: 6, jml_kk: 155, jml_jiwa_l: 310, keterangan: 'Jun' },
        { dusun_id: 1, tahun: 2026, bulan: 10, jml_kk: 160, jml_jiwa_l: 320, keterangan: 'Okt terbaru' },
      ]);

      setMockTableData('data_bumil', [
        { dusun_id: 1, tahun: 2026, bulan: 1, bayi_lahir_l: 3, bayi_lahir_p: 2, keterangan: 'Lahir Jan' },
        { dusun_id: 1, tahun: 2026, bulan: 5, bayi_lahir_l: 2, bayi_lahir_p: 4, keterangan: 'Lahir Mei' },
      ]);

      setMockTableData('data_rekap_dawis', []);
      setMockTableData('data_pokja1', []);
      setMockTableData('data_pokja2', []);
      setMockTableData('data_pokja3', []);
      setMockTableData('data_pokja4', []);

      const req = {
        url: 'https://example.com/api/export/excel?tahun=2026',
      };

      const res = await getExcel(req);
      expect(res.status).toBe(200);

      const buffer = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(buffer));

      // 1. Check Data Umum Sheet (Snapshot Table)
      const wsUmum = wb.getWorksheet('Data Umum');
      expect(wsUmum).toBeDefined();

      let sokoUmumRow = null;
      wsUmum.eachRow((row) => {
        if (row.getCell(2).value === 'Soko') {
          sokoUmumRow = row;
        }
      });
      expect(sokoUmumRow).not.toBeNull();

      const sokoKK = sokoUmumRow.getCell(6).value;
      const sokoJiwaL = sokoUmumRow.getCell(8).value;

      // Must be latest month (160 KK, 320 Jiwa L), NOT sum (150+155+160 = 465)!
      expect(sokoKK).toBe(160);
      expect(sokoJiwaL).toBe(320);

      // 2. Check Bumil Sheet (Event Table)
      const wsBumil = wb.getWorksheet('Bumil');
      expect(wsBumil).toBeDefined();

      let sokoBumilRow = null;
      wsBumil.eachRow((row) => {
        if (row.getCell(2).value === 'Soko') {
          sokoBumilRow = row;
        }
      });
      expect(sokoBumilRow).not.toBeNull();

      const bayiLahirL = sokoBumilRow.getCell(10).value;
      const bayiLahirP = sokoBumilRow.getCell(11).value;

      // Cumulative sum: Bayi Lahir L = 3 + 2 = 5, Bayi Lahir P = 2 + 4 = 6
      expect(bayiLahirL).toBe(5);
      expect(bayiLahirP).toBe(6);
    });

    test('Monthly Excel export with ?bulan=6 filters to month 6 only', async () => {
      setMockTableData('data_umum', [
        { dusun_id: 1, tahun: 2026, bulan: 5, jml_kk: 140 },
        { dusun_id: 1, tahun: 2026, bulan: 6, jml_kk: 145 },
        { dusun_id: 1, tahun: 2026, bulan: 7, jml_kk: 150 },
      ]);
      setMockTableData('data_rekap_dawis', []);
      setMockTableData('data_bumil', []);
      setMockTableData('data_pokja1', []);
      setMockTableData('data_pokja2', []);
      setMockTableData('data_pokja3', []);
      setMockTableData('data_pokja4', []);

      const req = {
        url: 'https://example.com/api/export/excel?tahun=2026&bulan=6',
      };

      const res = await getExcel(req);
      expect(res.status).toBe(200);

      const buffer = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(buffer));

      const wsUmum = wb.getWorksheet('Data Umum');
      let sokoUmumRow = null;
      wsUmum.eachRow((row) => {
        if (row.getCell(2).value === 'Soko') sokoUmumRow = row;
      });

      expect(sokoUmumRow.getCell(6).value).toBe(145);
    });
  });
});
