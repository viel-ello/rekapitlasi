/**
 * @file Notification helper — dipanggil server-side saat event terjadi.
 * Best-effort: error tidak di-propagate ke caller.
 */

const { supabase } = require('./supabase');

const PERIOD_LABEL = {
  data_umum: 'Data Umum',
  data_pokja1: 'Pokja I',
  data_pokja2: 'Pokja II',
  data_pokja3: 'Pokja III',
  data_pokja4: 'Pokja IV',
  data_rekap_dawis: 'Rekapitulasi Dawis',
  data_kegiatan_warga: 'Rekapitulasi Dawis', // alias backward-compat
  data_bumil: 'Data Bumil',
};

function tableSlug(table) {
  // data_umum → data-umum, data_pokja1 → pokja1, data_rekap_dawis → rekap-dawis
  if (table === 'data_rekap_dawis' || table === 'data_kegiatan_warga') return 'rekap-dawis';
  return table.replace(/^data_/, '').replace(/_/g, '-');
}

function periodLabel(table, tahun, bulan) {
  const name = PERIOD_LABEL[table] || table;
  const suffix = bulan ? ` bulan ${bulan}` : '';
  return `${name} tahun ${tahun}${suffix}`;
}

/**
 * Insert banyak notifikasi sekaligus.
 * @param {Array<{user_id, type, title, body?, link?}>} items
 */
async function insertNotifications(items) {
  if (!items || items.length === 0) return;
  const rows = items.map((n) => ({
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body || null,
    link: n.link || null,
    is_read: 0,
  }));
  try {
    await supabase.from('notifications').insert(rows);
  } catch (err) {
    console.error('insertNotifications error:', err);
  }
}

/**
 * Generate notifikasi saat transisi status periode.
 * - submit: admin → "Ada data butuh review"
 * - approve: submitted_by user → "Data Anda disetujui"
 * - return: submitted_by user → "Data Anda dikembalikan untuk revisi"
 * - lock: submitted_by user + approved_by user → "Periode dikunci"
 */
async function createPeriodNotifications({ table_name, tahun, bulan, action, actor }) {
  const label = periodLabel(table_name, tahun, bulan);
  const link = `/dashboard/${tableSlug(table_name)}/edit`;

  if (action === 'submit') {
    // Notify admin (kecuali actor sendiri)
    const { data: reviewers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin']);
    const ids = (reviewers || []).map((r) => r.id).filter((id) => id !== actor.userId);
    await insertNotifications(ids.map((user_id) => ({
      user_id,
      type: 'period_submitted',
      title: `${label} diajukan untuk review`,
      body: `${actor.username} mengajukan data ${label} untuk direview.`,
      link,
    })));
    return;
  }

  // Untuk action approve/return/lock, butuh info submitted_by.
  // Filter bulan dengan benar: .is('bulan', null) untuk periode tahunan,
  // .eq('bulan', n) untuk periode bulanan. (Bug lama: .is('bulan', undefined)
  // saat non-null tidak memfilter bulan → row salah / tidak ketemu.)
  let periodQuery = supabase
    .from('report_periods')
    .select('submitted_by, approved_by')
    .eq('table_name', table_name)
    .eq('tahun', tahun);
  periodQuery = (bulan === null || bulan === undefined)
    ? periodQuery.is('bulan', null)
    : periodQuery.eq('bulan', Number(bulan));
  const { data: period } = await periodQuery.maybeSingle();

  const submitter = period?.submitted_by;
  const approver = period?.approved_by;

  if (action === 'approve' && submitter && submitter !== actor.userId) {
    await insertNotifications([{
      user_id: submitter,
      type: 'period_approved',
      title: `${label} disetujui`,
      body: `${actor.username} menyetujui data ${label}.`,
      link,
    }]);
  }

  if (action === 'return' && submitter && submitter !== actor.userId) {
    await insertNotifications([{
      user_id: submitter,
      type: 'period_returned',
      title: `${label} dikembalikan untuk revisi`,
      body: `${actor.username} mengembalikan data ${label} ke draft.`,
      link,
    }]);
  }

  if (action === 'lock') {
    const recipients = new Set();
    if (submitter && submitter !== actor.userId) recipients.add(submitter);
    if (approver && approver !== actor.userId) recipients.add(approver);
    await insertNotifications([...recipients].map((user_id) => ({
      user_id,
      type: 'period_locked',
      title: `${label} dikunci`,
      body: `${actor.username} mengunci data ${label}.`,
      link,
    })));
  }
}

module.exports = { insertNotifications, createPeriodNotifications, periodLabel };
