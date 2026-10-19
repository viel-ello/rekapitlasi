/**
 * @file Inventaris route statis, diturunkan dari struktur `app/`.
 * Segmen dinamis ([id]) diisi saat runtime dari e2e-artifacts/discovery.json
 * yang dihasilkan auth.setup.mjs.
 */

/** Route publik — tidak butuh login. */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/publik',
];

/** Route dashboard — butuh cookie auth-token yang valid (dijaga proxy.js). */
export const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/data-umum',
  '/dashboard/data-umum/edit',
  '/dashboard/pokja1',
  '/dashboard/pokja1/edit',
  '/dashboard/pokja2',
  '/dashboard/pokja2/edit',
  '/dashboard/pokja3',
  '/dashboard/pokja3/edit',
  '/dashboard/pokja4',
  '/dashboard/pokja4/edit',
  '/dashboard/rekap-dawis',
  '/dashboard/rekap-dawis/edit',
  '/dashboard/bumil',
  '/dashboard/bumil/edit',
  '/dashboard/approval',
  '/dashboard/reports',
  '/dashboard/notifications',
  '/dashboard/profile',
  '/dashboard/admin',
];

/**
 * Route legacy yang seharusnya redirect ke canonical (migrasi v5).
 * Lihat AGENTS.md — "Route lama /dashboard/kegiatan-warga[/edit] di-redirect".
 */
export const LEGACY_REDIRECTS = [
  { from: '/dashboard/kegiatan-warga', to: '/dashboard/rekap-dawis' },
  { from: '/dashboard/kegiatan-warga/edit', to: '/dashboard/rekap-dawis/edit' },
];

/** Template route dinamis; `:id` diganti id dusun asli dari API. */
export const DYNAMIC_TEMPLATES = {
  public: ['/publik/dusun/:id'],
  dashboard: ['/dashboard/dusun/:id'],
};

/** Ubah path jadi nama file yang aman untuk screenshot. */
export function slug(route) {
  const s = route.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || 'root';
}
