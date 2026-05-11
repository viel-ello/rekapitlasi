/**
 * @file Period lock helper (Fase 3: aktif query ke report_periods).
 *
 * Kontrak:
 *   const { locked, status, period } = await checkPeriodLock('data_umum', 2025);
 *   if (locked && user.role !== 'admin') return 403;
 *
 * Transisi status:
 *   draft → pokja boleh edit
 *   submitted → tidak ada yang boleh edit (admin override via unlock)
 *   approved → tidak ada yang boleh edit (admin override)
 *   locked → hanya admin yang boleh unlock
 */

const { supabase } = require('./supabase');

const LOCKED_STATUSES = new Set(['submitted', 'approved', 'locked']);

/**
 * @param {string} tableName
 * @param {number} tahun
 * @param {number|null} bulan
 * @returns {Promise<{ locked: boolean, status: string, period: object|null }>}
 */
async function checkPeriodLock(tableName, tahun, bulan = null) {
  try {
    let query = supabase
      .from('report_periods')
      .select('*')
      .eq('table_name', tableName)
      .eq('tahun', tahun);

    query = bulan === null || bulan === undefined
      ? query.is('bulan', null)
      : query.eq('bulan', bulan);

    const { data, error } = await query.maybeSingle();

    if (error) {
      // Kalau tabel belum dimigrate (fase 0-2), fail-open
      return { locked: false, status: 'draft', period: null };
    }

    if (!data) {
      return { locked: false, status: 'draft', period: null };
    }

    return {
      locked: LOCKED_STATUSES.has(data.status),
      status: data.status,
      period: data,
    };
  } catch {
    return { locked: false, status: 'draft', period: null };
  }
}

/**
 * Validasi transisi status — cegah perpindahan tidak valid.
 * draft ↔ submitted ↔ approved ↔ locked
 */
function canTransition(from, to, role) {
  const admin = role === 'admin';
  const sekretaris = role === 'sekretaris';

  const allowed = {
    draft: ['submitted'],
    submitted: ['draft', 'approved'],
    approved: admin ? ['locked', 'draft'] : [],
    locked: admin ? ['draft'] : [],
  };

  const permitted = allowed[from] || [];
  if (!permitted.includes(to)) return false;

  // submitted → approved butuh admin atau sekretaris
  if (from === 'submitted' && to === 'approved' && !admin && !sekretaris) return false;

  return true;
}

module.exports = { checkPeriodLock, canTransition, LOCKED_STATUSES };
