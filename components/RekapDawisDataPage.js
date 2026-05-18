'use client';

import NestedDataPage from '@/components/NestedDataPage';
import { MONTHS } from '@/lib/dataPages';

/**
 * Rekapitulasi Dawis — pixel-perfect sesuai Annex F.
 * 34 kolom logis, 3-level header. Per-bulan (Januari-Desember) sejak v10.
 */

const REKAP_DAWIS_TREE = [
  { kind: 'leaf', key: 'jml_rw', label: 'Jml RW' },
  { kind: 'leaf', key: 'jml_rt', label: 'Jml RT' },
  { kind: 'leaf', key: 'jml_dawis', label: 'Jml dawis' },
  { kind: 'leaf', key: 'jml_krt', label: 'Jml KRT' },
  { kind: 'leaf', key: 'jml_kk', label: 'Jml KK' },
  {
    kind: 'group', label: 'Jml Angg keluarga',
    children: [
      {
        kind: 'group', label: 'Total',
        children: [
          { kind: 'leaf', key: 'jml_anggota_l', label: 'L' },
          { kind: 'leaf', key: 'jml_anggota_p', label: 'P' },
        ],
      },
      {
        kind: 'group', label: 'Balita',
        children: [
          { kind: 'leaf', key: 'balita_l', label: 'L' },
          { kind: 'leaf', key: 'balita_p', label: 'P' },
        ],
      },
      { kind: 'leaf', key: 'pus', label: 'PUS' },
      { kind: 'leaf', key: 'wus', label: 'WUS' },
      { kind: 'leaf', key: 'ibu_hamil', label: 'Ibu Hamil', vertical: true },
      { kind: 'leaf', key: 'ibu_menyusui', label: 'Ibu menyusui', vertical: true },
      { kind: 'leaf', key: 'lansia', label: 'Lansia' },
      { kind: 'leaf', key: 'tiga_buta', label: '3 Buta' },
      { kind: 'leaf', key: 'berkebutuhan_khusus', label: 'Berkebutuhan khusus', vertical: true },
    ],
  },
  {
    kind: 'group', label: 'Jumlah Rumah',
    children: [
      { kind: 'leaf', key: 'rumah_sehat', label: 'Sehat', vertical: true },
      { kind: 'leaf', key: 'rumah_kurang_sehat', label: 'Tidak sehat', vertical: true },
      { kind: 'leaf', key: 'punya_tempat_sampah', label: 'Memiliki tempt sampah', vertical: true },
      { kind: 'leaf', key: 'punya_spal', label: 'Memiliki spal', vertical: true },
      { kind: 'leaf', key: 'jamban', label: 'Memiliki jamban', vertical: true },
      { kind: 'leaf', key: 'stiker_p4k', label: 'Menempel stiker', vertical: true },
    ],
  },
  {
    kind: 'group', label: 'Sumber Air Keluarga',
    children: [
      { kind: 'leaf', key: 'air_pdam', label: 'PDAM' },
      { kind: 'leaf', key: 'air_sumur', label: 'Sumber' },
      { kind: 'leaf', key: 'air_sungai', label: 'Sungai' },
      { kind: 'leaf', key: 'air_dll', label: 'Dll' },
    ],
  },
  {
    kind: 'group', label: 'Makanan',
    children: [
      { kind: 'leaf', key: 'makan_beras', label: 'Beras' },
      { kind: 'leaf', key: 'makan_non_beras', label: 'Non Beras' },
    ],
  },
  {
    kind: 'group', label: 'Wrg yg mengikuti',
    children: [
      { kind: 'leaf', key: 'ikut_up2k', label: 'UP2K' },
      { kind: 'leaf', key: 'ikut_pekarangan', label: 'Pemanfaatan lahan', vertical: true },
      { kind: 'leaf', key: 'ikut_kesling', label: 'Kes lngk' },
    ],
  },
  { kind: 'leaf', key: 'jkn_bpjs', label: 'KET (JKN/BPJS)' },
];

function TitleBlock(tahun, bulan) {
  const bulanLabel = bulan ? MONTHS[bulan - 1] : null;
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-center text-sm font-bold uppercase leading-snug text-gray-900">
        <div>CATATAN DATA DAN KEGIATAN WARGA</div>
        <div>TP PKK DESA BELIKURIP KECAMATAN BATURETNO</div>
        {bulanLabel ? <div>BULAN {bulanLabel} · TAHUN {tahun}</div> : <div>TAHUN {tahun}</div>}
      </div>
    </div>
  );
}

export default function RekapDawisDataPage({ config }) {
  return (
    <NestedDataPage
      config={config}
      tree={REKAP_DAWIS_TREE}
      titleBlock={TitleBlock}
      unitLabel="Dusun"
      unitColumnLabel="Nama dusun"
    />
  );
}
