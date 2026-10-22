'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, MapPin, ClipboardList, Cog, List, Upload, Clock,
} from 'flowbite-react-icons/outline';
import UsersTab from './_components/UsersTab';
import DesaTab from './_components/DesaTab';
import YearsTab from './_components/YearsTab';
import ColumnsTab from './_components/ColumnsTab';
import LogsTab from './_components/LogsTab';
import ImportTab from './_components/ImportTab';

const TABS = [
  { id: 'users', label: 'Pengguna', icon: User },
  { id: 'desa', label: 'Dusun', icon: MapPin },
  { id: 'years', label: 'Tahun', icon: Clock },
  { id: 'columns', label: 'Kolom', icon: List },
  { id: 'logs', label: 'Log Aktivitas', icon: ClipboardList },
  { id: 'import', label: 'Import Excel', icon: Upload },
];

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const [toast, setToast] = useState(null);

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{toast.message}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Cog className="w-7 h-7" /> Panel Admin
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola pengguna, dusun, dan pengaturan sistem</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'bg-white/70 backdrop-blur text-gray-600 border border-gray-200 hover:bg-white dark:bg-black/20 dark:text-gray-300 dark:border-white/10 dark:hover:bg-black/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="adminActiveTabIndicator"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-primary-600 rounded-full shadow-sm shadow-primary-500/20 -z-10"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-4 h-4" /> {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'users' && <UsersTab toast={toast} setToast={setToast} />}
      {tab === 'desa' && <DesaTab toast={toast} setToast={setToast} />}
      {tab === 'years' && <YearsTab setToast={setToast} />}
      {tab === 'columns' && <ColumnsTab toast={toast} setToast={setToast} />}
      {tab === 'logs' && <LogsTab />}
      {tab === 'import' && <ImportTab toast={toast} setToast={setToast} />}
    </div>
  );
}
