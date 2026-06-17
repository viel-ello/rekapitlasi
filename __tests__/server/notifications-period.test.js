/**
 * @file Test createPeriodNotifications — memastikan filter bulan benar
 * (.is('bulan', null) untuk tahunan, .eq('bulan', n) untuk bulanan) dan
 * notifikasi terkirim ke pihak yang tepat.
 */

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-pkk-2025';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  jest.resetModules();
});

// Mock supabase: rekam pemanggilan .is/.eq pada query report_periods, dan
// tangkap notifikasi yang di-insert.
jest.mock('@/lib/supabase', () => {
  const calls = { is: [], eq: [], inserted: [] };
  global.__notifCalls = calls;

  function makeQuery(table) {
    const q = {
      _table: table,
      select() { return q; },
      eq(col, val) { calls.eq.push({ table, col, val }); return q; },
      is(col, val) { calls.is.push({ table, col, val }); return q; },
      in() { return q; },
      maybeSingle() {
        // Return submitter/approver untuk report_periods.
        if (table === 'report_periods') {
          return Promise.resolve({ data: { submitted_by: 99, approved_by: 88 } });
        }
        return Promise.resolve({ data: null });
      },
      insert(rows) { calls.inserted.push(...rows); return Promise.resolve({ error: null }); },
    };
    return q;
  }

  return {
    supabase: {
      from(table) {
        const q = makeQuery(table);
        // Untuk users (reviewers) query: .in() lalu await → kembalikan array.
        if (table === 'users') {
          q.in = () => Promise.resolve({ data: [{ id: 1 }, { id: 2 }] });
        }
        return q;
      },
    },
  };
});

describe('createPeriodNotifications — filter bulan', () => {
  beforeEach(() => {
    if (!global.__notifCalls) global.__notifCalls = { is: [], eq: [], inserted: [] };
    global.__notifCalls.is = [];
    global.__notifCalls.eq = [];
    global.__notifCalls.inserted = [];
  });

  test('periode bulanan (bulan=3) pakai .eq("bulan", 3), bukan .is', async () => {
    const { createPeriodNotifications } = require('@/lib/notifications');
    await createPeriodNotifications({
      table_name: 'data_bumil', tahun: 2026, bulan: 3, action: 'approve',
      actor: { userId: 1, username: 'admin' },
    });

    const calls = global.__notifCalls;
    const bulanEq = calls.eq.find((c) => c.table === 'report_periods' && c.col === 'bulan');
    const bulanIs = calls.is.find((c) => c.table === 'report_periods' && c.col === 'bulan');
    expect(bulanEq).toBeDefined();
    expect(bulanEq.val).toBe(3);
    expect(bulanIs).toBeUndefined();
  });

  test('periode tahunan (bulan=null) pakai .is("bulan", null)', async () => {
    const { createPeriodNotifications } = require('@/lib/notifications');
    await createPeriodNotifications({
      table_name: 'data_pokja1', tahun: 2026, bulan: null, action: 'approve',
      actor: { userId: 1, username: 'admin' },
    });

    const calls = global.__notifCalls;
    const bulanIs = calls.is.find((c) => c.table === 'report_periods' && c.col === 'bulan');
    expect(bulanIs).toBeDefined();
    expect(bulanIs.val).toBeNull();
  });

  test('approve mengirim notifikasi ke submitter (99)', async () => {
    const { createPeriodNotifications } = require('@/lib/notifications');
    await createPeriodNotifications({
      table_name: 'data_bumil', tahun: 2026, bulan: 5, action: 'approve',
      actor: { userId: 1, username: 'admin' },
    });
    const inserted = global.__notifCalls.inserted;
    expect(inserted.some((n) => n.user_id === 99 && n.type === 'period_approved')).toBe(true);
  });

  test('submit mengirim notifikasi ke reviewer admin', async () => {
    const { createPeriodNotifications } = require('@/lib/notifications');
    await createPeriodNotifications({
      table_name: 'data_bumil', tahun: 2026, bulan: 5, action: 'submit',
      actor: { userId: 5, username: 'kader' },
    });
    const inserted = global.__notifCalls.inserted;
    expect(inserted.length).toBeGreaterThan(0);
    expect(inserted.every((n) => n.type === 'period_submitted')).toBe(true);
  });
});
