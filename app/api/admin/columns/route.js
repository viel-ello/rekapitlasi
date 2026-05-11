import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, requireAuth, requireAdmin } from '@/lib/auth';

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

    // Format column key to be safe (lowercase, underscores)
    const safeKey = column_key.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const { error } = await supabase
      .from('table_schemas')
      .insert({
        table_name,
        column_key: safeKey,
        column_label,
        column_type: column_type || 'text'
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

    const { error } = await supabase.from('table_schemas').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting column:', error);
    return NextResponse.json({ error: 'Gagal menghapus kolom' }, { status: 500 });
  }
}
