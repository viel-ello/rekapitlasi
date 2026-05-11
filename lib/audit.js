/**
 * @file Audit logger — records all data changes
 * Pastikan hasil insert di-await supaya tidak hilang di environment serverless
 * (Vercel bisa menutup fungsi sebelum Promise non-await selesai).
 */

/**
 * Write an audit log entry.
 * Jika pemanggil tidak await, log tetap dikirim best-effort tapi tanpa jaminan delivery.
 *
 * @param {{
 *   userId?: number|null,
 *   username?: string,
 *   action?: string,
 *   tableName: string,
 *   desaNama?: string,
 *   detail?: string,
 *   before?: object,
 *   after?: object,
 *   ip?: string,
 * }} entry
 * @returns {Promise<void>}
 */
async function writeLog({ userId, username, action, tableName, desaNama, detail, before, after, ip }) {
  try {
    const { supabase } = require('./supabase');
    const payload = {
      user_id: userId || null,
      username: username || 'system',
      action: action || 'update',
      table_name: tableName,
      desa_nama: desaNama || null,
      detail: detail || null,
    };
    if (before !== undefined) payload.before_json = before;
    if (after !== undefined) payload.after_json = after;
    if (ip) payload.ip = ip;

    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) console.error('Audit log error:', error);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { writeLog };
