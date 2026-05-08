/**
 * @file Seed tests (TDD)
 * Tests for lib/seed.js — seeding 13 desa + default admin account
 */

const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', '..', 'test_seed.db');

beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.DATABASE_PATH = TEST_DB_PATH;
  // Clear module cache so db.js creates fresh database
  jest.resetModules();
});

afterAll(() => {
  const db = require('@/lib/db');
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('Seed — Desa (lib/seed.js)', () => {
  test('should seed 13 desa', () => {
    const { seedDesa } = require('@/lib/seed');
    const db = require('@/lib/db');

    seedDesa(db);

    const count = db.prepare('SELECT COUNT(*) as c FROM desa').get();
    expect(count.c).toBe(13);
  });

  test('should have correct desa names', () => {
    const db = require('@/lib/db');
    const desa = db.prepare('SELECT nama FROM desa ORDER BY nomor_urut').all();
    const names = desa.map(d => d.nama);

    expect(names).toContain('Setrorejo');
    expect(names).toContain('Kedungombo');
    expect(names).toContain('Boto');
    expect(names).toContain('Sendangrejo');
    expect(names).toContain('Talunombo');
    expect(names).toContain('Baturetno');
    expect(names).toContain('Saradan');
    expect(names).toContain('Temon');
    expect(names).toContain('Belikurip');
    expect(names).toContain('Watuagung');
    expect(names).toContain('Balepanjang');
    expect(names).toContain('Gambirnom');
    expect(names).toContain('Glesung Rejo');
  });

  test('should set nomor_urut correctly (1 to 13)', () => {
    const db = require('@/lib/db');
    const desa = db.prepare('SELECT nomor_urut FROM desa ORDER BY nomor_urut').all();
    const nomors = desa.map(d => d.nomor_urut);

    expect(nomors).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  test('should not duplicate desa on re-seed', () => {
    const { seedDesa } = require('@/lib/seed');
    const db = require('@/lib/db');

    seedDesa(db); // second call
    const count = db.prepare('SELECT COUNT(*) as c FROM desa').get();
    expect(count.c).toBe(13);
  });
});

describe('Seed — Users (lib/seed.js)', () => {
  test('should seed a default admin user', () => {
    const { seedUsers } = require('@/lib/seed');
    const db = require('@/lib/db');

    seedUsers(db);

    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    expect(admin).toBeDefined();
    expect(admin.role).toBe('admin');
    expect(admin.nama_lengkap).toBeTruthy();
  });

  test('admin password should be hashed (not plaintext)', () => {
    const db = require('@/lib/db');
    const admin = db.prepare("SELECT password_hash FROM users WHERE username = 'admin'").get();

    expect(admin.password_hash).not.toBe('admin123');
    expect(admin.password_hash.startsWith('$2')).toBe(true); // bcrypt prefix
  });

  test('should not duplicate users on re-seed', () => {
    const { seedUsers } = require('@/lib/seed');
    const db = require('@/lib/db');

    seedUsers(db); // second call
    const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE username = 'admin'").get();
    expect(count.c).toBe(1);
  });
});
