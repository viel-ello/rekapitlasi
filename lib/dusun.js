/**
 * @file Dusun helper — pengganti lib/desa lama (kalau ada).
 * Sumber tunggal untuk daftar dusun di Desa Belikurip.
 */

import { supabase } from '@/lib/supabase';

/**
 * Daftar 9 dusun Belikurip dalam urutan resmi.
 * Dipakai sebagai fallback statis kalau DB belum di-seed (test, env baru).
 */
export const DUSUN_LIST = [
  'Soko',
  'Melikan',
  'Jamprit Wetan',
  'Jamprit Kulon',
  'Belikurip',
  'Pagersari',
  'Klerong',
  'Tanjung',
  'Banyuripan',
];

/**
 * Mapping role kader-dusun → nama dusun (untuk auto-assign user.dusun_id saat
 * admin pilih role kader-dusun).
 */
export const ROLE_TO_DUSUN_NAME = {
  dusun_soko: 'Soko',
  dusun_melikan: 'Melikan',
  dusun_jamprit_wetan: 'Jamprit Wetan',
  dusun_jamprit_kulon: 'Jamprit Kulon',
  dusun_belikurip: 'Belikurip',
  dusun_pagersari: 'Pagersari',
  dusun_klerong: 'Klerong',
  dusun_tanjung: 'Tanjung',
  dusun_banyuripan: 'Banyuripan',
};

/**
 * Daftar role kader-dusun (untuk validasi).
 */
export const DUSUN_ROLES = Object.keys(ROLE_TO_DUSUN_NAME);

/**
 * Ambil daftar dusun dari Supabase. Sort by nomor_urut ascending.
 *
 * @param {{ activeOnly?: boolean }} options
 * @returns {Promise<Array<{ id: number, nama: string, nomor_urut: number, is_active: number }>>}
 */
export async function getDusunList({ activeOnly = true } = {}) {
  let query = supabase.from('dusun').select('id, nama, nomor_urut, is_active').order('nomor_urut', { ascending: true });
  if (activeOnly) query = query.eq('is_active', 1);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
