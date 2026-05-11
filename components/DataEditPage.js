'use client';

import BumilDataPage from '@/components/BumilDataPage';
import { DataPageIcon } from '@/components/DataPageIcon';
import PokjaDataPage from '@/components/PokjaDataPage';

export default function DataEditPage({ config }) {
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
