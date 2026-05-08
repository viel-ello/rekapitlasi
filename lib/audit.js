/**
 * @file Audit logger — records all data changes
 */



/**
 * Write an audit log entry
 * @param {{ userId: number, username: string, action: string, tableName: string, desaNama?: string, detail?: string }} entry
 */
function writeLog({ userId, username, action, tableName, desaNama, detail }) {
  try {
    const { supabase } = require('./supabase');
    supabase.from('audit_logs').insert({
      user_id: userId || null,
      username: username || 'system',
      action: action || 'update',
      table_name: tableName,
      desa_nama: desaNama || null,
      detail: detail || null
    }).then(({ error }) => {
      if (error) console.error('Audit log error:', error);
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { writeLog };
