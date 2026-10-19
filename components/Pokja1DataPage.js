'use client';

import NestedDataPage from '@/components/NestedDataPage';

/**
 * Pokja I — pixel-perfect sesuai gambar referensi.
 * Layout (header level 1):
 *   No | NAMA DUSUN | JUMLAH KADER | PENGHAYATAN DAN PENGAMALAN PANCASILA | GOTONG ROYONG | KET
 *
 * Level 2 di bawah JUMLAH KADER:    PKBN | PKDRT | POLA ASUH
 * Level 2 di bawah PENGHAYATAN:     PKBN | PKDRT | POLA ASUH | LANSIA
 * Level 2 di bawah GOTONG ROYONG:   JUMLAH KELOMPOK
 *
 * Level 3:
 *   Tiap kolom di PENGHAYATAN: JML KLP SIMULASI | JML ANG
 *   Tiap kolom di GOTONG ROYONG → JUMLAH KELOMPOK: KERJA BAKTI | RUKUN KEMATIAN | KEAGAMAAN | JIMPITAN | ARISAN
 *
 * Title block:
 *   DATA KEGIATAN PKK
 *   DESA   : BELIKURIP
 *   POKJA I
 *   TAHUN  : <tahun>
 */

const POKJA1_TREE = [
  {
    kind: 'group', label: 'JUMLAH KADER',
    children: [
      { kind: 'leaf', key: 'kader_pkbn', label: 'PKBN' },
      { kind: 'leaf', key: 'kader_pkdrt', label: 'PKDRT' },
      { kind: 'leaf', key: 'kader_pola_asuh', label: 'POLA ASUH' },
    ],
  },
  {
    kind: 'group', label: 'PENGHAYATAN DAN PENGAMALAN PANCASILA',
    children: [
      {
        kind: 'group', label: 'PKBN',
        children: [
          { kind: 'leaf', key: 'pkbn_jml_klp_simulasi', label: 'JML KLP SIMULASI' },
          { kind: 'leaf', key: 'pkbn_jml_anggota', label: 'JML ANG' },
        ],
      },
      {
        kind: 'group', label: 'PKDRT',
        children: [
          { kind: 'leaf', key: 'pkdrt_jml_klp_simulasi', label: 'JML KLP SIMULASI' },
          { kind: 'leaf', key: 'pkdrt_jml_anggota', label: 'JML ANG' },
        ],
      },
      {
        kind: 'group', label: 'POLA ASUH',
        children: [
          { kind: 'leaf', key: 'pola_asuh_jml_klp', label: 'JML KLP SIMULASI' },
          { kind: 'leaf', key: 'pola_asuh_jml_anggota', label: 'JML ANG' },
        ],
      },
      {
        kind: 'group', label: 'LANSIA',
        children: [
          { kind: 'leaf', key: 'lansia_jml_klp', label: 'JML KLP SIMULASI' },
          { kind: 'leaf', key: 'lansia_jml_anggota', label: 'JML ANG' },
        ],
      },
    ],
  },
  {
    kind: 'group', label: 'GOTONG ROYONG',
    children: [
      {
        kind: 'group', label: 'JUMLAH KELOMPOK',
        children: [
          { kind: 'leaf', key: 'gr_kerja_bakti', label: 'KERJA BAKTI' },
          { kind: 'leaf', key: 'gr_rukun_kematian', label: 'RUKUN KEMATIAN' },
          { kind: 'leaf', key: 'gr_keagamaan', label: 'KEAGAMAAN' },
          { kind: 'leaf', key: 'gr_jimpitan', label: 'JIMPITAN' },
          { kind: 'leaf', key: 'gr_arisan', label: 'ARISAN' },
        ],
      },
    ],
  },
  { kind: 'leaf', key: 'keterangan', label: 'KET', type: 'text' },
];

function TitleBlock(tahun) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-center text-sm font-bold uppercase leading-snug text-gray-900">
        <div>DATA KEGIATAN PKK</div>
        <div>DESA &nbsp;&nbsp;: BELIKURIP</div>
        <div>POKJA I</div>
      </div>
      <div className="mt-3 text-sm text-gray-700">
        <span style={{ fontWeight: 700, textDecoration: 'underline' }}>TAHUN : {tahun}</span>
      </div>
    </div>
  );
}

const POKJA1_THEME = {
  // green-700. #16a34a (green-600) hanya 3.30:1 dengan teks putih — di bawah
  // ambang WCAG AA 4.5:1. Nilai ini 5.02:1 dan tetap hijau seperti gambar acuan.
  bg: '#15803d',
  fg: '#ffffff',
  borderColor: '#ffffff',
};

export default function Pokja1DataPage({ config }) {
  return (
    <NestedDataPage
      config={config}
      tree={POKJA1_TREE}
      titleBlock={TitleBlock}
      unitLabel="Dusun"
      unitColumnLabel="NAMA DUSUN"
      headerTheme={POKJA1_THEME}
    />
  );
}
