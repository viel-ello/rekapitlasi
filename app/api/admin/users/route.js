/**
 * @file Admin Users API
 * GET — list all users
 * POST — create new user
 * DELETE — delete user
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, nama_lengkap, role, created_at')
      .order('id');

    if (error) throw error;
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { username, password, nama_lengkap, role } = await request.json();

    if (!username || !password || !nama_lengkap) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);

    const { error } = await supabase
      .from('users')
      .insert({ username, password_hash, nama_lengkap, role: role || 'user' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menambahkan pengguna' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 });
    }

    // Hindari error foreign key dengan mengosongkan user_id di audit_logs
    await supabase.from('audit_logs').update({ user_id: null }).eq('user_id', id);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .neq('username', 'admin');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, role, nama_lengkap, password } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 });

    const updates = {};
    if (role) updates.role = role;
    if (nama_lengkap) updates.nama_lengkap = nama_lengkap;
    if (password) updates.password_hash = await hashPassword(password);

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui pengguna' }, { status: 500 });
  }
}
