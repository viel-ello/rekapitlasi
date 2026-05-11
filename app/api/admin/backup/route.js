/**
 * @file Deprecated backup endpoint
 * Aplikasi sudah pindah ke Supabase, backup file SQLite tidak lagi relevan.
 * Gunakan fitur backup bawaan Supabase Dashboard atau export Excel untuk pertukaran data.
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

function deprecated() {
  return NextResponse.json({
    error: 'Fitur backup file SQLite tidak tersedia. Database sekarang di Supabase. Gunakan Supabase Dashboard untuk backup/restore database.',
  }, { status: 410 });
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
