/**
 * @file Kegiatan Warga API — DEPRECATED, alias untuk /api/rekap-dawis.
 *
 * Tabel `data_kegiatan_warga` telah di-rename ke `data_rekap_dawis` di v5.
 * Endpoint ini tetap melayani permintaan lama — handler otomatis normalize
 * tabel target ke `data_rekap_dawis`. Caller baru sebaiknya pakai
 * `/api/rekap-dawis`.
 */
import { createPokjaHandler } from '@/lib/api-handler';

export const { GET, POST } = createPokjaHandler('data_kegiatan_warga');
