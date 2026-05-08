'use client';
import PokjaDataPage from '@/components/PokjaDataPage';
import { Shield } from 'flowbite-react-icons/outline';

const COLUMNS = [
  { key: 'kader_pkbn', label: 'Kdr PKBN' },
  { key: 'kader_pkdrt', label: 'Kdr PKDRT' },
  { key: 'kader_pola_asuh', label: 'Kdr Pola Asuh' },
  { key: 'pkbn_jml_klp_simulasi', label: 'PKBN Klp' },
  { key: 'pkbn_jml_anggota', label: 'PKBN Angg' },
  { key: 'pkdrt_jml_klp_simulasi', label: 'PKDRT Klp' },
  { key: 'pkdrt_jml_anggota', label: 'PKDRT Angg' },
  { key: 'pola_asuh_jml_klp', label: 'PA Klp' },
  { key: 'pola_asuh_jml_anggota', label: 'PA Angg' },
  { key: 'lansia_jml_klp', label: 'Lansia Klp' },
  { key: 'lansia_jml_anggota', label: 'Lansia Angg' },
  { key: 'gr_kerja_bakti', label: 'Kerja Bakti' },
  { key: 'gr_rukun_kematian', label: 'Rukun Kematian' },
  { key: 'gr_keagamaan', label: 'Keagamaan' },
  { key: 'gr_jimpitan', label: 'Jimpitan' },
  { key: 'gr_arisan', label: 'Arisan' },
];

export default function Pokja1Page() {
  return (
    <PokjaDataPage
      title="Data Pokja I"
      subtitle="Lampiran 4-21 — Penghayatan & Pengamalan Pancasila, Gotong Royong"
      icon={<Shield className="w-6 h-6" />}
      apiEndpoint="/api/pokja1"
      tableName="data_pokja1"
      columns={COLUMNS}
    />
  );
}
