'use client';

import BumilDataPage from '@/components/BumilDataPage';
import RekapDawisDataPage from '@/components/RekapDawisDataPage';
import Pokja1DataPage from '@/components/Pokja1DataPage';
import Pokja2DataPage from '@/components/Pokja2DataPage';
import Pokja3DataPage from '@/components/Pokja3DataPage';
import Pokja4DataPage from '@/components/Pokja4DataPage';
import DataUmumDataPage from '@/components/DataUmumDataPage';
import { DataPageIcon } from '@/components/DataPageIcon';
import PokjaDataPage from '@/components/PokjaDataPage';

/**
 * Router untuk halaman edit per tabel.
 * Urutan dispatch dari yang paling spesifik:
 *   - Bumil: filter bulan + multi-row header (Annex A)
 *   - Rekap Dawis: 3-level header pixel-perfect (Annex F) — sejak v10 juga per-bulan
 *   - Pokja I-IV: pixel-perfect masing-masing
 *   - Data Umum: 3-level header dengan identity block
 *   - Lainnya: tabel flat standar (PokjaDataPage)
 *
 * Catatan: jangan cek `config.hasMonth` duluan, karena sekarang Rekap Dawis
 * juga `hasMonth=true` (sejak v10) tapi punya layout sendiri yang berbeda
 * dari Bumil. Cek by `tableName` dulu.
 */
export default function DataEditPage({ config }) {
  if (config.tableName === 'data_bumil') {
    return <BumilDataPage config={config} />;
  }

  if (config.tableName === 'data_rekap_dawis') {
    return <RekapDawisDataPage config={config} />;
  }

  if (config.tableName === 'data_pokja2') {
    return <Pokja2DataPage config={config} />;
  }

  if (config.tableName === 'data_pokja1') {
    return <Pokja1DataPage config={config} />;
  }

  if (config.tableName === 'data_pokja3') {
    return <Pokja3DataPage config={config} />;
  }

  if (config.tableName === 'data_pokja4') {
    return <Pokja4DataPage config={config} />;
  }

  if (config.tableName === 'data_umum') {
    return <DataUmumDataPage config={config} />;
  }

  // Fallback umum: kalau ada tabel custom dengan hasMonth tapi tanpa layout
  // dedicated, pakai BumilDataPage (UI dengan dropdown bulan).
  if (config.hasMonth) {
    return <BumilDataPage config={config} />;
  }

  return (
    <PokjaDataPage
      title={config.title}
      subtitle={config.subtitle}
      icon={<DataPageIcon name={config.icon} className="w-6 h-6" />}
      apiEndpoint={config.apiEndpoint}
      tableName={config.tableName}
      columns={config.columns}
    />
  );
}
