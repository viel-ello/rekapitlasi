/**
 * @file Admin Users API
 * GET — list all users
 * POST — create new user
 * PUT — update user
 * DELETE — delete user
 * All methods require admin role.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { VALID_ROLES } from '@/lib/requestValidation';

const MIN_PASSWORD_LENGTH = 12;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;

function validateUsername(username) {
  const value = String(username || '').trim();
  if (!USERNAME_PATTERN.test(value)) {
    return { error: 'Username harus 3-32 karakter dan hanya boleh huruf, angka, titik, underscore, atau strip' };
  }
  return { value };
}

function validateFullName(name) {
  const value = String(name || '').trim();
  if (value.length < 2 || value.length > 100) {
    return { error: 'Nama lengkap harus 2-100 karakter' };
  }
  return { value };
}

function validatePassword(password, { required = true } = {}) {
  if (!password && !required) return { value: null };
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter` };
  }
  return { value };
}

async function getAdminCount() {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (error) throw error;
  return count || 0;
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

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
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { username, password, nama_lengkap, role } = await request.json();

    if (!username || !password || !nama_lengkap) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }
    const validUsername = validateUsername(username);
    if (validUsername.error) return NextResponse.json({ error: validUsername.error }, { status: 400 });

    const validName = validateFullName(nama_lengkap);
    if (validName.error) return NextResponse.json({ error: validName.error }, { status: 400 });

    const validPassword = validatePassword(password);
    if (validPassword.error) return NextResponse.json({ error: validPassword.error }, { status: 400 });

    const nextRole = role || 'user';
    if (!VALID_ROLES.has(nextRole)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('username', validUsername.value).single();
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    const password_hash = await hashPassword(validPassword.value);

    const { error } = await supabase
      .from('users')
      .insert({ username: validUsername.value, password_hash, nama_lengkap: validName.value, role: nextRole });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menambahkan pengguna' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 });
    }

    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    if (targetId === admin.userId) {
      return NextResponse.json({ error: 'Admin tidak dapat menghapus akun yang sedang digunakan' }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('id', targetId)
      .single();
    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    if (targetUser.username === 'admin') {
      return NextResponse.json({ error: 'Akun admin bawaan tidak dapat dihapus' }, { status: 400 });
    }
    const adminCount = await getAdminCount();
    if (targetUser.role === 'admin' && adminCount <= 1) {
      return NextResponse.json({ error: 'Minimal harus ada satu admin aktif' }, { status: 400 });
    }

    // Hindari error foreign key dengan mengosongkan user_id di audit_logs
    await supabase.from('audit_logs').update({ user_id: null }).eq('user_id', targetId);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', targetId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus pengguna' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { id, role, nama_lengkap, password } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 });

    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetId)
      .single();
    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const updates = {};
    if (role) {
      if (!VALID_ROLES.has(role)) {
        return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
      }
      const adminCount = await getAdminCount();
      if (targetUser.role === 'admin' && role !== 'admin' && adminCount <= 1) {
        return NextResponse.json({ error: 'Minimal harus ada satu admin aktif' }, { status: 400 });
      }
      if (targetId === admin.userId && role !== 'admin') {
        return NextResponse.json({ error: 'Admin tidak dapat menurunkan role akun yang sedang digunakan' }, { status: 400 });
      }
      updates.role = role;
    }
    if (nama_lengkap) {
      const validName = validateFullName(nama_lengkap);
      if (validName.error) return NextResponse.json({ error: validName.error }, { status: 400 });
      updates.nama_lengkap = validName.value;
    }
    if (password) {
      const validPassword = validatePassword(password);
      if (validPassword.error) return NextResponse.json({ error: validPassword.error }, { status: 400 });
      updates.password_hash = await hashPassword(validPassword.value);
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('users').update(updates).eq('id', targetId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui pengguna' }, { status: 500 });
  }
}
