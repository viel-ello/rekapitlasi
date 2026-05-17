'use client';

import DataStatsPage from '@/components/DataStatsPage';
import { DATA_PAGES } from '@/lib/dataPages';

export default function RekapDawisPage() {
  return <DataStatsPage config={DATA_PAGES.rekapDawis} />;
}
