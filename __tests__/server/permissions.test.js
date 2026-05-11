/**
 * @file Permission tests — pure function tests (no database dependency)
 * Tests for role-based access control in lib/auth.js
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  jest.resetModules();
});

describe('Role Permissions — canWrite', () => {
  test('admin can write to all tables', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('admin', 'data_umum')).toBe(true);
    expect(canWrite('admin', 'data_pokja1')).toBe(true);
    expect(canWrite('admin', 'data_pokja2')).toBe(true);
    expect(canWrite('admin', 'data_pokja3')).toBe(true);
    expect(canWrite('admin', 'data_pokja4')).toBe(true);
    expect(canWrite('admin', 'data_kegiatan_warga')).toBe(true);
    expect(canWrite('admin', 'data_bumil')).toBe(true);
  });

  test('pokja1 can only write to data_pokja1', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('pokja1', 'data_pokja1')).toBe(true);
    expect(canWrite('pokja1', 'data_pokja2')).toBe(false);
    expect(canWrite('pokja1', 'data_pokja3')).toBe(false);
    expect(canWrite('pokja1', 'data_pokja4')).toBe(false);
    expect(canWrite('pokja1', 'data_umum')).toBe(false);
    expect(canWrite('pokja1', 'data_bumil')).toBe(false);
  });

  test('pokja2 can only write to data_pokja2', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('pokja2', 'data_pokja2')).toBe(true);
    expect(canWrite('pokja2', 'data_pokja1')).toBe(false);
    expect(canWrite('pokja2', 'data_pokja3')).toBe(false);
  });

  test('pokja3 can only write to data_pokja3', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('pokja3', 'data_pokja3')).toBe(true);
    expect(canWrite('pokja3', 'data_pokja1')).toBe(false);
  });

  test('pokja4 can only write to data_pokja4', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('pokja4', 'data_pokja4')).toBe(true);
    expect(canWrite('pokja4', 'data_pokja1')).toBe(false);
  });

  test('sekretaris can write to data_umum, kegiatan_warga, bumil', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('sekretaris', 'data_umum')).toBe(true);
    expect(canWrite('sekretaris', 'data_kegiatan_warga')).toBe(true);
    expect(canWrite('sekretaris', 'data_bumil')).toBe(true);
    expect(canWrite('sekretaris', 'data_pokja1')).toBe(false);
    expect(canWrite('sekretaris', 'data_pokja2')).toBe(false);
  });

  test('user role has NO write access', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('user', 'data_umum')).toBe(false);
    expect(canWrite('user', 'data_pokja1')).toBe(false);
    expect(canWrite('user', 'data_pokja2')).toBe(false);
    expect(canWrite('user', 'data_pokja3')).toBe(false);
    expect(canWrite('user', 'data_pokja4')).toBe(false);
    expect(canWrite('user', 'data_kegiatan_warga')).toBe(false);
    expect(canWrite('user', 'data_bumil')).toBe(false);
  });

  test('unknown role has NO write access', () => {
    const { canWrite } = require('@/lib/auth');
    expect(canWrite('hacker', 'data_pokja1')).toBe(false);
    expect(canWrite(undefined, 'data_pokja1')).toBe(false);
  });
});

describe('ROLE_PERMISSIONS mapping', () => {
  test('should export ROLE_PERMISSIONS', () => {
    const { ROLE_PERMISSIONS } = require('@/lib/auth');
    expect(ROLE_PERMISSIONS).toBeDefined();
    expect(typeof ROLE_PERMISSIONS).toBe('object');
  });

  test('all defined roles should have an array of permissions', () => {
    const { ROLE_PERMISSIONS } = require('@/lib/auth');
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      expect(Array.isArray(perms)).toBe(true);
    }
  });
});
