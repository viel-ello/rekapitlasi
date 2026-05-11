/**
 * @file Security tests — requireAuth, requireAdmin helpers
 * Verifies auth guards return correct status codes
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  jest.resetModules();
});

// Helper to create a fake Request with optional cookie
function makeRequest(cookieValue) {
  const headers = new Headers();
  if (cookieValue) headers.set('cookie', cookieValue);
  return { headers };
}

describe('requireAuth', () => {
  test('returns null for request without cookie', async () => {
    const { requireAuth } = require('@/lib/auth');
    const result = await requireAuth(makeRequest());
    expect(result).toBeNull();
  });

  test('returns null for invalid token', async () => {
    const { requireAuth } = require('@/lib/auth');
    const result = await requireAuth(makeRequest('auth-token=invalid.token.value'));
    expect(result).toBeNull();
  });

  test('returns user payload for valid token', async () => {
    const { requireAuth, createToken } = require('@/lib/auth');
    const token = await createToken({ userId: 1, role: 'admin', username: 'admin' });
    const result = await requireAuth(makeRequest(`auth-token=${token}`));
    expect(result).toBeDefined();
    expect(result.userId).toBe(1);
    expect(result.role).toBe('admin');
  });

  test('deny() returns 401 response', () => {
    // Mock NextResponse since it's a Next.js server API
    jest.mock('next/server', () => ({
      NextResponse: {
        json: (body, opts) => ({ body, status: opts?.status }),
      },
    }));
    const { requireAuth } = require('@/lib/auth');
    const response = requireAuth.deny();
    expect(response.status).toBe(401);
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  });

  test('returns null for request without cookie', async () => {
    const { requireAdmin } = require('@/lib/auth');
    const result = await requireAdmin(makeRequest());
    expect(result).toBeNull();
  });

  test('returns __forbidden for non-admin user', async () => {
    const { requireAdmin, createToken } = require('@/lib/auth');
    const token = await createToken({ userId: 2, role: 'pokja1', username: 'user1' });
    const result = await requireAdmin(makeRequest(`auth-token=${token}`));
    expect(result.__forbidden).toBe(true);
    expect(result.role).toBe('pokja1');
  });

  test('returns user payload for admin user', async () => {
    const { requireAdmin, createToken } = require('@/lib/auth');
    const token = await createToken({ userId: 1, role: 'admin', username: 'admin' });
    const result = await requireAdmin(makeRequest(`auth-token=${token}`));
    expect(result.__forbidden).toBeUndefined();
    expect(result.role).toBe('admin');
    expect(result.userId).toBe(1);
  });

  test('deny(null) returns 401', () => {
    jest.mock('next/server', () => ({
      NextResponse: {
        json: (body, opts) => ({ body, status: opts?.status }),
      },
    }));
    const { requireAdmin } = require('@/lib/auth');
    const response = requireAdmin.deny(null);
    expect(response.status).toBe(401);
  });

  test('deny(__forbidden) returns 403', () => {
    jest.mock('next/server', () => ({
      NextResponse: {
        json: (body, opts) => ({ body, status: opts?.status }),
      },
    }));
    const { requireAdmin } = require('@/lib/auth');
    const response = requireAdmin.deny({ __forbidden: true, role: 'pokja1' });
    expect(response.status).toBe(403);
  });
});
