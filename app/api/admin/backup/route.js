/**
 * @file Database Backup & Restore API (admin only)
 * GET /api/admin/backup — download .db file
 * POST /api/admin/backup — upload .db file to replace current
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'pkk_rekapitulasi.db');

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat mengakses fitur ini' }, { status: 403 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const timestamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="backup_pkk_${timestamp}.db"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat mengakses fitur ini' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'File database harus diunggah' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Basic validation: SQLite files start with "SQLite format 3"
    const header = buffer.slice(0, 16).toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      return NextResponse.json({ error: 'File yang diunggah bukan database SQLite yang valid' }, { status: 400 });
    }

    // Backup current db before overwriting
    const backupPath = dbPath + '.bak';
    fs.copyFileSync(dbPath, backupPath);

    // Write new db
    fs.writeFileSync(dbPath, buffer);

    return NextResponse.json({ success: true, message: 'Database berhasil dipulihkan. Silakan restart server.' });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Gagal memulihkan database' }, { status: 500 });
  }
}
