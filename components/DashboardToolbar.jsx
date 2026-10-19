'use client';

/**
 * @file DashboardToolbar — kelompokkan filter di kiri, primary actions
 * (Excel/Word/Import) di tengah, secondary di overflow menu.
 *
 * Mobile: row pertama 3 select filter (compact), row kedua 2 tombol primer + overflow.
 * Desktop: semua sejajar.
 */

import { useState } from 'react';
import {
  Download, Upload, FileLines, ClipboardList, DotsHorizontal,
} from 'flowbite-react-icons/outline';
import Dialog from '@/components/ui/Dialog';

const TEMPLATES = [
  { key: 'data_umum', label: 'Data Umum' },
  { key: 'data_pokja1', label: 'Pokja I' },
  { key: 'data_pokja2', label: 'Pokja II' },
  { key: 'data_pokja3', label: 'Pokja III' },
  { key: 'data_pokja4', label: 'Pokja IV' },
  { key: 'data_rekap_dawis', label: 'Rekap Dawis' },
  { key: 'data_bumil', label: 'Data Bumil' },
];

export default function DashboardToolbar({
  tahun, setTahun, years,
  bulan, setBulan, months,
  jenisData, setJenisData, tableFilters,
  onDownloadExcel, onDownloadWord, onDownloadTemplate,
  downloading, downloadingTemplate,
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);

  return (
    <div className="space-y-2">
      {/* Filter row — compact selects */}
      <div className="flex items-center gap-2 flex-wrap">
        <SelectField label="Tahun" value={tahun} onChange={setTahun} options={years.map(y => ({ value: y, label: y }))} />
        <SelectField label="Bulan" value={bulan} onChange={setBulan} options={months.map((m, i) => ({ value: i + 1, label: m }))} />
        <SelectField label="Data" value={jenisData} onChange={setJenisData} options={tableFilters.map(o => ({ value: o.value, label: o.label }))} flex="1" />
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex glass-pill rounded-xl p-0.5 overflow-hidden items-center">
          <button
            onClick={() => onDownloadExcel()}
            disabled={downloading === 'excel'}
            className="inline-flex items-center gap-1.5 px-3 py-2 hover:bg-green-500/15 text-green-700 dark:text-green-300 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            title="Unduh laporan Excel"
            aria-label="Unduh laporan Excel"
          >
            {downloading === 'excel' ? <Spinner /> : <Download className="w-4 h-4" />} Excel
          </button>
          <div className="w-px bg-white/60 dark:bg-white/10 my-1 h-5" aria-hidden="true"></div>
          <button
            onClick={() => onDownloadWord()}
            disabled={downloading === 'word'}
            className="inline-flex items-center gap-1.5 px-3 py-2 hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            title="Unduh laporan Word"
            aria-label="Unduh laporan Word"
          >
            {downloading === 'word' ? <Spinner /> : <FileLines className="w-4 h-4" />} Word
          </button>
        </div>

        <a
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 px-3 py-2 glass-pill text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white text-sm font-semibold rounded-xl transition-colors"
          title="Import Excel di Admin Panel"
        >
          <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
        </a>

        {/* Overflow menu — Template + (future) actions */}
        <div className="relative ml-auto sm:ml-0">
          <button
            onClick={() => setShowOverflow(!showOverflow)}
            className="inline-flex items-center justify-center w-9 h-9 glass-pill text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-xl"
            aria-label="Tindakan lain"
            title="Tindakan lain"
          >
            <DotsHorizontal className="w-4 h-4" />
          </button>
          {showOverflow && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowOverflow(false)} />
              <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl shadow-lg z-20 py-1.5 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => { setShowOverflow(false); setShowTemplate(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-white/60 dark:hover:bg-surface-dark-elevated flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Unduh Template Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Template dialog (overlay) */}
      <Dialog
        open={showTemplate}
        onClose={() => setShowTemplate(false)}
        title="Unduh Template Excel"
        containerClassName="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        panelClassName="relative z-10 w-full max-w-sm glass-panel rounded-3xl shadow-modal overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/60 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Unduh Template Excel</h3>
          <button onClick={() => setShowTemplate(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100" aria-label="Tutup">✕</button>
        </div>
        <div className="py-1">
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={async () => { await onDownloadTemplate(t.key, t.label); setShowTemplate(false); }}
              disabled={downloadingTemplate === t.key}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 hover:text-primary-700 dark:hover:text-primary-300 flex items-center justify-between border-b border-white/40 dark:border-white/10 last:border-0"
            >
              <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-gray-500 dark:text-gray-400" /> {t.label}</span>
              {downloadingTemplate === t.key ? <Spinner /> : <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function SelectField({ label, value, onChange, options, flex }) {
  const ariaLabel = label === 'Tahun' ? 'Pilih tahun dashboard' : label;
  return (
    <label className="inline-flex items-center gap-1.5 glass-pill rounded-xl pl-3 pr-1 py-1" style={flex ? { flex } : undefined}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(typeof value === 'number' ? Number(e.target.value) : e.target.value)}
        className="bg-transparent text-sm font-medium text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-0 border-0 py-1 pr-1 max-w-[140px] sm:max-w-none truncate"
        aria-label={ariaLabel}
      >
        {options.map(o => <option key={o.value} value={o.value} className="bg-white dark:bg-surface-dark text-gray-800 dark:text-gray-100">{o.label}</option>)}
      </select>
    </label>
  );
}

function Spinner() {
  return <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
