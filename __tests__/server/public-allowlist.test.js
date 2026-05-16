/**
 * @file Smoke test untuk public API allowlist.
 * Memastikan tidak ada nama tabel/kolom sensitif yang masuk ke whitelist publik.
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

describe('public allowlist', () => {
  test('PUBLIC_TABLES tidak mengandung tabel sensitif', () => {
    const { PUBLIC_TABLES } = require('@/lib/publicData');
    const forbidden = ['users', 'audit_logs', 'rate_limits', 'notifications', 'report_periods', 'table_schemas', 'table_column_overrides'];
    for (const f of forbidden) {
      expect(PUBLIC_TABLES).not.toContain(f);
    }
  });

  test('PUBLIC_COLUMNS hanya dari tabel di PUBLIC_TABLES', () => {
    const { PUBLIC_TABLES, PUBLIC_COLUMNS } = require('@/lib/publicData');
    for (const t of Object.keys(PUBLIC_COLUMNS)) {
      expect(PUBLIC_TABLES).toContain(t);
    }
  });

  test('PUBLIC_DESA_FIELDS tidak mengandung password/email/PII', () => {
    const { PUBLIC_DESA_FIELDS } = require('@/lib/publicData');
    const forbidden = ['password', 'password_hash', 'email', 'phone', 'no_telp', 'alamat', 'nik'];
    for (const f of forbidden) {
      expect(PUBLIC_DESA_FIELDS).not.toContain(f);
    }
  });

  test('pickPublicFields hanya mengambil kolom di allowlist', () => {
    const { pickPublicFields } = require('@/lib/publicData');
    const result = pickPublicFields({ jml_kk: 100, password_hash: 'leak', secret_key: 'sneaky' }, 'data_umum');
    expect(result.jml_kk).toBe(100);
    expect(result.password_hash).toBeUndefined();
    expect(result.secret_key).toBeUndefined();
  });
});
