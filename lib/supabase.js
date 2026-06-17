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

// Anon client — untuk endpoint publik (/api/public/*) yang tidak butuh service role.
// Defense-in-depth: kalau suatu saat RLS diaktifkan, client ini hanya bisa baca
// data sesuai policy publik, sedangkan handler yang lupa auth tidak otomatis
// bypass RLS.
//
// Kebijakan environment:
//   - PRODUCTION: anon key WAJIB. Tanpa itu fail-fast (throw) supaya endpoint
//     publik tidak diam-diam pakai service role (yang bypass RLS).
//   - DEV/TEST: boleh fallback ke service role demi DX, tapi dengan warning jelas.
const isProduction = process.env.NODE_ENV === 'production';

let _supabaseAnon;
if (anonKey) {
  _supabaseAnon = createClient(supabaseUrl || '', anonKey, { auth: { persistSession: false } });
} else if (isServer && isProduction) {
  // Fail-fast LAZY: jangan throw saat module load (akan mematahkan `next build`),
  // tapi throw saat client benar-benar dipakai menangani request. Public routes
  // bersifat force-dynamic sehingga tidak dievaluasi saat build. Ini mencegah
  // endpoint publik diam-diam memakai service role (bypass RLS) di production.
  _supabaseAnon = new Proxy({}, {
    get() {
      throw new Error(
        'FATAL: NEXT_PUBLIC_SUPABASE_ANON_KEY wajib di-set di production. ' +
        'Public endpoint (/api/public/*) tidak boleh fallback ke service role karena bypass RLS. ' +
        'Set anon/public key dari Supabase Dashboard → Settings → API.'
      );
    },
  });
} else {
  if (isServer) {
    console.warn(
      '[supabase] PERINGATAN: NEXT_PUBLIC_SUPABASE_ANON_KEY belum di-set. ' +
      'supabaseAnon fallback ke SERVICE ROLE (bypass RLS) — HANYA untuk dev/test. ' +
      'Di production, public endpoint akan menolak request sampai anon key di-set.'
    );
  }
  _supabaseAnon = supabase;
}
export const supabaseAnon = _supabaseAnon;
