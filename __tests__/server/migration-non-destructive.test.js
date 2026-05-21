/**
 * @file Test migration SQL production tidak melakukan operasi destruktif aktif
 * tanpa konfirmasi manual.
 *
 * Migration yang dijalankan langsung di production (v5.sql, v6.sql) HARUS bebas
 * dari TRUNCATE atau DROP COLUMN aktif. Operasi destruktif harus dipindah ke
 * file terpisah (v5_destructive.sql, v6_reset.sql) yang dijalankan manual.
 */

const path = require('path');
const fs = require('fs');

function readFile(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

/**
 * Strip baris yang di-comment supaya regex match hanya pada SQL aktif.
 * Komentar SQL: baris yang dimulai dengan `--` (setelah whitespace).
 */
function stripCommentLines(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
}

describe('supabase_schema_updates_v5.sql — non-destructive default', () => {
  const sql = readFile('supabase_schema_updates_v5.sql');
  const active = stripCommentLines(sql);

  test('Tidak ada TRUNCATE aktif', () => {
    expect(active).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);
    expect(active).not.toMatch(/\bTRUNCATE\b\s+\w/i);
  });

  test('Tidak ada DROP COLUMN aktif (legacy Pokja II / Rekap Dawis)', () => {
    expect(active).not.toMatch(/DROP\s+COLUMN.*rumah_dilan/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*kampung_mandiri/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*usaha_mikro/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*toko_pkk/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*koperasi_belum_bh/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*tiga_buta_l/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*tiga_buta_p/i);
    expect(active).not.toMatch(/DROP\s+COLUMN.*ikut_industri/i);
  });

  test('Tidak ada DROP TABLE aktif', () => {
    expect(active).not.toMatch(/\bDROP\s+TABLE\b/i);
  });

  test('Tidak ada DELETE FROM aktif', () => {
    expect(active).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  test('Memuat panduan backup manual untuk Free Plan', () => {
    expect(sql).toMatch(/pg_dump/i);
    expect(sql).toMatch(/CSV|Excel/);
    // Wajib mention Free Plan tidak punya automated backup
    expect(sql).toMatch(/Free Plan/i);
  });
});

describe('supabase_schema_updates_v6.sql — non-destructive default', () => {
  const sql = readFile('supabase_schema_updates_v6.sql');
  const active = stripCommentLines(sql);

  test('Tidak ada TRUNCATE aktif (block reset di-pisah ke v6_reset.sql)', () => {
    expect(active).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);
  });

  test('Tidak ada DROP COLUMN aktif', () => {
    expect(active).not.toMatch(/\bDROP\s+COLUMN\b/i);
  });

  test('Tidak ada DELETE FROM aktif', () => {
    expect(active).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe('supabase_schema_updates_v11.sql - canonical dusun indexes', () => {
  const sql = readFile('supabase_schema_updates_v11.sql');
  const active = stripCommentLines(sql);

  test('Tidak ada operasi destruktif aktif', () => {
    expect(active).not.toMatch(/\bTRUNCATE\b/i);
    expect(active).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    expect(active).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  test('Memastikan unique index untuk upsert data_bumil per bulan', () => {
    expect(sql).toMatch(/data_bumil_dusun_tahun_bulan_uidx/i);
    expect(sql).toMatch(/ARRAY\['dusun_id', 'tahun', 'bulan'\]/i);
  });

  test('Membuat compatibility view untuk data_kegiatan_warga', () => {
    expect(sql).toMatch(/CREATE\s+VIEW\s+public\.data_kegiatan_warga/i);
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+public\.data_rekap_dawis/i);
  });
});

describe('Destructive scripts tersedia sebagai file terpisah', () => {
  test('supabase_schema_updates_v5_destructive.sql ada', () => {
    expect(
      fs.existsSync(
        path.join(process.cwd(), 'supabase_schema_updates_v5_destructive.sql')
      )
    ).toBe(true);
  });

  test('supabase_schema_updates_v6_reset.sql ada', () => {
    expect(
      fs.existsSync(path.join(process.cwd(), 'supabase_schema_updates_v6_reset.sql'))
    ).toBe(true);
  });

  test('v5_destructive memuat panduan backup', () => {
    const sql = readFile('supabase_schema_updates_v5_destructive.sql');
    expect(sql).toMatch(/pg_dump/i);
    expect(sql).toMatch(/MANUAL ONLY/i);
  });

  test('v6_reset memuat panduan backup', () => {
    const sql = readFile('supabase_schema_updates_v6_reset.sql');
    expect(sql).toMatch(/pg_dump/i);
    expect(sql).toMatch(/MANUAL ONLY/i);
  });
});

describe('supabase_schema.sql (fresh install) konsisten dengan v6 (TEXT)', () => {
  const sql = readFile('supabase_schema.sql');

  test('data_umum kolom angka memakai TEXT DEFAULT \'\'', () => {
    expect(sql).toMatch(/jml_kk\s+TEXT\s+DEFAULT\s+''/i);
    expect(sql).toMatch(/jml_jiwa_l\s+TEXT\s+DEFAULT\s+''/i);
  });

  test('data_pokja1 kolom angka memakai TEXT', () => {
    expect(sql).toMatch(/kader_pkbn\s+TEXT\s+DEFAULT\s+''/i);
  });

  test('data_rekap_dawis ada di fresh schema (rename dari data_kegiatan_warga)', () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+data_rekap_dawis/i);
  });

  test('fresh schema menyediakan compatibility view data_kegiatan_warga', () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+VIEW\s+data_kegiatan_warga/i);
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+data_rekap_dawis/i);
  });

  test('seed dusun 9 entri Belikurip', () => {
    const dusun = ['Soko', 'Melikan', 'Jamprit Wetan', 'Jamprit Kulon', 'Belikurip', 'Pagersari', 'Klerong', 'Tanjung', 'Banyuripan'];
    for (const d of dusun) {
      expect(sql).toMatch(new RegExp(`'${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
    }
  });
});
