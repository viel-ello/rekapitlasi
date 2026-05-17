import { redirect } from 'next/navigation';

/**
 * Backward-compat: route lama /dashboard/kegiatan-warga di-redirect ke
 * canonical /dashboard/rekap-dawis.
 */
export default function KegiatanWargaRedirect() {
  redirect('/dashboard/rekap-dawis');
}
