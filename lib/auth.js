/**
 * @file Authentication helpers
 * Password hashing, JWT token management, and user authentication
 */

const bcrypt = require('bcryptjs');
const { SignJWT, jwtVerify } = require('jose');

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'pkk-rekapitulasi-secret-key-2025';
const secret = new TextEncoder().encode(JWT_SECRET_KEY);

/**
 * Hash a plaintext password using bcrypt
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a bcrypt hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Create a signed JWT token
 * @param {{ userId: number, role: string, username: string }} payload
 * @returns {Promise<string>} signed JWT
 */
async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Verify and decode a JWT token
 * @param {string} token
 * @returns {Promise<{ userId: number, role: string, username: string }>}
 */
async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

/**
 * Authenticate a user with username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ user: object, token: string } | null>}
 */
async function authenticateUser(username, password) {
  const { supabase } = require('@/lib/supabase');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, password_hash, nama_lengkap, role')
    .eq('username', username)
    .single();

  if (error || !user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  const token = await createToken({
    userId: user.id,
    role: user.role,
    username: user.username,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
    },
    token,
  };
}/**
 * Role-to-endpoint permission mapping.
 * admin can write to ALL endpoints.
 * Each pokja role can only write to their own data + data_umum.
 * sekretaris can write to data_umum and kegiatan_warga.
 * user = read-only, no write access.
 */
const ROLE_PERMISSIONS = {
  admin:      ['data_umum','data_pokja1','data_pokja2','data_pokja3','data_pokja4','data_kegiatan_warga','data_bumil'],
  pokja1:     ['data_pokja1'],
  pokja2:     ['data_pokja2'],
  pokja3:     ['data_pokja3'],
  pokja4:     ['data_pokja4'],
  sekretaris: ['data_umum','data_kegiatan_warga','data_bumil'],
  user:       [],
};

/**
 * Read JWT token from request cookies and verify it
 * @param {Request} request
 * @returns {Promise<{ userId: number, role: string, username: string } | null>}
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

/**
 * Check if a role can write to a specific table
 * @param {string} role
 * @param {string} tableName
 * @returns {boolean}
 */
function canWrite(role, tableName) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(tableName);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  authenticateUser,
  getAuthUser,
  canWrite,
  ROLE_PERMISSIONS,
};
