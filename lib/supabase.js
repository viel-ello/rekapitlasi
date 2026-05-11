import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isServer = typeof window === 'undefined';

// Fail-fast di server: modul ini dipakai di route handler yang butuh kredensial valid.
// Tanpa URL + key, request hanya akan gagal di tengah jalan dengan pesan kabur.
if (isServer && !supabaseUrl) {
  throw new Error('FATAL: NEXT_PUBLIC_SUPABASE_URL is not defined. Configure it in .env.local');
}
if (isServer && !serviceRoleKey && !anonKey) {
  throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is not defined');
}

// Default export: client yang dipakai route handler server.
// Service role > anon fallback (RLS tidak aktif pada tabel, sehingga tanpa service role
// beberapa query admin akan gagal silent — fail-fast di atas akan memaksa config benar).
export const supabase = createClient(
  supabaseUrl || '',
  serviceRoleKey || anonKey || '',
  { auth: { persistSession: false } }
);

// Admin-only client — identik dengan default saat ini, disediakan terpisah supaya
// pemakai bisa eksplisit bahwa mereka butuh service role (bypass RLS di masa depan).
export const supabaseAdmin = supabase;
