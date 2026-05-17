'use client';

import BumilDataPage from '@/components/BumilDataPage';
import RekapDawisDataPage from '@/components/RekapDawisDataPage';
import Pokja1DataPage from '@/components/Pokja1DataPage';
import Pokja2DataPage from '@/components/Pokja2DataPage';
import DataUmumDataPage from '@/components/DataUmumDataPage';
import { DataPageIcon } from '@/components/DataPageIcon';
import PokjaDataPage from '@/components/PokjaDataPage';

/**
 * Router untuk halaman edit per tabel.
 * - Bumil: filter bulan + multi-row header (Annex A)
 * - Pokja II: 4-level header pixel-perfect
 * - Rekap Dawis: 3-level header pixel-perfect (Annex F)
 * - Data Umum: 3-level header dengan identity block
 * - Lainnya: tabel flat standar
 */
export default function DataEditPage({ config }) {
  if (config.hasMonth) {
    return <BumilDataPage config={config} />;
  }

  if (config.tableName === 'data_pokja2') {
    return <Pokja2DataPage config={config} />;
  }

  if (config.tableName === 'data_pokja1') {
    return <Pokja1DataPage config={config} />;
  }

  if (config.tableName === 'data_rekap_dawis') {
    return <RekapDawisDataPage config={config} />;
  }

  if (config.tableName === 'data_umum') {
    return <DataUmumDataPage config={config} />;
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
