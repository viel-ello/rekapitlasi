/**
 * @file Data Umum API Route — pakai createPokjaHandler.
 */
import { createPokjaHandler } from '@/lib/api-handler';

export const { GET, POST } = createPokjaHandler('data_umum');
