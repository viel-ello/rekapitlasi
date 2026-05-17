'use client';

import NestedDataPage from '@/components/NestedDataPage';

/**
 * Pokja IV — pixel-perfect sesuai gambar referensi (tema olive/mustard).
 *
 * Header level 1:
 *   JUMLAH KADER | KESEHATAN | KELESTARIAN LING. HIDUP | PERENCANAAN SEHAT | KET
 *
 * Level 2:
 *   - JUMLAH KADER → leaf vertikal: POSYANDU, GIZI, KESLING, PENYULUH NARKOBA, PHBS, KB (6)
 *   - KESEHATAN → POSYANDU (group level 3)
 *   - KELESTARIAN LING. HIDUP → JML RUMAH YG MEMILIKI (group), JML MCK (leaf), JML KRT YG MENGGUNAKAN AIR (group)
 *   - PERENCANAAN SEHAT → JML PUS, JML WUS, JML ASEPTOR KB (group L/P), JML KK YG MEMILIKI TABUNGAN
 *
 * Level 3:
 *   - POSYANDU → JUMLAH, TERINTEGRASI, LANSIA (group level 4)
 *   - JML RUMAH YG MEMILIKI → JAMBAN, SPAL, TEMPAT PEMBUANGAN SAMPAH (vertikal)
 *   - JML KRT YG MENGGUNAKAN AIR → PDAM, SUMUR, DLL (vertikal)
 *   - JML ASEPTOR KB → L, P
 *
 * Level 4:
 *   - LANSIA → JML KLP, JML ANG, JML YG MMLKI KARTU BEROBAT GRTAS (vertikal)
 *
 * Total: 24 leaves + 2 (No + Nama) = 26 kolom.
 */

const POKJA4_TREE = [
  {
    kind: 'group', label: 'JUMLAH KADER',
    children: [
      { kind: 'leaf', key: 'kader_posyandu', label: 'POSYANDU', vertical: true },
      { kind: 'leaf', key: 'kader_gizi', label: 'GIZI', vertical: true },
      { kind: 'leaf', key: 'kader_kesling', label: 'KESLING', vertical: true },
      { kind: 'leaf', key: 'kader_penyuluh_narkoba', label: 'PENYULUH NARKOBA', vertical: true },
      { kind: 'leaf', key: 'kader_phbs', label: 'PHBS', vertical: true },
      { kind: 'leaf', key: 'kader_kb', label: 'KB', vertical: true },
    ],
  },
  {
    kind: 'group', label: 'KESEHATAN',
    children: [
      {
        kind: 'group', label: 'POSYANDU',
        children: [
          { kind: 'leaf', key: 'posyandu_jumlah', label: 'JUMLAH', vertical: true },
          { kind: 'leaf', key: 'posyandu_terintegrasi', label: 'TERINTEGRASI', vertical: true },
          {
            kind: 'group', label: 'LANSIA',
            children: [
              { kind: 'leaf', key: 'lansia_jml_klp', label: 'JML KLP', vertical: true },
              { kind: 'leaf', key: 'lansia_jml_anggota', label: 'JML ANG', vertical: true },
              { kind: 'leaf', key: 'lansia_jml_kartu_berobat', label: 'JML YG MMLKI KARTU BEROBAT GRTAS', vertical: true },
            ],
          },
        ],
      },
    ],
  },
  {
    kind: 'group', label: 'KELESTARIAN LING. HIDUP',
    children: [
      {
        kind: 'group', label: 'JML RUMAH YG MEMILIKI',
        children: [
          { kind: 'leaf', key: 'rumah_jamban', label: 'JAMBAN', vertical: true },
          { kind: 'leaf', key: 'rumah_spal', label: 'SPAL', vertical: true },
          { kind: 'leaf', key: 'rumah_tempat_sampah', label: 'TEMPAT PEMBUANGAN SAMPAH', vertical: true },
        ],
      },
      { kind: 'leaf', key: 'rumah_mck', label: 'JML MCK', vertical: true },
      {
        kind: 'group', label: 'JML KRT YG MENGGUNAKAN AIR',
        children: [
          { kind: 'leaf', key: 'air_pdam', label: 'PDAM', vertical: true },
          { kind: 'leaf', key: 'air_sumur', label: 'SUMUR', vertical: true },
          { kind: 'leaf', key: 'air_lain', label: 'DLL', vertical: true },
        ],
      },
    ],
  },
  {
    kind: 'group', label: 'PERENCANAAN SEHAT',
    children: [
      { kind: 'leaf', key: 'jml_pus', label: 'JML PUS', vertical: true },
      { kind: 'leaf', key: 'jml_wus', label: 'JML WUS', vertical: true },
      {
        kind: 'group', label: 'JML ASEPTOR KB',
        children: [
          { kind: 'leaf', key: 'akseptor_kb_l', label: 'L' },
          { kind: 'leaf', key: 'akseptor_kb_p', label: 'P' },
        ],
      },
      { kind: 'leaf', key: 'kk_tabungan', label: 'JML KK YG MEMILIKI TABUNGAN', vertical: true },
    ],
  },
  { kind: 'leaf', key: 'keterangan', label: 'KET', type: 'text', vertical: true },
];

function TitleBlock(tahun) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div
        className="relative px-4 py-4"
        style={{ background: '#65651b', color: '#fff' }}
      >
        <div className="text-center text-sm font-bold uppercase leading-snug">
          <div style={{ textDecoration: 'underline' }}>DATA KEGIATAN PKK</div>
          <div>TP PKK DESA BELIKURIP</div>
          <div>TAHUN {tahun}</div>
        </div>
        <div
          className="absolute left-4 bottom-2 text-sm font-bold tracking-wide"
        >
          POKJA IV
        </div>
      </div>
    </div>
  );
}

const POKJA4_THEME = {
  bg: '#65651b',  // olive/mustard, sesuai gambar
  fg: '#ffffff',
  borderColor: '#ffffff',
};

export default function Pokja4DataPage({ config }) {
  return (
    <NestedDataPage
      config={config}
      tree={POKJA4_TREE}
      titleBlock={TitleBlock}
      unitLabel="Dusun"
      unitColumnLabel="NAMA DUSUN"
      headerTheme={POKJA4_THEME}
    />
  );
}
