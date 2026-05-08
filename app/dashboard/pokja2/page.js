'use client';
import PokjaDataPage from '@/components/PokjaDataPage';
import { BookOpen } from 'flowbite-react-icons/outline';

const COLUMNS = [
  { key: 'paket_a_klp', label: 'Pkt A Klp' },
  { key: 'paket_a_wrg', label: 'Pkt A Wrg' },
  { key: 'paket_b_klp', label: 'Pkt B Klp' },
  { key: 'paket_b_wrg', label: 'Pkt B Wrg' },
  { key: 'paket_c_klp', label: 'Pkt C Klp' },
  { key: 'paket_c_wrg', label: 'Pkt C Wrg' },
  { key: 'taman_bacaan', label: 'Taman Bacaan' },
  { key: 'klp_pembaca', label: 'Klp Pembaca' },
  { key: 'rumah_dilan', label: 'Rumah Dilan' },
  { key: 'kampung_mandiri', label: 'Kpg Mandiri' },
  { key: 'kader_khusus_koperasi', label: 'Kdr Koperasi' },
  { key: 'kader_khusus_keterampilan', label: 'Kdr Ketrampilan' },
  { key: 'usaha_mikro', label: 'Usaha Mikro' },
  { key: 'up2k_pemula_klp', label: 'UP2K Pmla Klp' },
  { key: 'up2k_pemula_psrt', label: 'UP2K Pmla Psrt' },
  { key: 'up2k_madya_klp', label: 'UP2K Mdy Klp' },
  { key: 'up2k_madya_psrt', label: 'UP2K Mdy Psrt' },
  { key: 'up2k_utama_klp', label: 'UP2K Utm Klp' },
  { key: 'up2k_utama_psrt', label: 'UP2K Utm Psrt' },
  { key: 'up2k_mandiri_klp', label: 'UP2K Mdr Klp' },
  { key: 'up2k_mandiri_psrt', label: 'UP2K Mdr Psrt' },
  { key: 'toko_pkk', label: 'Toko PKK' },
  { key: 'koperasi_belum_bh_kop', label: 'Kop Non-BH' },
  { key: 'koperasi_belum_bh_angg', label: 'Angg Non-BH' },
  { key: 'koperasi_berbadan_hukum_kop', label: 'Kop BH' },
  { key: 'koperasi_berbadan_hukum_angg', label: 'Angg BH' },
];

export default function Pokja2Page() {
  return (
    <PokjaDataPage
      title="Data Pokja II"
      subtitle="Pendidikan & Keterampilan, Pengembangan Kehidupan Berkoperasi"
      icon={<BookOpen className="w-6 h-6" />}
      apiEndpoint="/api/pokja2"
      tableName="data_pokja2"
      columns={COLUMNS}
    />
  );
}
