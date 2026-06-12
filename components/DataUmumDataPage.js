'use client';

import NestedDataPage from '@/components/NestedDataPage';

/**
 * Data Umum — pixel-perfect sesuai gambar referensi.
 * Layout:
 *   Title block:
 *     DATA UMUM
 *     TP PKK DESA BELIKURIP
 *     KECAMATAN : BATURETNO
 *     KABUPATEN : WONOGIRI
 *     PROVINSI  : JAWA TENGAH
 *     TAHUN     : <tahun>
 *
 *   Tabel 20 kolom, header 3 baris (depth 3):
 *     Group: JUMLAH KELOMPOK (PKK RW, PKK RT, DASA WISMA)
 *     Group: JUMLAH (KK, KRT)
 *     Group: JUMLAH JIWA (L, P)
 *     Group: JUMLAH KADER
 *       └ ANG TP PKK (L, P)
 *       └ UMUM (L, P)
 *       └ KHUSUS (L, P)
 *     Group: JUMLAH TENAGA SEKARANG
 *       └ HONORER (L, P)
 *       └ BANTUAN (L, P)
 *     Leaf: KETERANGAN (rowSpan all)
 */

const DATA_UMUM_TREE = [
  {
    kind: 'group', label: 'JUMLAH KELOMPOK',
    children: [
      { kind: 'leaf', key: 'jml_pkk_rw', label: 'PKK RW' },
      { kind: 'leaf', key: 'jml_pkk_rt', label: 'PKK RT' },
      { kind: 'leaf', key: 'jml_dasa_wisma', label: 'DASA WISMA' },
    ],
  },
  {
    kind: 'group', label: 'JUMLAH',
    children: [
      { kind: 'leaf', key: 'jml_kk', label: 'KK' },
      { kind: 'leaf', key: 'jml_krt', label: 'KRT' },
    ],
  },
  {
    kind: 'group', label: 'JUMLAH JIWA',
    children: [
      { kind: 'leaf', key: 'jml_jiwa_l', label: 'L' },
      { kind: 'leaf', key: 'jml_jiwa_p', label: 'P' },
    ],
  },
  {
    kind: 'group', label: 'JUMLAH KADER',
    children: [
      {
        kind: 'group', label: 'ANG TP PKK',
        children: [
          { kind: 'leaf', key: 'jml_kader_tp_pkk_l', label: 'L' },
          { kind: 'leaf', key: 'jml_kader_tp_pkk_p', label: 'P' },
        ],
      },
      {
        kind: 'group', label: 'UMUM',
        children: [
          { kind: 'leaf', key: 'jml_kader_umum_l', label: 'L' },
          { kind: 'leaf', key: 'jml_kader_umum_p', label: 'P' },
        ],
      },
      {
        kind: 'group', label: 'KHUSUS',
        children: [
          { kind: 'leaf', key: 'jml_kader_khusus_l', label: 'L' },
          { kind: 'leaf', key: 'jml_kader_khusus_p', label: 'P' },
        ],
      },
    ],
  },
  {
    kind: 'group', label: 'JUMLAH TENAGA SEKARANG',
    children: [
      {
        kind: 'group', label: 'HONORER',
        children: [
          { kind: 'leaf', key: 'jml_tenaga_honorer_l', label: 'L' },
          { kind: 'leaf', key: 'jml_tenaga_honorer_p', label: 'P' },
        ],
      },
      {
        kind: 'group', label: 'BANTUAN',
        children: [
          { kind: 'leaf', key: 'jml_tenaga_bantuan_l', label: 'L' },
          { kind: 'leaf', key: 'jml_tenaga_bantuan_p', label: 'P' },
        ],
      },
    ],
  },
  { kind: 'leaf', key: 'keterangan', label: 'KETERANGAN', type: 'text' },
];

function TitleBlock(tahun, bulan) {
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const labelStyle = { display: 'inline-block', minWidth: 100, fontWeight: 600 };
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-center text-sm font-bold uppercase leading-snug text-gray-900">
        <div>DATA UMUM</div>
        <div>TP PKK DESA BELIKURIP</div>
      </div>
      <div className="mt-3 text-sm text-gray-700">
        <div><span style={labelStyle}>KECAMATAN</span>: BATURETNO</div>
        <div><span style={labelStyle}>KABUPATEN</span>: WONOGIRI</div>
        <div><span style={labelStyle}>PROVINSI</span>: JAWA TENGAH</div>
        {bulan != null && <div><span style={labelStyle}>BULAN</span>: {MONTHS[bulan - 1]}</div>}
        <div><span style={labelStyle}>TAHUN</span>: {tahun}</div>
      </div>
    </div>
  );
}

export default function DataUmumDataPage({ config }) {
  return (
    <NestedDataPage
      config={config}
      tree={DATA_UMUM_TREE}
      titleBlock={TitleBlock}
      unitLabel="Dusun"
      unitColumnLabel="NAMA DUSUN/LING"
    />
  );
}
