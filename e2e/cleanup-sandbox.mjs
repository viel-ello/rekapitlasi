#!/usr/bin/env node
/**
 * @file Hapus baris sandbox tahun 2099 yang dibuat e2e/tests/crud.spec.mjs.
 *
 * Tabel data tidak punya endpoint DELETE (lib/api-handler.js hanya GET + POST),
 * jadi pembersihan harus lewat service-role key langsung.
 *
 * Pengamanan:
 * - SANDBOX_YEAR di-hardcode 2099. Script menolak tahun lain, bahkan lewat env.
 * - Menampilkan persis apa yang akan dihapus, lalu berhenti. Perlu flag
 *   --confirm untuk benar-benar menghapus.
 * - Setiap delete di-scope `.eq('tahun', 2099)`. Tidak pernah ada delete tanpa filter.
 *
 * Pakai:
 *   node e2e/cleanup-sandbox.mjs             # dry-run, tampilkan saja
 *   node e2e/cleanup-sandbox.mjs --confirm   # benar-benar hapus
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Hardcoded. Tidak dibaca dari env — satu typo di sini menghapus data asli.
const SANDBOX_YEAR = 2099;

const TABLES = [
  'data_umum',
  'data_pokja1',
  'data_pokja2',
  'data_pokja3',
  'data_pokja4',
  'data_bumil',
  'data_rekap_dawis',
];

if (SANDBOX_YEAR !== 2099) {
  console.error('FATAL: SANDBOX_YEAR bukan 2099. Script ini hanya boleh menyentuh tahun sandbox.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env.local');
  process.exit(1);
}

const confirmed = process.argv.includes('--confirm');
const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log(`Target: ${url}`);
console.log(`Tahun sandbox: ${SANDBOX_YEAR}`);
console.log(confirmed ? 'Mode: HAPUS\n' : 'Mode: dry-run (pakai --confirm untuk menghapus)\n');

let total = 0;

for (const table of TABLES) {
  const { data, error } = await supabase
    .from(table)
    .select('id, dusun_id, tahun')
    .eq('tahun', SANDBOX_YEAR);

  if (error) {
    // Tabel bisa saja belum ada di deployment tertentu; itu bukan kegagalan.
    console.log(`${table.padEnd(20)} dilewati (${error.message})`);
    continue;
  }

  const rows = data || [];
  total += rows.length;
  console.log(`${table.padEnd(20)} ${rows.length} baris tahun ${SANDBOX_YEAR}`);

  if (rows.length > 0 && confirmed) {
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .eq('tahun', SANDBOX_YEAR);

    if (delError) {
      console.error(`  GAGAL menghapus dari ${table}: ${delError.message}`);
      process.exitCode = 1;
    } else {
      console.log(`  dihapus ${rows.length} baris`);
    }
  }
}

console.log();
if (total === 0) {
  console.log('Tidak ada baris sandbox. Tidak ada yang perlu dibersihkan.');
} else if (confirmed) {
  console.log(`Selesai. ${total} baris dihapus.`);
  console.log('Catatan: entri audit_logs bersifat append-only dan tetap ada.');
} else {
  console.log(`${total} baris akan dihapus. Jalankan ulang dengan --confirm.`);
}
