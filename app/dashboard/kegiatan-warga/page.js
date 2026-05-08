'use client';
import PokjaDataPage from '@/components/PokjaDataPage';
import { Users } from 'flowbite-react-icons/outline';

const COLUMNS = [
  { key: 'jml_dusun', label: 'Dusun' },
  { key: 'jml_rw', label: 'RW' },
  { key: 'jml_rt', label: 'RT' },
  { key: 'jml_dawis', label: 'Dawis' },
  { key: 'jml_krt', label: 'KRT' },
  { key: 'jml_kk', label: 'KK' },
  { key: 'jml_anggota_l', label: 'Angg (L)' },
  { key: 'jml_anggota_p', label: 'Angg (P)' },
  { key: 'balita_l', label: 'Balita (L)' },
  { key: 'balita_p', label: 'Balita (P)' },
  { key: 'pus', label: 'PUS' },
  { key: 'wus', label: 'WUS' },
  { key: 'ibu_hamil', label: 'Ibu Hamil' },
  { key: 'ibu_menyusui', label: 'Ibu Menyusui' },
  { key: 'lansia', label: 'Lansia' },
  { key: 'rumah_sehat', label: 'Rmh Sehat' },
  { key: 'rumah_kurang_sehat', label: 'Rmh Kr Sehat' },
  { key: 'punya_tempat_sampah', label: 'Tmp Sampah' },
  { key: 'punya_spal', label: 'SPAL' },
  { key: 'stiker_p4k', label: 'Stiker P4K' },
  { key: 'air_pdam', label: 'PDAM' },
  { key: 'air_sumur', label: 'Sumur' },
  { key: 'air_sungai', label: 'Sungai' },
  { key: 'air_dll', label: 'Air Lain' },
  { key: 'jamban', label: 'Jamban' },
  { key: 'makan_beras', label: 'Beras' },
  { key: 'makan_non_beras', label: 'Non Beras' },
  { key: 'ikut_up2k', label: 'UP2K' },
  { key: 'ikut_pekarangan', label: 'Pekarangan' },
  { key: 'ikut_industri', label: 'Industri' },
  { key: 'ikut_kesling', label: 'Kesling' },
  { key: 'jkn_bpjs', label: 'JKN/BPJS' },
];

export default function KegiatanWargaPage() {
  return (
    <PokjaDataPage
      title="Catatan Data & Kegiatan Warga"
      subtitle="Lampiran 4-17b — TP PKK Kecamatan Baturetno"
      icon={<Users className="w-6 h-6" />}
      apiEndpoint="/api/kegiatan-warga"
      tableName="data_kegiatan_warga"
      columns={COLUMNS}
    />
  );
}
