/**
 * @file Deprecated backup endpoint.
 *
 * Aplikasi sudah pindah ke Supabase. Backup file SQLite tidak lagi relevan.
 * Supabase Free Plan tidak menyediakan automated backup, jadi gunakan salah
 * satu opsi manual:
 *   1. pg_dump dari mesin lokal.
 *   2. Export CSV per tabel via Supabase SQL Editor.
 *   3. Export Excel per tabel dari panel admin (tab Database).
 *
 * Detail panduan ada di panel admin (`/dashboard/admin` → tab Database).
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const BACKUP_GUIDE = [
  'Supabase Free Plan tidak menyediakan automated backup.',
  'Lakukan salah satu cara manual berikut:',
  '1. pg_dump dari mesin lokal: pg_dump "postgres://USER:PASS@db.HOST.supabase.co:5432/postgres" --data-only > backup.sql',
  '2. Export CSV per tabel via Supabase SQL Editor.',
  '3. Export Excel per tabel dari panel admin (tab Database).',
].join(' ');

function deprecated() {
  return NextResponse.json(
    {
      error: 'Endpoint backup file SQLite tidak tersedia karena database sudah pindah ke Supabase.',
      hint: BACKUP_GUIDE,
    },
    { status: 410 }
  );
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin || admin.__forbidden) return requireAdmin.deny(admin);
  return deprecated();
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin || admin.__forbidden) return requireAdmin.deny(admin);
  return deprecated();
}
