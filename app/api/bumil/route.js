/**
 * @file Bumil API Route — pakai createPokjaHandler dengan requireMonth.
 * Migration v5: unit data dusun, kolom akte_l/akte_p/keterangan baru.
 */
import { createPokjaHandler } from '@/lib/api-handler';

export const { GET, POST } = createPokjaHandler('data_bumil', { requireMonth: true });
