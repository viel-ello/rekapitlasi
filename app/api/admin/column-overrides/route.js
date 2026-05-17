/**
 * @file Admin Column Overrides API
 * GET  /api/admin/column-overrides?table_name=data_umum
 *   Tersedia untuk semua user yang login (read-only),
 *   karena halaman data entry ikut membaca override untuk render.
 * POST /api/admin/column-overrides  — upsert rename/hide (admin only)
 * DELETE /api/admin/column-overrides?id=123 — reset ke default (admin only)
 *
 * Schema override dipakai untuk MENGUBAH LABEL atau MENYEMBUNYIKAN kolom standar.
 * Data di database tidak dihapus, hanya disembunyikan dari UI standar.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { DATA_PAGES } from '@/lib/dataPages';

// Whitelist semua tabel yang valid (Object.values(DATA_PAGES) sudah skip
// `kegiatanWarga` alias karena non-enumerable)
const VALID_TABLES = new Set(
  Object.values(DATA_PAGES).map((page) => page.tableName)
);
// Backward-compat: terima nama lama supaya UI/admin lama tidak break.
VALID_TABLES.add('data_kegiatan_warga');

// Whitelist semua kolom standar per tabel
const VALID_KEYS_PER_TABLE = Object.values(DATA_PAGES).reduce((acc, page) => {
  acc[page.tableName] = new Set(page.columns.map((c) => c.key));
  return acc;
}, {});
// Backward-compat alias
if (VALID_KEYS_PER_TABLE.data_rekap_dawis) {
  VALID_KEYS_PER_TABLE.data_kegiatan_warga = VALID_KEYS_PER_TABLE.data_rekap_dawis;
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name');

    let query = supabase.from('table_column_overrides').select('*');
    if (tableName) query = query.eq('table_name', tableName);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching column overrides:', error);
    return NextResponse.json({ error: 'Gagal memuat override kolom' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const body = await request.json();
    const { table_name, column_key, label_override, is_hidden } = body;

    if (!table_name || !column_key) {
      return NextResponse.json({ error: 'table_name dan column_key harus diisi' }, { status: 400 });
    }
    if (!VALID_TABLES.has(table_name)) {
      return NextResponse.json({ error: 'Nama tabel tidak valid' }, { status: 400 });
    }
    if (!VALID_KEYS_PER_TABLE[table_name]?.has(column_key)) {
      return NextResponse.json({ error: `Kolom "${column_key}" tidak dikenal di tabel ${table_name}` }, { status: 400 });
    }

    const label = typeof label_override === 'string' ? label_override.trim().slice(0, 120) : null;
    const hidden = is_hidden ? 1 : 0;

    const payload = {
      table_name,
      column_key,
      label_override: label || null,
      is_hidden: hidden,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('table_column_overrides')
      .upsert(payload, { onConflict: 'table_name,column_key' });

    if (error) throw error;

    await writeLog({
      userId: admin.userId,
      username: admin.username,
      action: 'update',
      tableName: 'table_column_overrides',
      detail: `Override kolom ${column_key} pada ${table_name}: label="${label || '-'}", hidden=${hidden}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving column override:', error);
    return NextResponse.json({ error: 'Gagal menyimpan override kolom' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tableName = searchParams.get('table_name');
    const columnKey = searchParams.get('column_key');

    if (!id && !(tableName && columnKey)) {
      return NextResponse.json({ error: 'id atau (table_name + column_key) harus diisi' }, { status: 400 });
    }

    let query = supabase.from('table_column_overrides').delete();
    if (id) query = query.eq('id', id);
    else query = query.eq('table_name', tableName).eq('column_key', columnKey);

    const { error } = await query;
    if (error) throw error;

    await writeLog({
      userId: admin.userId,
      username: admin.username,
      action: 'delete',
      tableName: 'table_column_overrides',
      detail: `Reset override ${tableName || id}/${columnKey || ''}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting column override:', error);
    return NextResponse.json({ error: 'Gagal menghapus override kolom' }, { status: 500 });
  }
}
