'use client';

import NestedDataPage from '@/components/NestedDataPage';

/**
 * Pokja III — pixel-perfect sesuai gambar referensi (tema cyan).
 *
 * Header level 1: JUMLAH KADER | PANGAN | JUMLAH INDUSTRI RUMAH TANGGA | JUMLAH RUMAH | KETERANGAN
 *
 * Level 2:
 *   - JUMLAH KADER → leaf vertikal: PANGAN, SANDANG, TATA LAKSANA RUMAH TANGGA
 *   - PANGAN → MAKANAN POKOK | PEMANFAATAN PEKARANGAN HATINYA PKK
 *   - JUMLAH INDUSTRI RUMAH TANGGA → leaf vertikal: PANGAN, SANDANG, JASA
 *   - JUMLAH RUMAH → leaf vertikal: SEHAT DAN LAYAK HUNI, TIDAK SEHAT DAN TIDAK LAYAK HUNI
 *
 * Level 3 di bawah PANGAN:
 *   - MAKANAN POKOK → BERAS, NON BERAS (vertikal)
 *   - PEMANFAATAN PEKARANGAN HATINYA PKK →
 *       PETERNAKAN, PERIKANAN, WARUNG HIDUP, LUMBUNG HIDUP, TOGA, TANAMAN KERAS (vertikal)
 *
 * Total: 17 leaves + 2 (No + Nama) = 19 kolom.
 */

const POKJA3_TREE = [
  {
    kind: 'group', label: 'JUMLAH KADER',
    children: [
      { kind: 'leaf', key: 'kader_pangan', label: 'PANGAN', vertical: true },
      { kind: 'leaf', key: 'kader_sandang', label: 'SANDANG', vertical: true },
      { kind: 'leaf', key: 'kader_tata_laksana_rt', label: 'TATA LAKSANA RUMAH TANGGA', vertical: true },
    ],
  },
  {
    kind: 'group', label: 'PANGAN',
    children: [
      {
        kind: 'group', label: 'MAKANAN POKOK',
        children: [
          { kind: 'leaf', key: 'pangan_beras', label: 'BERAS', vertical: true },
          { kind: 'leaf', key: 'pangan_non_beras', label: 'NON BERAS', vertical: true },
        ],
      },
      {
        kind: 'group', label: 'PEMANFAATAN PEKARANGAN HATINYA PKK',
        children: [
          { kind: 'leaf', key: 'pemanfaatan_peternakan', label: 'PETERNAKAN', vertical: true },
          { kind: 'leaf', key: 'pemanfaatan_perikanan', label: 'PERIKANAN', vertical: true },
          { kind: 'leaf', key: 'pemanfaatan_warung_hidup', label: 'WARUNG HIDUP', vertical: true },
          { kind: 'leaf', key: 'pemanfaatan_lumbung_hidup', label: 'LUMBUNG HIDUP', vertical: true },
          { kind: 'leaf', key: 'pemanfaatan_toga', label: 'TOGA', vertical: true },
          { kind: 'leaf', key: 'pemanfaatan_tanaman_keras', label: 'TANAMAN KERAS', vertical: true },
        ],
      },
    ],
  },
  {
    kind: 'group', label: 'JUMLAH INDUSTRI RRUMAH TANGGA',
    children: [
      { kind: 'leaf', key: 'industri_pangan', label: 'PANGAN', vertical: true },
      { kind: 'leaf', key: 'industri_sandang', label: 'SANDANG', vertical: true },
      { kind: 'leaf', key: 'industri_jasa', label: 'JASA', vertical: true },
    ],
  },
  {
    kind: 'group', label: 'JUMLAH RUMAH',
    children: [
      { kind: 'leaf', key: 'rumah_sehat', label: 'SEHAT DAN LAYAK HUNI', vertical: true },
      { kind: 'leaf', key: 'rumah_kurang_sehat', label: 'TIDAK SEHAT DAN TIDAK LAYAK HUNI', vertical: true },
    ],
  },
  { kind: 'leaf', key: 'keterangan', label: 'KETERANGAN', type: 'text', vertical: true },
];

function TitleBlock(tahun) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div
        className="relative px-4 py-4"
        style={{ background: '#0e7490', color: '#fff' }}
      >
        <div className="text-center text-sm font-bold uppercase leading-snug">
          <div>DATA KEGIATAN PKK</div>
          <div>TP PKK DESA BELIKURIP</div>
          <div>TAHUN {tahun}</div>
        </div>
        <div
          className="absolute left-4 bottom-2 text-sm font-bold tracking-wide"
          style={{ color: '#fff' }}
        >
          POKJA III
        </div>
      </div>
    </div>
  );
}

const POKJA3_THEME = {
  bg: '#0e7490',  // cyan-700, sesuai gambar
  fg: '#ffffff',
  borderColor: '#ffffff',
};

export default function Pokja3DataPage({ config }) {
  return (
    <NestedDataPage
      config={config}
      tree={POKJA3_TREE}
      titleBlock={TitleBlock}
      unitLabel="Dusun"
      unitColumnLabel="NAMA DUSUN"
      headerTheme={POKJA3_THEME}
    />
  );
}
