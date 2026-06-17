/**
 * @file Test copy/string user-facing — pastikan tidak ada referensi "desa"
 * sebagai unit data yang seharusnya jadi "dusun".
 *
 * "Desa Belikurip" tetap diizinkan karena itu nama organisasi/wilayah.
 */

const path = require('path');
const fs = require('fs');

function readFile(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('app/page.js — welcome page tidak memakai unit "desa"', () => {
  const content = readFile('app/page.js');

  test('tidak ada label "Desa Aktif"', () => {
    expect(content).not.toMatch(/Desa Aktif/);
  });

  test('tidak ada label "Desa Lengkap"', () => {
    expect(content).not.toMatch(/Desa Lengkap/);
  });

  test('tidak ada frasa "per desa"', () => {
    expect(content).not.toMatch(/per desa\b/i);
  });

  test('tidak ada frasa "antar desa"', () => {
    expect(content).not.toMatch(/antar desa\b/i);
  });

  test('label canonical "Dusun Aktif" / "Dusun Lengkap" hadir', () => {
    expect(content).toMatch(/Dusun Aktif|Dusun Lengkap/);
  });

  test('"Desa Belikurip" sebagai nama organisasi tetap boleh ada', () => {
    expect(content).toMatch(/Desa Belikurip/);
  });
});

describe('app/dashboard/reports/page.js — Report Builder pakai "dusun"', () => {
  const content = readFile('app/dashboard/reports/page.js');

  test('tidak ada heading "Pilih desa"', () => {
    expect(content).not.toMatch(/Pilih desa\b/i);
  });

  test('tidak ada copy "Semua desa aktif"', () => {
    expect(content).not.toMatch(/Semua desa aktif/i);
  });

  test('tidak ada copy "desa terpilih"', () => {
    expect(content).not.toMatch(/desa terpilih/i);
  });

  test('field label "Desa" sudah berganti jadi "Dusun"', () => {
    // Field label = `<Field label="Desa" ...>` — harus jadi "Dusun"
    expect(content).not.toMatch(/label="Desa"/);
    expect(content).toMatch(/label="Dusun"/);
  });

  test('stepper memakai label "Dusun & Kolom"', () => {
    expect(content).toMatch(/Dusun & Kolom/);
    expect(content).not.toMatch(/'Desa & Kolom'|"Desa & Kolom"/);
  });
});

describe('components/AiChatBubble.js — prompt example pakai "dusun"', () => {
  const content = readFile('components/AiChatBubble.js');

  test('tidak ada prompt contoh "per desa"', () => {
    expect(content).not.toMatch(/per desa\b/i);
  });

  test('tidak ada prompt contoh "Desa mana"', () => {
    expect(content).not.toMatch(/Desa mana\b/i);
  });

  test('header tabel preview import memakai "Dusun"', () => {
    expect(content).toMatch(/>Dusun</);
    expect(content).not.toMatch(/>Desa</);
  });
});

describe('components/OnboardingTour.jsx — tour copy pakai "dusun"', () => {
  const content = readFile('components/OnboardingTour.jsx');

  test('tidak ada body "baris desa"', () => {
    expect(content).not.toMatch(/baris desa\b/i);
  });

  test('tidak ada body "per desa"', () => {
    expect(content).not.toMatch(/per desa\b/i);
  });

  test('body memakai "per dusun" atau "baris dusun"', () => {
    expect(content).toMatch(/per dusun|baris dusun/i);
  });
});

describe('app/publik/page.js — portal publik pakai "dusun"', () => {
  const content = readFile('app/publik/page.js');

  test('KPI memakai "Dusun" sebagai unit data', () => {
    expect(content).toMatch(/Total Dusun|Dusun Lengkap/);
  });

  test('tidak ada label "Total Desa" sebagai KPI', () => {
    expect(content).not.toMatch(/label:\s*'Total Desa'/);
    expect(content).not.toMatch(/label:\s*"Total Desa"/);
  });

  test('tidak ada heading "Per Desa" untuk tabel unit', () => {
    expect(content).not.toMatch(/>Per Desa</);
  });
});

describe('app/dashboard/page.js — dashboard pakai "dusun"', () => {
  const content = readFile('app/dashboard/page.js');

  test('matrix kelengkapan header pakai "Dusun"', () => {
    expect(content).toMatch(/>Dusun</);
  });

  test('KPI label "Dusun Lengkap" hadir', () => {
    expect(content).toMatch(/'Dusun Lengkap'|"Dusun Lengkap"/);
  });

  test('confirm export pakai "dusun"', () => {
    expect(content).not.toMatch(/desa perlu dicek|desa belum lengkap/i);
    expect(content).toMatch(/dusun perlu dicek|dusun belum lengkap/i);
  });
});

describe('app/dashboard/admin/page.js — panel admin pakai label "Dusun"', () => {
  const content = readFile('app/dashboard/admin/page.js');

  test('tab admin memakai label "Dusun"', () => {
    // TABS array: { id: 'desa', label: 'Dusun', ... }
    expect(content).toMatch(/label: 'Dusun'/);
  });

  test('audit log header pakai "Dusun"', () => {
    const logsContent = readFile('app/dashboard/admin/_components/LogsTab.jsx');
    expect(logsContent).toMatch(/<th>Dusun<\/th>/);
  });

  test('subtitle admin pakai "dusun"', () => {
    expect(content).toMatch(/Kelola pengguna, dusun/i);
  });
});

describe('Reset script EXECUTE_MANUALLY tersedia', () => {
  test('file supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql ada', () => {
    expect(
      fs.existsSync(
        path.join(process.cwd(), 'supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql')
      )
    ).toBe(true);
  });

  test('script reset memuat warning, panduan backup, & block TRUNCATE aktif', () => {
    const sql = readFile('supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql');
    expect(sql).toMatch(/PERHATIAN/i);
    expect(sql).toMatch(/SCRIPT DESTRUKTIF|destruktif/i);
    expect(sql).toMatch(/Free Plan/i);
    expect(sql).toMatch(/pg_dump/);
    expect(sql).toMatch(/CSV/);
    expect(sql).toMatch(/Excel/);
    expect(sql).toMatch(/^TRUNCATE\s+TABLE/im);
  });

  test('script reset tidak truncate master tables (dusun/users/report_years)', () => {
    const sql = readFile('supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql');
    // Cari truncate statement aktif (uncommented).
    const truncateBlock = sql.match(/TRUNCATE\s+TABLE([\s\S]*?);/im);
    expect(truncateBlock).toBeTruthy();
    const tablesText = truncateBlock[1];
    expect(tablesText).not.toMatch(/\bdusun\b/);
    expect(tablesText).not.toMatch(/\busers\b/);
    expect(tablesText).not.toMatch(/\breport_years\b/);
    expect(tablesText).not.toMatch(/\btable_schemas\b/);
    expect(tablesText).not.toMatch(/\btable_column_overrides\b/);
    expect(tablesText).not.toMatch(/\breport_periods\b/);
  });

  test('script reset menyertakan query verifikasi setelah TRUNCATE', () => {
    const sql = readFile('supabase_reset_operational_data_to_zero_EXECUTE_MANUALLY.sql');
    expect(sql).toMatch(/SELECT[\s\S]+COUNT\(\*\)[\s\S]+FROM\s+data_umum/i);
    expect(sql).toMatch(/SELECT[\s\S]+COUNT\(\*\)[\s\S]+FROM\s+dusun/i);
    expect(sql).toMatch(/SELECT[\s\S]+COUNT\(\*\)[\s\S]+FROM\s+users/i);
  });
});
