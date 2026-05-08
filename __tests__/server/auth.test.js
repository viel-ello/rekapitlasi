/**
 * @file Auth tests (TDD)
 * Tests for lib/auth.js — password hashing, JWT, login validation
 */

const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', '..', 'test_auth.db');

beforeAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  process.env.DATABASE_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  jest.resetModules();
});

afterAll(() => {
  const db = require('@/lib/db');
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('Auth — hashPassword', () => {
  test('should hash a password', async () => {
    const { hashPassword } = require('@/lib/auth');
    const hash = await hashPassword('password123');

    expect(hash).toBeDefined();
    expect(hash).not.toBe('password123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  test('should produce different hashes for same input', async () => {
    const { hashPassword } = require('@/lib/auth');
    const hash1 = await hashPassword('password123');
    const hash2 = await hashPassword('password123');

    expect(hash1).not.toBe(hash2); // different salt each time
  });
});

describe('Auth — verifyPassword', () => {
  test('should verify correct password', async () => {
    const { hashPassword, verifyPassword } = require('@/lib/auth');
    const hash = await hashPassword('myPassword');
    const result = await verifyPassword('myPassword', hash);

    expect(result).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const { hashPassword, verifyPassword } = require('@/lib/auth');
    const hash = await hashPassword('myPassword');
    const result = await verifyPassword('wrongPassword', hash);

    expect(result).toBe(false);
  });
});

describe('Auth — JWT tokens', () => {
  test('should create a JWT token', async () => {
    const { createToken } = require('@/lib/auth');
    const token = await createToken({ userId: 1, role: 'admin', username: 'admin' });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  test('should verify a valid JWT token', async () => {
    const { createToken, verifyToken } = require('@/lib/auth');
    const token = await createToken({ userId: 1, role: 'admin', username: 'admin' });
    const payload = await verifyToken(token);

    expect(payload.userId).toBe(1);
    expect(payload.role).toBe('admin');
    expect(payload.username).toBe('admin');
  });

  test('should reject an invalid JWT token', async () => {
    const { verifyToken } = require('@/lib/auth');

    await expect(verifyToken('invalid.token.here')).rejects.toThrow();
  });
});

describe('Auth — authenticateUser', () => {
  beforeAll(() => {
    // Seed admin user for authentication test
    const { seedDesa, seedUsers } = require('@/lib/seed');
    const db = require('@/lib/db');
    seedDesa(db);
    seedUsers(db);
  });

  test('should authenticate valid admin credentials', async () => {
    const { authenticateUser } = require('@/lib/auth');
    const result = await authenticateUser('admin', 'admin123');

    expect(result).toBeDefined();
    expect(result.user.username).toBe('admin');
    expect(result.user.role).toBe('admin');
    expect(result.token).toBeDefined();
  });

  test('should reject invalid password', async () => {
    const { authenticateUser } = require('@/lib/auth');
    const result = await authenticateUser('admin', 'wrongpassword');

    expect(result).toBeNull();
  });

  test('should reject non-existent user', async () => {
    const { authenticateUser } = require('@/lib/auth');
    const result = await authenticateUser('nonexistent', 'password');

    expect(result).toBeNull();
  });
});
