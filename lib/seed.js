/**
 * @file Database seeder
 * Seeds 13 desa Kecamatan Baturetno and default admin user
 */

const bcrypt = require('bcryptjs');

/** Daftar 13 Desa di Kecamatan Baturetno */
const DESA_LIST = [
  { nomor_urut: 1, nama: 'Setrorejo' },
  { nomor_urut: 2, nama: 'Kedungombo' },
  { nomor_urut: 3, nama: 'Boto' },
  { nomor_urut: 4, nama: 'Sendangrejo' },
  { nomor_urut: 5, nama: 'Talunombo' },
  { nomor_urut: 6, nama: 'Baturetno' },
  { nomor_urut: 7, nama: 'Saradan' },
  { nomor_urut: 8, nama: 'Temon' },
  { nomor_urut: 9, nama: 'Belikurip' },
  { nomor_urut: 10, nama: 'Watuagung' },
  { nomor_urut: 11, nama: 'Balepanjang' },
  { nomor_urut: 12, nama: 'Gambirnom' },
  { nomor_urut: 13, nama: 'Glesung Rejo' },
];

/**
 * Seed desa table with 13 villages
 * @param {import('better-sqlite3').Database} db
 */
function seedDesa(db) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO desa (nama, nomor_urut, is_active) VALUES (?, ?, 1)'
  );

  const transaction = db.transaction(() => {
    for (const desa of DESA_LIST) {
      insert.run(desa.nama, desa.nomor_urut);
    }
  });

  transaction();
}

/**
 * Seed default admin user
 * @param {import('better-sqlite3').Database} db
 */
function seedUsers(db) {
  const existing = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (existing) return;

  const passwordHash = bcrypt.hashSync('admin123', 10);

  db.prepare(
    'INSERT INTO users (username, password_hash, nama_lengkap, role) VALUES (?, ?, ?, ?)'
  ).run('admin', passwordHash, 'Administrator', 'admin');
}

/**
 * Run all seeds
 * @param {import('better-sqlite3').Database} db
 */
function seedAll(db) {
  seedDesa(db);
  seedUsers(db);
}

module.exports = { seedDesa, seedUsers, seedAll, DESA_LIST };
