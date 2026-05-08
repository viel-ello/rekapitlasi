'use client';
import PokjaDataPage from '@/components/PokjaDataPage';
import { ClipboardList } from 'flowbite-react-icons/outline';

const COLUMNS = [
  { key: 'jml_dusun', label: 'Dusun/Lingk.' },
  { key: 'jml_pkk_rw', label: 'PKK RW' },
  { key: 'jml_pkk_rt', label: 'PKK RT' },
  { key: 'jml_dasa_wisma', label: 'Dasa Wisma' },
  { key: 'jml_krt', label: 'KRT' },
  { key: 'jml_kk', label: 'KK' },
  { key: 'jml_jiwa_l', label: 'Jiwa (L)' },
  { key: 'jml_jiwa_p', label: 'Jiwa (P)' },
  { key: 'jml_kader_tp_pkk_l', label: 'Kader TPP (L)' },
  { key: 'jml_kader_tp_pkk_p', label: 'Kader TPP (P)' },
  { key: 'jml_kader_umum_l', label: 'Kader Umum (L)' },
  { key: 'jml_kader_umum_p', label: 'Kader Umum (P)' },
  { key: 'jml_kader_khusus_l', label: 'Kader Khusus (L)' },
  { key: 'jml_kader_khusus_p', label: 'Kader Khusus (P)' },
];

export default function DataUmumPage() {
  return (
    <PokjaDataPage
      title="Data Umum PKK"
      subtitle="Lampiran 4-20b — Kecamatan Baturetno"
      icon={<ClipboardList className="w-6 h-6" />}
      apiEndpoint="/api/data-umum"
      tableName="data_umum"
      columns={COLUMNS}
    />
  );
}
