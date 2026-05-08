'use client';
import PokjaDataPage from '@/components/PokjaDataPage';
import { Swatchbook } from 'flowbite-react-icons/outline';

const COLUMNS = [
  { key: 'kader_pangan', label: 'Kdr Pangan' },
  { key: 'kader_sandang', label: 'Kdr Sandang' },
  { key: 'kader_tata_laksana_rt', label: 'Kdr Tata RT' },
  { key: 'pangan_beras', label: 'Beras' },
  { key: 'pangan_non_beras', label: 'Non Beras' },
  { key: 'pemanfaatan_peternakan', label: 'Peternakan' },
  { key: 'pemanfaatan_perikanan', label: 'Perikanan' },
  { key: 'pemanfaatan_warung_hidup', label: 'Warung Hidup' },
  { key: 'pemanfaatan_lumbung_hidup', label: 'Lumbung Hidup' },
  { key: 'pemanfaatan_toga', label: 'TOGA' },
  { key: 'pemanfaatan_tanaman_keras', label: 'Tan. Keras' },
  { key: 'industri_pangan', label: 'Ind. Pangan' },
  { key: 'industri_sandang', label: 'Ind. Sandang' },
  { key: 'industri_jasa', label: 'Ind. Jasa' },
  { key: 'rumah_sehat', label: 'Rmh Sehat' },
  { key: 'rumah_kurang_sehat', label: 'Rmh Kurang Sehat' },
];

export default function Pokja3Page() {
  return (
    <PokjaDataPage
      title="Data Pokja III"
      subtitle="Lampiran 4-23 — Pangan, Sandang, Tata Laksana Rumah Tangga"
      icon={<Swatchbook className="w-6 h-6" />}
      apiEndpoint="/api/pokja3"
      tableName="data_pokja3"
      columns={COLUMNS}
    />
  );
}
