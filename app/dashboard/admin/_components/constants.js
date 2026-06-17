/**
 * @file Konstanta bersama untuk komponen Admin Panel.
 */

export const ROLES = [
  // Role utama
  'admin', 'pokja1', 'pokja2', 'pokja3', 'pokja4', 'user',
  // 9 role kader-dusun (auto-assign dusun_id berdasarkan role)
  'dusun_soko', 'dusun_melikan', 'dusun_jamprit_wetan', 'dusun_jamprit_kulon',
  'dusun_belikurip', 'dusun_pagersari', 'dusun_klerong', 'dusun_tanjung', 'dusun_banyuripan',
];

export const ROLE_LABELS = {
  admin: 'admin (akses penuh)',
  pokja1: 'pokja1 — Pancasila & Gotong Royong',
  pokja2: 'pokja2 — Pendidikan & Koperasi',
  pokja3: 'pokja3 — Pangan & Sandang',
  pokja4: 'pokja4 — Kesehatan & Lingkungan',
  user: 'user (read-only)',
  dusun_soko: 'Kader Dusun Soko (Data Umum, Rekap Dawis, Bumil — dusun Soko)',
  dusun_melikan: 'Kader Dusun Melikan (Data Umum, Rekap Dawis, Bumil — dusun Melikan)',
  dusun_jamprit_wetan: 'Kader Dusun Jamprit Wetan (Data Umum, Rekap Dawis, Bumil — dusun Jamprit Wetan)',
  dusun_jamprit_kulon: 'Kader Dusun Jamprit Kulon (Data Umum, Rekap Dawis, Bumil — dusun Jamprit Kulon)',
  dusun_belikurip: 'Kader Dusun Belikurip (Data Umum, Rekap Dawis, Bumil — dusun Belikurip)',
  dusun_pagersari: 'Kader Dusun Pagersari (Data Umum, Rekap Dawis, Bumil — dusun Pagersari)',
  dusun_klerong: 'Kader Dusun Klerong (Data Umum, Rekap Dawis, Bumil — dusun Klerong)',
  dusun_tanjung: 'Kader Dusun Tanjung (Data Umum, Rekap Dawis, Bumil — dusun Tanjung)',
  dusun_banyuripan: 'Kader Dusun Banyuripan (Data Umum, Rekap Dawis, Bumil — dusun Banyuripan)',
};

export const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Helper baris label-value untuk modal detail. */
export function Field({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="col-span-2 text-sm text-gray-800 break-words">{value}</div>
    </div>
  );
}
