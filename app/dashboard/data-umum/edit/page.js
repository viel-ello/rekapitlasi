'use client';

import DataEditPage from '@/components/DataEditPage';
import { DATA_PAGES } from '@/lib/dataPages';

export default function DataUmumEditPage() {
  return <DataEditPage config={DATA_PAGES.dataUmum} />;
}
