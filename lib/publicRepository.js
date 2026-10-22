import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_COLUMNS, PUBLIC_DUSUN_FIELDS, PUBLIC_TABLES, pickPublicFields } from '@/lib/publicData';
import { queryWithOptionalMonth, isMissingColumnError } from '@/lib/monthlyFallback';
import { toNumericValue } from '@/lib/chartStats';
import { evaluateRecordCompleteness, getTableKeys, mergeStatus, STATUS_LABELS } from '@/lib/dataQuality';

const MONTHLY = new Set(['data_umum', 'data_rekap_dawis', 'data_bumil']);
let client;

// This client stays in server handlers. RLS stays closed to direct anonymous reads;
// only the explicitly serialized aggregate fields below leave the server.
function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Public repository server configuration is missing');
  client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

async function checked(query) {
  const { data, error } = await query;
  if (error) throw new Error(`Public data read failed (${error.code || 'database'})`);
  return data || [];
}

export function publicPeriod(searchParams) {
  const year = Number(searchParams.get('tahun') || new Date().getFullYear());
  const month = Number(searchParams.get('bulan') || 12);
  return {
    tahun: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear(),
    bulan: Number.isInteger(month) && month >= 1 && month <= 12 ? month : 12,
  };
}

export async function getPublicYears() {
  const rows = await checked(database().from('report_years').select('tahun').eq('is_active', 1).order('tahun', { ascending: false }));
  return rows.map((row) => ({ tahun: Number(row.tahun) })).filter((row) => Number.isInteger(row.tahun));
}

export async function readPublicPeriod(tahun, bulan) {
  const db = database();
  const dusun = await checked(db.from('dusun').select(PUBLIC_DUSUN_FIELDS.join(',')).eq('is_active', 1).order('nomor_urut'));
  const ids = dusun.map((row) => row.id);
  const overrides = await checked(db.from('table_column_overrides').select('table_name,column_key').eq('is_hidden', 1));
  const hidden = {};
  for (const row of overrides) (hidden[row.table_name] ||= new Set()).add(row.column_key);
  const rows = {};
  const previous = {};
  const legacyAnnual = new Set();
  await Promise.all(PUBLIC_TABLES.map(async (table) => {
    const readYear = (year) => {
      if (!ids.length) return [];
      // Validation needs the registered table fields, not arbitrary DB columns.
      // Keep bulan out of SELECT so legacy annual schemas can still be read.
      const columns = [...new Set(['dusun_id', 'tahun', ...(table === 'data_umum' ? ['updated_at'] : []), ...getTableKeys(table), ...PUBLIC_COLUMNS[table]])].filter((key) => key !== 'bulan');
      const build = () => db.from(table).select(columns.join(',')).eq('tahun', year).in('dusun_id', ids);
      if (!MONTHLY.has(table)) return checked(build());
      return (async () => {
        const result = await build().eq('bulan', bulan);
        if (isMissingColumnError(result.error, 'bulan')) {
          legacyAnnual.add(table);
          return checked(build());
        }
        return checked(result);
      })();
    };
    [rows[table], previous[table]] = await Promise.all([readYear(tahun), readYear(tahun - 1)]);
  }));
  const tableStatuses = (id) => Object.fromEntries(PUBLIC_TABLES.map((table) => {
    const keys = getTableKeys(table).filter((key) => !hidden[table]?.has(key));
    const result = evaluateRecordCompleteness(rows[table].find((row) => row.dusun_id === id), keys, previous[table].find((row) => row.dusun_id === id));
    return [table, { status: result.status, label: STATUS_LABELS[result.status] }];
  }));
  const availability = Object.fromEntries(PUBLIC_TABLES.map((table) => [table, rows[table].length > 0]));
  const periods = Object.fromEntries(PUBLIC_TABLES.map((table) => [table, legacyAnnual.has(table) ? 'annual_legacy' : MONTHLY.has(table) ? 'monthly' : 'annual']));
  return { dusun, rows, tableStatuses, availability, periods, hasData: PUBLIC_TABLES.some((table) => rows[table].length > 0) };
}

export function serializePublicRow(row, table) {
  if (!row) return null;
  return Object.fromEntries(Object.entries(pickPublicFields(row, table)).map(([key, value]) => [key, toNumericValue(value)]));
}

export function publicUnitStatus(source, id) {
  const tableStatuses = source.tableStatuses(id);
  const status = mergeStatus(Object.values(tableStatuses).map((entry) => entry.status));
  return { tableStatuses, status, statusLabel: STATUS_LABELS[status] };
}

export async function getPublicTrend(id, tahun, bulan) {
  const db = database();
  const years = Array.from({ length: 5 }, (_, i) => tahun - 4 + i);
  const [umum, pokja4] = await Promise.all([
    checked(queryWithOptionalMonth(() => db.from('data_umum').select('tahun,jml_kk,jml_jiwa_l,jml_jiwa_p,jml_dasa_wisma').eq('dusun_id', id).in('tahun', years), bulan)),
    checked(db.from('data_pokja4').select('tahun,posyandu_jumlah').eq('dusun_id', id).in('tahun', years)),
  ]);
  return years.map((year) => {
    const u = umum.find((row) => Number(row.tahun) === year);
    const p = pokja4.find((row) => Number(row.tahun) === year);
    return { tahun: year, total_kk: u ? toNumericValue(u.jml_kk) : null, total_jiwa: u ? toNumericValue(u.jml_jiwa_l) + toNumericValue(u.jml_jiwa_p) : null, total_dasa_wisma: u ? toNumericValue(u.jml_dasa_wisma) : null, total_posyandu: p ? toNumericValue(p.posyandu_jumlah) : null };
  });
}

export { PUBLIC_COLUMNS, PUBLIC_TABLES };
