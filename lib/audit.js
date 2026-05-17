/**
 * @file Audit logger — records all data changes
 * Hasil insert di-await supaya tidak hilang di environment serverless
 * (Vercel bisa menutup fungsi sebelum Promise non-await selesai).
 */

const { normalizeTableName } = require('./auth');

/**
 * Write an audit log entry.
 *
 * Parameter `dusunNama` (canonical) atau `desaNama` (deprecated alias) keduanya
 * diterima. Hasil insert mengisi `dusun_nama` di tabel `audit_logs` dan
 * mempertahankan `desa_nama` untuk backward-compat history.
 *
 * @param {{
 *   userId?: number|null,
 *   username?: string,
 *   action?: string,
 *   tableName: string,
 *   dusunNama?: string,
 *   desaNama?: string,
 *   detail?: string,
 *   before?: object,
 *   after?: object,
 *   ip?: string,
 * }} entry
 * @returns {Promise<void>}
 */
async function writeLog({
  userId,
  username,
  action,
  tableName,
  dusunNama,
  desaNama,
  detail,
  before,
  after,
  ip,
}) {
  try {
    const { supabase } = require('./supabase');
    // Normalisasi nama tabel: data_kegiatan_warga → data_rekap_dawis
    const canonicalTable = normalizeTableName ? normalizeTableName(tableName) : tableName;
    // Backward-compat: pakai dusunNama kalau ada, fallback ke desaNama
    const effectiveDusunNama = dusunNama ?? desaNama ?? null;

    const payload = {
      user_id: userId || null,
      username: username || 'system',
      action: action || 'update',
      table_name: canonicalTable,
      dusun_nama: effectiveDusunNama,
      desa_nama: desaNama ?? null, // tetap simpan kalau caller lama kirim
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
