/**
 * @file Adversarial test suite for audit improvisations, PWA manifest, and export cell resolution.
 * Stress-tests boundary conditions, formula injections, null/empty edge cases, and relational rules.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA QUALITY AUDITOR ADVERSARIAL STRESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('1. Adversarial Cross-Table & Dusun List Consistency (lib/dataQuality.js)', () => {
  const { auditCrossTableConsistency, auditDusunListConsistency } = require('@/lib/dataQuality');

  describe('1.1 Empty, Nullish, and Extreme Edge Cases', () => {
    test('handles empty object parameter without throwing', () => {
      expect(() => auditCrossTableConsistency({})).not.toThrow();
      const issues = auditCrossTableConsistency({});
      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBe(0);
    });

    test('auditDusunListConsistency returns empty array for null, undefined, and non-array inputs', () => {
      expect(auditDusunListConsistency(null)).toEqual([]);
      expect(auditDusunListConsistency(undefined)).toEqual([]);
      expect(auditDusunListConsistency('invalid')).toEqual([]);
      expect(auditDusunListConsistency(12345)).toEqual([]);
      expect(auditDusunListConsistency({})).toEqual([]);
      expect(auditDusunListConsistency([])).toEqual([]);
    });

    test('handles dusun list with sparse or empty objects without throwing', () => {
      const list = [{}, { id: 1 }, { id: 2, dataUmum: {} }];
      const issues = auditDusunListConsistency(list, { tahun: 2026 });
      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBe(0);
    });

    test('handles all null, undefined, and empty string field values cleanly', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: null, jml_jiwa_l: null, jml_jiwa_p: undefined, jml_krt: '' },
        dawis: { jml_kk: null, balita_l: undefined, balita_p: '' },
        bumil: { ibu_hamil: null, bumil_risti: undefined, bumil_pendampingan: '' },
        pokja4: { posyandu_jumlah: null, jml_balita: undefined },
      });
      expect(issues).toEqual([]);
    });

    test('handles negative values safely without raising false positive demographic errors', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: -10, jml_jiwa_l: -5, jml_jiwa_p: -5, jml_krt: -2 },
        dawis: { jml_kk: -10, balita_l: -1, balita_p: -2 },
        bumil: { ibu_hamil: -3, bumil_risti: -1, bumil_pendampingan: -1 },
        pokja4: { posyandu_jumlah: -1 },
      });
      // Negative KK/Jiwa should not trigger KK_EXCEEDS_JIWA because kkUmum > 0 guard protects it
      expect(issues.find((i) => i.code === 'KK_EXCEEDS_JIWA')).toBeUndefined();
      expect(issues.find((i) => i.code === 'KK_WITHOUT_POPULATION')).toBeUndefined();
    });

    test('parses numeric string fields correctly and handles non-numeric strings safely', () => {
      // Valid numeric strings
      const issuesNumeric = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: '100', jml_jiwa_l: '150', jml_jiwa_p: '160', jml_krt: '95' },
        dawis: { jml_kk: '100', balita_l: '10', balita_p: '15' },
        bumil: { ibu_hamil: '8', bumil_risti: '2', bumil_pendampingan: '2' },
      });
      expect(issuesNumeric).toEqual([]);

      // Non-numeric strings (e.g. corrupted input or arbitrary text)
      const issuesNonNumeric = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 'seratus', jml_jiwa_l: 'banyak', jml_jiwa_p: 'N/A' },
        dawis: { jml_kk: 'NaN', balita_l: '???', balita_p: 'none' },
      });
      // Should not throw or crash, treating non-numeric strings as 0
      expect(Array.isArray(issuesNonNumeric)).toBe(true);
    });
  });

  describe('1.2 Demographic Consistency Rules (Data Umum & Dawis)', () => {
    test('BOUNDARY: Jiwa == KK is allowed (1 person per household is valid demographically)', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 10, jml_jiwa_l: 5, jml_jiwa_p: 5 },
      });
      expect(issues.find((i) => i.code === 'KK_EXCEEDS_JIWA')).toBeUndefined();
    });

    test('ANOMALY: Jiwa < KK triggers error KK_EXCEEDS_JIWA', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 10, jml_jiwa_l: 5, jml_jiwa_p: 4 }, // total 9 jiwa < 10 KK
      });
      const issue = issues.find((i) => i.code === 'KK_EXCEEDS_JIWA');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('error');
      expect(issue.metrics.kk).toBe(10);
      expect(issue.metrics.jiwa).toBe(9);
    });

    test('ANOMALY: KK > 0 but total Jiwa is 0 triggers error KK_WITHOUT_POPULATION', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 15, jml_jiwa_l: 0, jml_jiwa_p: 0 },
      });
      const issue = issues.find((i) => i.code === 'KK_WITHOUT_POPULATION');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('error');
      expect(issue.metrics.kk).toBe(15);
      expect(issue.metrics.jiwa).toBe(0);
    });

    test('ANOMALY: KRT > KK triggers warning KRT_EXCEEDS_KK', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 20, jml_jiwa_l: 30, jml_jiwa_p: 30, jml_krt: 25 },
      });
      const issue = issues.find((i) => i.code === 'KRT_EXCEEDS_KK');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('warning');
      expect(issue.metrics.krt).toBe(25);
      expect(issue.metrics.kk).toBe(20);
    });

    test('DISCREPANCY: KK Data Umum vs Rekap Dawis assigns warning for diff > 5 and info for diff <= 5', () => {
      // Large difference (> 5)
      const issuesLarge = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 100, jml_jiwa_l: 150, jml_jiwa_p: 150 },
        dawis: { jml_kk: 110 }, // diff = 10
      });
      const issueLarge = issuesLarge.find((i) => i.code === 'CROSS_KK_DISCREPANCY');
      expect(issueLarge).toBeDefined();
      expect(issueLarge.severity).toBe('warning');
      expect(issueLarge.metrics.diff).toBe(10);

      // Minor difference (<= 5)
      const issuesSmall = auditCrossTableConsistency({
        dusunId: 1,
        dusunNama: 'Dusun Soko',
        tahun: 2026,
        dataUmum: { jml_kk: 100, jml_jiwa_l: 150, jml_jiwa_p: 150 },
        dawis: { jml_kk: 103 }, // diff = 3
      });
      const issueSmall = issuesSmall.find((i) => i.code === 'CROSS_KK_DISCREPANCY');
      expect(issueSmall).toBeDefined();
      expect(issueSmall.severity).toBe('info');
      expect(issueSmall.metrics.diff).toBe(3);
    });
  });

  describe('1.3 Balita, Posyandu, and Mortality Consistency Rules', () => {
    test('ANOMALY: Balita mortality exceeds living balita population triggers error BALITA_DEATH_EXCEEDS_TOTAL', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 2,
        dusunNama: 'Dusun Melikan',
        tahun: 2026,
        dawis: { balita_l: 2, balita_p: 1 }, // total 3 balita
        bumil: { balita_meninggal_l: 3, balita_meninggal_p: 2 }, // total 5 balita meninggal
      });
      const issue = issues.find((i) => i.code === 'BALITA_DEATH_EXCEEDS_TOTAL');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('error');
      expect(issue.metrics.balitaMeninggal).toBe(5);
      expect(issue.metrics.balitaDawis).toBe(3);
    });

    test('BOUNDARY: Balita mortality equal to living balita population does not trigger error', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 2,
        dusunNama: 'Dusun Melikan',
        tahun: 2026,
        dawis: { balita_l: 2, balita_p: 2 }, // total 4
        bumil: { balita_meninggal_l: 2, balita_meninggal_p: 2 }, // total 4
      });
      expect(issues.find((i) => i.code === 'BALITA_DEATH_EXCEEDS_TOTAL')).toBeUndefined();
    });

    test('ANOMALY: Active Posyandu with 0 balita reported in Dawis triggers warning POSYANDU_ACTIVE_NO_BALITA', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 3,
        dusunNama: 'Dusun Belikurip',
        tahun: 2026,
        pokja4: { posyandu_jumlah: 2 },
        dawis: { balita_l: 0, balita_p: 0, jml_kk: 45 },
      });
      const issue = issues.find((i) => i.code === 'POSYANDU_ACTIVE_NO_BALITA');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('warning');
      expect(issue.metrics.posyandu).toBe(2);
      expect(issue.metrics.balitaDawis).toBe(0);
    });

    test('ANOMALY: Pokja IV jml_balita discrepancy vs Dawis triggers warning BALITA_COUNT_MISMATCH', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 3,
        dusunNama: 'Dusun Belikurip',
        tahun: 2026,
        pokja4: { jml_balita: 50 },
        dawis: { balita_l: 25, balita_p: 20 }, // total 45
      });
      const issue = issues.find((i) => i.code === 'BALITA_COUNT_MISMATCH');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('warning');
      expect(issue.metrics.balitaPokja4).toBe(50);
      expect(issue.metrics.balitaDawis).toBe(45);
    });
  });

  describe('1.4 Maternal Health & Vital Records Consistency Rules', () => {
    test('ANOMALY: Ibu Hamil in Bumil vs Dawis mismatch triggers warning BUMIL_DISCREPANCY', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 4,
        dusunNama: 'Dusun Klerong',
        tahun: 2026,
        bumil: { ibu_hamil: 12 },
        dawis: { ibu_hamil: 10 },
      });
      const issue = issues.find((i) => i.code === 'BUMIL_DISCREPANCY');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('warning');
      expect(issue.metrics.bumilTable).toBe(12);
      expect(issue.metrics.bumilDawis).toBe(10);
    });

    test('ANOMALY: Bumil Risti exceeds total Ibu Hamil triggers error RISTI_EXCEEDS_TOTAL', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 4,
        dusunNama: 'Dusun Klerong',
        tahun: 2026,
        bumil: { ibu_hamil: 5, bumil_risti: 8 },
      });
      const issue = issues.find((i) => i.code === 'RISTI_EXCEEDS_TOTAL');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('error');
      expect(issue.metrics.bumilRisti).toBe(8);
      expect(issue.metrics.bumilTable).toBe(5);
    });

    test('ANOMALY: Unaccompanied Bumil Risti triggers warning RISTI_UNACCOMPANIED', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 4,
        dusunNama: 'Dusun Klerong',
        tahun: 2026,
        bumil: { ibu_hamil: 10, bumil_risti: 5, bumil_pendampingan: 2 },
      });
      const issue = issues.find((i) => i.code === 'RISTI_UNACCOMPANIED');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('warning');
      expect(issue.metrics.gap).toBe(3);
    });

    test('INFORMATION: Akte Lahir exceeding current month births triggers info AKTE_EXCEEDS_BIRTH', () => {
      const issues = auditCrossTableConsistency({
        dusunId: 4,
        dusunNama: 'Dusun Klerong',
        tahun: 2026,
        bumil: { bayi_lahir_l: 1, bayi_lahir_p: 1, akte_l: 3, akte_p: 2 }, // births: 2, akte: 5
      });
      const issue = issues.find((i) => i.code === 'AKTE_EXCEEDS_BIRTH');
      expect(issue).toBeDefined();
      expect(issue.severity).toBe('info');
      expect(issue.metrics.akteLahir).toBe(5);
      expect(issue.metrics.bayiLahir).toBe(2);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PWA MANIFEST METADATA VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
describe('2. PWA Web App Manifest (app/manifest.js)', () => {
  const manifestFn = require('@/app/manifest').default;

  test('default export is a function that returns a valid manifest object', () => {
    expect(typeof manifestFn).toBe('function');
    const data = manifestFn();
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });

  test('manifest contains required PWA metadata properties with correct branding', () => {
    const data = manifestFn();

    expect(data.name).toBe('Lumbung Data PKK Desa Belikurip');
    expect(data.short_name).toBe('Lumbung Data PKK');
    expect(data.start_url).toBe('/dashboard');
    expect(data.display).toBe('standalone');
    expect(data.theme_color).toBe('#047857'); // Official emerald palette
    expect(data.background_color).toBe('#064e3b'); // Dark emerald
    expect(typeof data.description).toBe('string');
    expect(data.description).toContain('Belikurip');
  });

  test('manifest defines valid responsive icons (192, 512, and scalable vector)', () => {
    const { icons } = manifestFn();
    expect(Array.isArray(icons)).toBe(true);
    expect(icons.length).toBeGreaterThanOrEqual(3);

    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(sizes).toContain('any');

    icons.forEach((icon) => {
      expect(typeof icon.src).toBe('string');
      expect(icon.src.startsWith('/')).toBe(true);
      expect(typeof icon.type).toBe('string');
      expect(['image/png', 'image/svg+xml']).toContain(icon.type);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPORT CELL RESOLUTION & FORMULA INJECTION SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────
describe('3. Report Cell Resolution & Formula Injection Sanitization', () => {
  let sanitizeCellText;
  let resolveCellValue;

  beforeAll(() => {
    // Read and compile the exact functions directly from app/api/reports/build/route.js
    const routeCode = fs.readFileSync(
      path.join(process.cwd(), 'app/api/reports/build/route.js'),
      'utf8'
    );
    const m1 = routeCode.match(/function sanitizeCellText[\s\S]*?\n\}/);
    const m2 = routeCode.match(/function resolveCellValue[\s\S]*?\n\}/);
    if (!m1 || !m2) {
      throw new Error('Unable to extract sanitizeCellText or resolveCellValue from route.js');
    }

    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(m1[0] + '\n' + m2[0], sandbox);
    sanitizeCellText = sandbox.sanitizeCellText;
    resolveCellValue = sandbox.resolveCellValue;
  });

  describe('3.1 Formula Injection Triggers in sanitizeCellText', () => {
    test('neutralizes equals formula trigger "=1+1" with single-quote prefix', () => {
      expect(sanitizeCellText('=1+1')).toBe("'=1+1");
      expect(sanitizeCellText('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCellText('=cmd|\'/C calc\'!A0')).toBe("'=cmd|'/C calc'!A0");
    });

    test('neutralizes @ formula trigger "@SUM" with single-quote prefix', () => {
      expect(sanitizeCellText('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    });

    test('neutralizes plus formula trigger "+test" with single-quote prefix', () => {
      expect(sanitizeCellText('+test')).toBe("'+test");
      expect(sanitizeCellText('+1+1')).toBe("'+1+1");
    });

    test('neutralizes tab and carriage return formula triggers', () => {
      expect(sanitizeCellText('\t=1+1')).toBe("'\t=1+1");
      expect(sanitizeCellText('\r=1+1')).toBe("'\r=1+1");
    });

    test('preserves legitimate negative numbers as numbers/numeric strings without prefixing', () => {
      // Legit numbers like -5, -100, -3.14 must remain numeric and NOT be prefixed with a quote
      expect(sanitizeCellText(-5)).toBe(-5);
      expect(sanitizeCellText('-5')).toBe('-5');
      expect(sanitizeCellText('-100')).toBe('-100');
      expect(sanitizeCellText('-3.14')).toBe('-3.14');
    });

    test('neutralizes compound negative formula expressions like "-10+2" or "-cmd"', () => {
      // Non-numeric strings starting with '-' are formula triggers
      expect(sanitizeCellText('-10+2')).toBe("'-10+2");
      expect(sanitizeCellText('-cmd|something')).toBe("'-cmd|something");
    });

    test('handles nullish and empty values gracefully', () => {
      expect(sanitizeCellText(null)).toBe('');
      expect(sanitizeCellText(undefined)).toBe('');
      expect(sanitizeCellText('')).toBe('');
    });

    test('preserves normal benign strings without modification', () => {
      expect(sanitizeCellText('Dusun Soko')).toBe('Dusun Soko');
      expect(sanitizeCellText('Kegiatan PKK Berjalan Baik')).toBe('Kegiatan PKK Berjalan Baik');
      expect(sanitizeCellText('100')).toBe('100');
    });
  });

  describe('3.2 resolveCellValue Text/Numeric Resolution and NaN Prevention', () => {
    test('explicit text column (col.type === "text") never returns NaN or casts to number', () => {
      const col = { key: 'keterangan', type: 'text' };

      const resString = resolveCellValue('Catatan penting', col);
      expect(resString.isText).toBe(true);
      expect(resString.textVal).toBe('Catatan penting');
      expect(resString.rawText).toBe('Catatan penting');
      expect(resString.numVal).toBeUndefined();

      const resFormula = resolveCellValue('=1+1', col);
      expect(resFormula.isText).toBe(true);
      expect(resFormula.textVal).toBe("'=1+1");
      expect(resFormula.rawText).toBe('=1+1');

      const resNull = resolveCellValue(null, col);
      expect(resNull.isText).toBe(true);
      expect(resNull.textVal).toBe('');
      expect(resNull.rawText).toBe('');

      const resUndefined = resolveCellValue(undefined, col);
      expect(resUndefined.isText).toBe(true);
      expect(resUndefined.textVal).toBe('');
      expect(resUndefined.rawText).toBe('');
    });

    test('numeric column with valid numbers or numeric strings resolves cleanly to number', () => {
      const col = { key: 'jml_kk' };

      const resNum = resolveCellValue(42, col);
      expect(resNum.isText).toBe(false);
      expect(resNum.numVal).toBe(42);
      expect(resNum.rawText).toBe('42');

      const resNumStr = resolveCellValue('125', col);
      expect(resNumStr.isText).toBe(false);
      expect(resNumStr.numVal).toBe(125);
      expect(resNumStr.rawText).toBe('125');

      const resNull = resolveCellValue(null, col);
      expect(resNull.isText).toBe(false);
      expect(resNull.numVal).toBe(0);
      expect(resNull.rawText).toBe('0');

      const resEmpty = resolveCellValue('', col);
      expect(resEmpty.isText).toBe(false);
      expect(resEmpty.numVal).toBe(0);
      expect(resEmpty.rawText).toBe('0');
    });

    test('numeric column with corrupted string input gracefully falls back to text and never returns NaN', () => {
      const col = { key: 'jml_jiwa_l' };

      const resCorrupted = resolveCellValue('data belum ada', col);
      // isNanText is true -> falls back to text representation, preventing NaN
      expect(resCorrupted.isText).toBe(true);
      expect(resCorrupted.textVal).toBe('data belum ada');
      expect(resCorrupted.rawText).toBe('data belum ada');
      expect(Number.isNaN(resCorrupted.numVal)).toBe(false);

      const resCorruptedFormula = resolveCellValue('=SUM(B1:B5)', col);
      expect(resCorruptedFormula.isText).toBe(true);
      expect(resCorruptedFormula.textVal).toBe("'=SUM(B1:B5)");
      expect(resCorruptedFormula.rawText).toBe('=SUM(B1:B5)');
      expect(Number.isNaN(resCorruptedFormula.numVal)).toBe(false);
    });
  });
});
