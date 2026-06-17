'use client';

import { useEffect, useState } from 'react';
import { Upload, Download } from 'flowbite-react-icons/outline';
import { useYears } from '@/lib/useYears';
import { MONTH_NAMES } from './constants';
import ImportPreviewModal from './ImportPreviewModal';

export default function ImportTab({ toast, setToast }) {
  const [importing, setImporting] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importTahun, setImportTahun] = useState(new Date().getFullYear());
  const [importBulan, setImportBulan] = useState(new Date().getMonth() + 1);
  const { years: yearOptions } = useYears();

  const IMPORT_MONTHS = MONTH_NAMES;

  useEffect(() => {
    if (yearOptions.length > 0 && !yearOptions.includes(importTahun)) {
      setImportTahun(yearOptions[0]);
    }
  }, [yearOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
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
      if (res.ok) setImportPreview(null);
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Upload className="w-5 h-5" /> Import dari Excel
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Unggah file Excel dengan format template resmi. Sistem akan menampilkan preview perubahan sebelum disimpan ke database.
          </p>
          <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="import-year">Tahun import</label>
          <select
            id="import-year"
            value={importTahun}
            onChange={(e) => setImportTahun(Number(e.target.value))}
            className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {(yearOptions.length > 0 ? yearOptions : Array.from({ length: 11 }, (_, i) => 2020 + i)).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="import-month">Bulan import (untuk Data Umum, Rekap Dawis, Bumil)</label>
          <select
            id="import-month"
            value={importBulan}
            onChange={(e) => setImportBulan(Number(e.target.value))}
            className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {IMPORT_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <p className="text-[11px] text-amber-600 mb-3">
            Data tabel bulanan akan disimpan ke <strong>{IMPORT_MONTHS[importBulan - 1]} {importTahun}</strong>. Pastikan bulan benar sebelum import.
          </p>
          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
            {importing ? '⏳ Memproses...' : <><Upload className="w-4 h-4" /> Pilih File Excel</>}
            <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Download className="w-5 h-5" /> Unduh Template
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Download template Excel kosong untuk setiap tabel. Isi, lalu unggah kembali di panel import.
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
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                <Download className="w-3 h-3" /> {t.label}
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-amber-50 rounded-2xl border border-amber-100 p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-1">Catatan Backup (Supabase Free Plan)</h4>
          <p className="text-xs text-amber-700 mb-2">
            Supabase Free Plan TIDAK menyediakan automated backup harian. Lakukan backup manual berkala salah satu cara di bawah:
          </p>
          <ul className="text-xs text-amber-700 list-disc pl-5 space-y-0.5">
            <li>
              <strong>pg_dump</strong> dari mesin lokal (paling lengkap):{' '}
              <code className="px-1 py-0.5 bg-amber-100 rounded">
                pg_dump &quot;postgres://USER:PASS@db.HOST.supabase.co:5432/postgres&quot; --data-only &gt; backup.sql
              </code>
            </li>
            <li>
              <strong>Export CSV per tabel</strong> via Supabase SQL Editor &rarr; pilih tabel &rarr; Export.
            </li>
            <li>
              <strong>Export Excel</strong> dari panel ini (tab &quot;Database&quot;) — backup parsial per tabel.
            </li>
          </ul>
          <p className="text-xs text-amber-700 mt-2">
            Direkomendasikan backup minimal sebelum migration SQL atau perubahan schema besar.
          </p>
        </div>
      </div>
    </>
  );
}
