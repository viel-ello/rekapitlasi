/**
 * @file Database layer tests (TDD - RED phase)
 * Tests for lib/db.js — SQLite connection, table creation, and migrations
 */

const path = require('path');
const fs = require('fs');

// Use a temporary database for testing
const TEST_DB_PATH = path.join(__dirname, '..', '..', 'test_pkk.db');

// Clean up before each test suite
beforeAll(() => {
  // Remove test database if exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  // Set env so db.js uses test database
  process.env.DATABASE_PATH = TEST_DB_PATH;
});

afterAll(() => {
  // Clean up test database
  const db = require('@/lib/db');
  if (db && typeof db.close === 'function') {
    db.close();
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('Database Connection (lib/db.js)', () => {
  test('should export a database instance', () => {
    const db = require('@/lib/db');
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });

  test('should have WAL journal mode enabled', () => {
    const db = require('@/lib/db');
    const result = db.pragma('journal_mode', { simple: true });
    expect(result).toBe('wal');
  });

  test('should create "desa" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='desa'"
    ).get();
    expect(table).toBeDefined();
    expect(table.name).toBe('desa');
  });

  test('should create "users" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();
    expect(table).toBeDefined();
    expect(table.name).toBe('users');
  });

  test('should create "data_umum" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_umum'"
    ).get();
    expect(table).toBeDefined();
  });

  test('should create "data_pokja1" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_pokja1'"
    ).get();
    expect(table).toBeDefined();
  });

  test('should create "data_pokja2" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_pokja2'"
    ).get();
    expect(table).toBeDefined();
  });

  test('should create "data_pokja3" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_pokja3'"
    ).get();
    expect(table).toBeDefined();
  });

  test('should create "data_pokja4" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_pokja4'"
    ).get();
    expect(table).toBeDefined();
  });

  test('should create "data_kegiatan_warga" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_kegiatan_warga'"
    ).get();
    expect(table).toBeDefined();
  });

  test('should create "data_bumil" table', () => {
    const db = require('@/lib/db');
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='data_bumil'"
    ).get();
    expect(table).toBeDefined();
  });
});

describe('Database Schema — desa table', () => {
  test('desa table should have correct columns', () => {
    const db = require('@/lib/db');
    const columns = db.prepare("PRAGMA table_info('desa')").all();
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('nama');
    expect(columnNames).toContain('nomor_urut');
    expect(columnNames).toContain('is_active');
  });
});

describe('Database Schema — users table', () => {
  test('users table should have correct columns', () => {
    const db = require('@/lib/db');
    const columns = db.prepare("PRAGMA table_info('users')").all();
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('username');
    expect(columnNames).toContain('password_hash');
    expect(columnNames).toContain('nama_lengkap');
    expect(columnNames).toContain('role');
    expect(columnNames).toContain('created_at');
  });
});

describe('Database Schema — data_umum table', () => {
  test('data_umum table should have correct columns', () => {
    const db = require('@/lib/db');
    const columns = db.prepare("PRAGMA table_info('data_umum')").all();
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('desa_id');
    expect(columnNames).toContain('tahun');
    expect(columnNames).toContain('jml_dusun');
    expect(columnNames).toContain('jml_pkk_rw');
    expect(columnNames).toContain('jml_pkk_rt');
    expect(columnNames).toContain('jml_dasa_wisma');
    expect(columnNames).toContain('jml_krt');
    expect(columnNames).toContain('jml_kk');
    expect(columnNames).toContain('jml_jiwa_l');
    expect(columnNames).toContain('jml_jiwa_p');
  });
});

describe('Database Schema — data_pokja1 table', () => {
  test('data_pokja1 table should have kader and activity columns', () => {
    const db = require('@/lib/db');
    const columns = db.prepare("PRAGMA table_info('data_pokja1')").all();
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('desa_id');
    expect(columnNames).toContain('tahun');
    expect(columnNames).toContain('kader_pkbn');
    expect(columnNames).toContain('kader_pkdrt');
    expect(columnNames).toContain('kader_pola_asuh');
    expect(columnNames).toContain('pkbn_jml_klp_simulasi');
    expect(columnNames).toContain('pkbn_jml_anggota');
    expect(columnNames).toContain('lansia_jml_klp');
    expect(columnNames).toContain('gr_kerja_bakti');
    expect(columnNames).toContain('gr_arisan');
  });
});
