'use client';
import PokjaDataPage from '@/components/PokjaDataPage';
import { Heart } from 'flowbite-react-icons/outline';

const COLUMNS = [
  { key: 'kader_posyandu', label: 'Kdr Posyandu' },
  { key: 'kader_gizi', label: 'Kdr Gizi' },
  { key: 'kader_kesling', label: 'Kdr Kesling' },
  { key: 'kader_penyuluh_narkoba', label: 'Kdr Narkoba' },
  { key: 'kader_phbs', label: 'Kdr PHBS' },
  { key: 'kader_kb', label: 'Kdr KB' },
  { key: 'posyandu_jumlah', label: 'Posyandu' },
  { key: 'posyandu_terintegrasi', label: 'Posyandu Intg' },
  { key: 'lansia_jml_klp', label: 'Lansia Klp' },
  { key: 'lansia_jml_anggota', label: 'Lansia Angg' },
  { key: 'lansia_jml_kartu_berobat', label: 'Kartu Berobat' },
  { key: 'rumah_jamban', label: 'Jamban' },
  { key: 'rumah_spal', label: 'SPAL' },
  { key: 'rumah_tempat_sampah', label: 'Tmp Sampah' },
  { key: 'rumah_mck', label: 'MCK' },
  { key: 'air_pdam', label: 'Air PDAM' },
  { key: 'air_sumur', label: 'Air Sumur' },
  { key: 'air_lain', label: 'Air Lain' },
  { key: 'jml_pus', label: 'PUS' },
  { key: 'jml_wus', label: 'WUS' },
  { key: 'akseptor_kb_l', label: 'KB (L)' },
  { key: 'akseptor_kb_p', label: 'KB (P)' },
  { key: 'kk_tabungan', label: 'KK Tabungan' },
];

export default function Pokja4Page() {
  return (
    <PokjaDataPage
      title="Data Pokja IV"
      subtitle="Lampiran 4-24 — Kesehatan, Kelestarian Lingkungan Hidup, Perencanaan Sehat"
      icon={<Heart className="w-6 h-6" />}
      apiEndpoint="/api/pokja4"
      tableName="data_pokja4"
      columns={COLUMNS}
    />
  );
}
