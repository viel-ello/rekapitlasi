/**
 * @file Authentication helpers
 * Password hashing, JWT token management, role permissions, row-level access.
 */

const bcrypt = require('bcryptjs');
const { SignJWT, jwtVerify } = require('jose');

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: process.env.JWT_SECRET is not defined. Please configure it in your .env.local file.');
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Hash a plaintext password using bcrypt.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a bcrypt hash.
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create a signed JWT token. Payload boleh memuat `dusun_id` untuk role kader-dusun.
 */
async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Verify and decode a JWT token.
 */
async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

/**
 * Authenticate user. Return { user, token } atau null kalau gagal.
 * JWT payload include `dusun_id` (kalau user punya scope dusun spesifik).
 */
async function authenticateUser(username, password) {
  const { supabase } = require('@/lib/supabase');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, password_hash, nama_lengkap, role, dusun_id')
    .eq('username', username)
    .single();

  if (error || !user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  const token = await createToken({
    userId: user.id,
    role: user.role,
    username: user.username,
    dusun_id: user.dusun_id ?? null,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      dusun_id: user.dusun_id ?? null,
    },
    token,
  };
}

/**
 * ROLE_PERMISSIONS — mapping role → daftar tabel yang boleh di-write.
 *
 * Aliases:
 * - `data_kegiatan_warga` adalah nama lama untuk `data_rekap_dawis`. Untuk
 *   backward-compat selama transisi, role yang punya akses ke salah satu
 *   otomatis punya akses ke yang lain (lihat canWrite).
 *
 * Role kader-dusun (9 role): scope row-level. Boleh edit `data_umum`,
 * `data_rekap_dawis`, dan `data_bumil` — tetapi HANYA baris dengan
 * `dusun_id === user.dusun_id`. Helper `canWriteRow` enforce row-level check.
 *
 * Role `sekretaris` sudah dihapus (tugas dipindahkan ke kader-dusun + admin).
 */
const KADER_DUSUN_TABLES = ['data_umum', 'data_rekap_dawis', 'data_kegiatan_warga', 'data_bumil'];

const ROLE_PERMISSIONS = {
  admin:      ['data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4', 'data_kegiatan_warga', 'data_rekap_dawis', 'data_bumil'],
  pokja1:     ['data_pokja1'],
  pokja2:     ['data_pokja2'],
  pokja3:     ['data_pokja3'],
  pokja4:     ['data_pokja4'],
  user:       [],
  // 9 role kader-dusun: row-level scope di tabel data_umum, data_rekap_dawis, data_bumil.
  dusun_soko:          KADER_DUSUN_TABLES,
  dusun_melikan:       KADER_DUSUN_TABLES,
  dusun_jamprit_wetan: KADER_DUSUN_TABLES,
  dusun_jamprit_kulon: KADER_DUSUN_TABLES,
  dusun_belikurip:     KADER_DUSUN_TABLES,
  dusun_pagersari:     KADER_DUSUN_TABLES,
  dusun_klerong:       KADER_DUSUN_TABLES,
  dusun_tanjung:       KADER_DUSUN_TABLES,
  dusun_banyuripan:    KADER_DUSUN_TABLES,
};

/**
 * ROLE_SCOPE — apakah role pakai scope tabel ('all') atau row-level ('own_dusun').
 */
const ROLE_SCOPE = {
  admin: 'all',
  pokja1: 'all',
  pokja2: 'all',
  pokja3: 'all',
  pokja4: 'all',
  user: 'none',
  dusun_soko: 'own_dusun',
  dusun_melikan: 'own_dusun',
  dusun_jamprit_wetan: 'own_dusun',
  dusun_jamprit_kulon: 'own_dusun',
  dusun_belikurip: 'own_dusun',
  dusun_pagersari: 'own_dusun',
  dusun_klerong: 'own_dusun',
  dusun_tanjung: 'own_dusun',
  dusun_banyuripan: 'own_dusun',
};

/**
 * Mapping role kader-dusun → nama dusun (untuk auto-assign user.dusun_id).
 * Duplikasi dari lib/dusun.js karena lib/auth.js dipakai juga oleh proxy.js
 * yang harus minim dependency.
 */
const ROLE_TO_DUSUN_NAME = {
  dusun_soko: 'Soko',
  dusun_melikan: 'Melikan',
  dusun_jamprit_wetan: 'Jamprit Wetan',
  dusun_jamprit_kulon: 'Jamprit Kulon',
  dusun_belikurip: 'Belikurip',
  dusun_pagersari: 'Pagersari',
  dusun_klerong: 'Klerong',
  dusun_tanjung: 'Tanjung',
  dusun_banyuripan: 'Banyuripan',
};

/**
 * Aliases tabel rekap-dawis. `data_kegiatan_warga` adalah nama lama yang masih
 * dipakai oleh client/import lama. Server sebaiknya selalu normalize ke
 * `data_rekap_dawis` lewat helper ini.
 */
const TABLE_ALIASES = {
  data_kegiatan_warga: 'data_rekap_dawis',
  data_rekap_dawis: 'data_kegiatan_warga',
};

/**
 * Read JWT token from request cookies and verify it.
 */
async function getAuthUser(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/auth-token=([^;]+)/);
    if (!match) return null;
    return await verifyToken(match[1]);
  } catch {
    return null;
  }
}

async function requireAuth(request) {
  return getAuthUser(request);
}

requireAuth.deny = function () {
  const { NextResponse } = require('next/server');
  return NextResponse.json({ error: 'Sesi login telah berakhir. Silakan login kembali.' }, { status: 401 });
};

async function requireAdmin(request) {
  const user = await getAuthUser(request);
  if (!user) return null;
  if (user.role !== 'admin') return { __forbidden: true, role: user.role };
  return user;
}

requireAdmin.deny = function (result) {
  const { NextResponse } = require('next/server');
  if (!result) {
    return NextResponse.json({ error: 'Sesi login telah berakhir. Silakan login kembali.' }, { status: 401 });
  }
  if (result.__forbidden) {
    return NextResponse.json({ error: `Akses ditolak. Hanya admin yang dapat mengakses fitur ini (role Anda: ${result.role}).` }, { status: 403 });
  }
  return null;
};

/**
 * Cek apakah role boleh write ke tabel tertentu (table-level check).
 * Untuk row-level check (kader-dusun), pakai canWriteRow.
 *
 * @param {string} role
 * @param {string} tableName
 * @returns {boolean}
 */
function canWrite(role, tableName) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes(tableName)) return true;
  // Backward-compat alias: `data_kegiatan_warga` ≡ `data_rekap_dawis`
  const alias = TABLE_ALIASES[tableName];
  if (alias && perms.includes(alias)) return true;
  return false;
}

/**
 * Cek apakah user boleh write ke baris spesifik. Untuk role dengan scope `all`,
 * sama dengan canWrite(role, tableName). Untuk scope `own_dusun`, juga cek
 * row.dusun_id === user.dusun_id.
 *
 * @param {{ role: string, dusun_id?: number|null }} user
 * @param {string} tableName
 * @param {{ dusun_id?: number|null }} row
 * @returns {boolean}
 */
function canWriteRow(user, tableName, row) {
  if (!user || !user.role) return false;
  if (!canWrite(user.role, tableName)) return false;
  const scope = ROLE_SCOPE[user.role] || 'none';
  if (scope === 'all') return true;
  if (scope === 'own_dusun') {
    if (user.dusun_id == null || row == null) return false;
    return Number(row.dusun_id) === Number(user.dusun_id);
  }
  return false;
}

/**
 * Normalisasi nama tabel — selalu kembalikan nama canonical (data_rekap_dawis,
 * bukan data_kegiatan_warga).
 */
function normalizeTableName(tableName) {
  if (tableName === 'data_kegiatan_warga') return 'data_rekap_dawis';
  return tableName;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  authenticateUser,
  getAuthUser,
  requireAuth,
  requireAdmin,
  canWrite,
  canWriteRow,
  normalizeTableName,
  ROLE_PERMISSIONS,
  ROLE_SCOPE,
  ROLE_TO_DUSUN_NAME,
  TABLE_ALIASES,
};
