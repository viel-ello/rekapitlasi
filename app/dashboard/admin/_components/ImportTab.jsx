'use client';

import { useEffect, useState } from 'react';
import { Upload, Download } from 'flowbite-react-icons/outline';
import { useYears } from '@/lib/useYears';
import { MONTH_NAMES } from './constants';
import ImportPreviewModal from './ImportPreviewModal';
import FormProgressBar from '@/components/ui/FormProgressBar';

const IMPORT_STEPS = [
  { id: 'pilih', title: '1. File & Periode' },
  { id: 'validasi', title: '2. Validasi & Preview' },
  { id: 'konfirmasi', title: '3. Konfirmasi Impor' },
  { id: 'selesai', title: '4. Selesai' },
];

export default function ImportTab({ toast, setToast }) {
  const [importing, setImporting] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importTahun, setImportTahun] = useState(new Date().getFullYear());
  const [importBulan, setImportBulan] = useState(new Date().getMonth() + 1);
  const [importDone, setImportDone] = useState(false);
  const { years: yearOptions } = useYears();

  const IMPORT_MONTHS = MONTH_NAMES;

  // Tentukan langkah aktif alur impor bertahap
  const currentStep = importDone ? 3 : confirmingImport ? 2 : importPreview ? 1 : 0;

  useEffect(() => {
    if (yearOptions.length > 0 && !yearOptions.includes(importTahun)) {
      setImportTahun(yearOptions[0]);
    }
  }, [yearOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportDone(false);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tahun', importTahun);
    formData.append('bulan', importBulan);
    try {
      const res = await fetch('/api/import/excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.type === 'import_preview') {
        setImportPreview(data);
        setToast({ type: 'success', message: 'Preview import siap direview' });
      } else {
        setToast({ type: 'error', message: data.error || 'Gagal membuat preview import' });
      }
    } catch { setToast({ type: 'error', message: 'Gagal mengimpor file' }); }
    setImporting(false);
    e.target.value = '';
    setTimeout(() => setToast(null), 3000);
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setConfirmingImport(true);
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData: importPreview.parsedData, tahun: importTahun, bulan: importBulan }),
      });
      const data = await res.json();
      setToast({ type: res.ok ? 'success' : 'error', message: data.message || data.error || 'Import selesai' });
      if (res.ok) {
        setImportPreview(null);
        setImportDone(true);
      }
    } catch {
      setToast({ type: 'error', message: 'Gagal menyimpan hasil import' });
    }
    setConfirmingImport(false);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      {importPreview && (
        <ImportPreviewModal
          preview={importPreview}
          tahun={importTahun}
          setTahun={setImportTahun}
          bulan={importBulan}
          monthLabel={IMPORT_MONTHS[importBulan - 1]}
          yearOptions={yearOptions}
          confirming={confirmingImport}
          onCancel={() => setImportPreview(null)}
          onConfirm={confirmImport}
        />
      )}

      {/* Alur Impor Bertahap (Typeform progressive disclosure) */}
      <div className="mb-6 glass-panel rounded-2xl p-5 border border-white/70 dark:border-white/10 shadow-sm">
        <div className="text-xs font-bold text-primary-800 dark:text-primary-300 uppercase tracking-wide mb-2">
          Alur Impor Data Resmi TP PKK
        </div>
        <FormProgressBar
          steps={IMPORT_STEPS}
          currentStep={currentStep}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl border border-white/60 dark:border-white/10 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
            <Upload className="w-5 h-5 text-primary-600" /> Langkah 1: Unggah Berkas Excel
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Unggah file Excel dengan format template resmi. Sistem akan menampilkan preview perubahan sebelum disimpan ke database.
          </p>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" htmlFor="import-year">Tahun import</label>
          <select
            id="import-year"
            value={importTahun}
            onChange={(e) => setImportTahun(Number(e.target.value))}
            className="w-full mb-3 px-3 py-2 glass-input rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {(yearOptions.length > 0 ? yearOptions : Array.from({ length: 11 }, (_, i) => 2020 + i)).map(y => <option key={y} value={y} className="bg-white dark:bg-surface-dark">{y}</option>)}
          </select>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" htmlFor="import-month">Bulan import (untuk Data Umum, Rekap Dawis, Bumil)</label>
          <select
            id="import-month"
            value={importBulan}
            onChange={(e) => setImportBulan(Number(e.target.value))}
            className="w-full mb-1 px-3 py-2 glass-input rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {IMPORT_MONTHS.map((m, i) => <option key={m} value={i + 1} className="bg-white dark:bg-surface-dark">{m}</option>)}
          </select>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mb-3">
            Data tabel bulanan akan disimpan ke <strong>{IMPORT_MONTHS[importBulan - 1]} {importTahun}</strong>. Pastikan bulan benar sebelum import.
          </p>
          <label className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-md transition-colors cursor-pointer">
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <><Upload className="w-4 h-4" /> Pilih File Excel</>
            )}
            <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>

        <div className="glass rounded-2xl border border-white/60 dark:border-white/10 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
            <Download className="w-5 h-5 text-primary-600" /> Unduh Template Standar
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Download template Excel kosong untuk setiap tabel. Isi data per dusun, lalu unggah kembali di panel sebelah kiri.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'data_umum', label: 'Data Umum' },
              { key: 'data_pokja1', label: 'Pokja I' },
              { key: 'data_pokja2', label: 'Pokja II' },
              { key: 'data_pokja3', label: 'Pokja III' },
              { key: 'data_pokja4', label: 'Pokja IV' },
              { key: 'data_rekap_dawis', label: 'Rekap Dawis' },
              { key: 'data_bumil', label: 'Data Bumil' },
            ].map(t => (
              <a key={t.key} href={`/api/export/template?table=${t.key}`} download
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 glass-pill text-gray-700 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-300 text-xs font-semibold rounded-xl transition-colors">
                <Download className="w-3.5 h-3.5" /> {t.label}
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl glass-panel p-5 border border-amber-200/60 dark:border-amber-800/40">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Catatan Backup & Pemulihan (Supabase)</h4>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
            Lakukan pencadangan data secara berkala sebelum melakukan impor massal. Gunakan salah satu opsi berikut:
          </p>
          <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc pl-5 space-y-1">
            <li>
              <strong>Export Excel per Tabel</strong>: Unduh data mutakhir melalui tombol Ekspor Excel pada masing-masing halaman Pokja/Bumil.
            </li>
            <li>
              <strong>pg_dump</strong>: Ekspor database lengkap langsung dari PostgreSQL Supabase.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
