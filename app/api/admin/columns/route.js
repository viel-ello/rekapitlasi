import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, requireAuth, requireAdmin } from '@/lib/auth';
import { getValidTableNames, isValidTableName } from '@/lib/requestValidation';

const COLUMN_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
const VALID_COLUMN_TYPES = new Set(['text', 'number']);

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name');

    let query = supabase.from('table_schemas').select('*').order('created_at');
    
    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching columns:', error);
    return NextResponse.json({ error: 'Gagal mengambil definisi kolom' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { table_name, column_key, column_label, column_type } = await request.json();

    if (!table_name || !column_key || !column_label) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }
    if (!isValidTableName(table_name)) {
      return NextResponse.json({ error: `Nama tabel tidak valid. Pilih: ${getValidTableNames().join(', ')}` }, { status: 400 });
    }

    const safeKey = String(column_key).trim().toLowerCase();
    if (!COLUMN_KEY_PATTERN.test(safeKey)) {
      return NextResponse.json({ error: 'Key kolom harus diawali huruf dan hanya boleh huruf kecil, angka, underscore (2-64 karakter)' }, { status: 400 });
    }

    const safeType = column_type || 'text';
    if (!VALID_COLUMN_TYPES.has(safeType)) {
      return NextResponse.json({ error: 'Tipe kolom tidak valid' }, { status: 400 });
    }

    const safeLabel = String(column_label).trim().slice(0, 120);
    if (!safeLabel) {
      return NextResponse.json({ error: 'Label kolom harus diisi' }, { status: 400 });
    }

    const { error } = await supabase
      .from('table_schemas')
      .insert({
        table_name,
        column_key: safeKey,
        column_label: safeLabel,
        column_type: safeType,
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'Key kolom sudah digunakan di tabel ini' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating column:', error);
    return NextResponse.json({ error: 'Gagal menambahkan kolom' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 });
    }
    const columnId = Number(id);
    if (!Number.isInteger(columnId) || columnId < 1) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const { error } = await supabase.from('table_schemas').delete().eq('id', columnId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting column:', error);
    return NextResponse.json({ error: 'Gagal menghapus kolom' }, { status: 500 });
  }
}
