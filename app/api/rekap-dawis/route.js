/**
 * @file Rekapitulasi Dawis API (canonical)
 * Pengganti /api/kegiatan-warga lama. createPokjaHandler otomatis normalize
 * `data_kegiatan_warga` → `data_rekap_dawis` via lib/auth.normalizeTableName.
 */
import { createPokjaHandler } from '@/lib/api-handler';

export const { GET, POST } = createPokjaHandler('data_rekap_dawis');
