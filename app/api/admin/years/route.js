/**
 * @file Admin Years API
 * GET    /api/admin/years         — list semua tahun (aktif + non-aktif)
 * POST   /api/admin/years         — tambah tahun baru { tahun }
 * PATCH  /api/admin/years         — toggle is_active { tahun, is_active }
 * DELETE /api/admin/years?tahun=Y — hapus tahun dari daftar (data di tabel lain tetap)
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { writeLog } from '@/lib/audit';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { data, error } = await supabase
      .from('report_years')
      .select('*')
      .order('tahun', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Admin years GET error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar tahun' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const body = await request.json();
    const tahun = Number(body.tahun);

    if (!Number.isInteger(tahun) || tahun < MIN_YEAR || tahun > MAX_YEAR) {
      return NextResponse.json(
        { error: `Tahun tidak valid. Harus antara ${MIN_YEAR} dan ${MAX_YEAR}.` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('report_years')
      .insert({ tahun, is_active: 1 });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Tahun ${tahun} sudah terdaftar` }, { status: 409 });
      }
      throw error;
    }

    await writeLog({
      userId: admin.userId,
      username: admin.username,
      action: 'create',
      tableName: 'report_years',
      detail: `Tambah tahun ${tahun}`,
    });

    return NextResponse.json({ success: true, tahun });
  } catch (error) {
    console.error('Admin years POST error:', error);
    return NextResponse.json({ error: 'Gagal menambah tahun' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const body = await request.json();
    const tahun = Number(body.tahun);
    const isActive = body.is_active ? 1 : 0;

    if (!Number.isInteger(tahun)) {
      return NextResponse.json({ error: 'Tahun tidak valid' }, { status: 400 });
    }

    const { error } = await supabase
      .from('report_years')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('tahun', tahun);

    if (error) throw error;

    await writeLog({
      userId: admin.userId,
      username: admin.username,
      action: 'update',
      tableName: 'report_years',
      detail: `Tahun ${tahun} ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin years PATCH error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui tahun' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin || admin.__forbidden) return requireAdmin.deny(admin);

    const { searchParams } = new URL(request.url);
    const tahun = Number(searchParams.get('tahun'));

    if (!Number.isInteger(tahun)) {
      return NextResponse.json({ error: 'Parameter tahun wajib' }, { status: 400 });
    }

    const { error } = await supabase
      .from('report_years')
      .delete()
      .eq('tahun', tahun);

    if (error) throw error;

    await writeLog({
      userId: admin.userId,
      username: admin.username,
      action: 'delete',
      tableName: 'report_years',
      detail: `Hapus tahun ${tahun} dari daftar`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin years DELETE error:', error);
    return NextResponse.json({ error: 'Gagal menghapus tahun' }, { status: 500 });
  }
}
