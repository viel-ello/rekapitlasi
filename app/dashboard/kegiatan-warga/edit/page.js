import { redirect } from 'next/navigation';

/**
 * Backward-compat: route lama /dashboard/kegiatan-warga/edit di-redirect ke
 * canonical /dashboard/rekap-dawis/edit.
 */
export default function KegiatanWargaEditRedirect() {
  redirect('/dashboard/rekap-dawis/edit');
}
