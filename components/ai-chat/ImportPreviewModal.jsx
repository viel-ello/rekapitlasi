'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * ImportPreviewModal — modal diff-view untuk konfirmasi import Excel.
 * Menampilkan per-sheet: counts, kontrol seleksi baris, dan tabel perubahan.
 */
export default function ImportPreviewModal({ chat }) {
  const {
    importPreviewData, cancelImport, confirmImport,
    selectedRows, toggleAllRows, selectByAction, toggleRow,
    importBulan, setImportBulan, importTahun, setImportTahun,
    setPreviewStale, previewStale, recomputePreview, recomputing,
    years, MONTHS,
  } = chat;

  return (
    <AnimatePresence>
      {importPreviewData && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={cancelImport}></div>
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10"
          >
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="bg-white/20 p-1.5 rounded-lg">📊</span> Konfirmasi Import Data
                </h3>
                <p className="text-primary-100 text-sm mt-1">Review perubahan sebelum menyimpan ke database</p>
              </div>
              <button onClick={cancelImport} className="text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded" aria-label="Tutup preview import">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div className="mb-6 flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="text-blue-600">📄</div>
                <div className="flex-1 text-sm text-blue-900 font-medium">{importPreviewData.fileName}</div>
              </div>

              {importPreviewData.diff.map((sheetDiff, i) => {
                const selectableRows = (sheetDiff.rows || []).filter((r) => (r.action === 'insert' || r.action === 'update') && r.desaId);
                const sel = selectedRows[sheetDiff.tableName] || new Set();
                const allSelected = selectableRows.length > 0 && selectableRows.every((r) => sel.has(r.desaId));
                return (
                <div key={i} className="mb-8">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3 flex-wrap">
                    <span>Sheet: {sheetDiff.sheetName}</span>
                    <span className="text-xs font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">→ {sheetDiff.tableName}</span>
                    <span className="text-xs font-normal text-primary-700 ml-auto">{sel.size} dari {selectableRows.length} terpilih</span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                    <button onClick={() => toggleAllRows(sheetDiff.tableName, selectableRows)} className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg font-medium text-gray-700">
                      {allSelected ? 'Kosongkan' : 'Pilih semua'}
                    </button>
                    <button onClick={() => selectByAction(sheetDiff.tableName, selectableRows, 'insert')} className="px-2 py-1 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg font-medium text-green-700">
                      Hanya yang baru
                    </button>
                    <button onClick={() => selectByAction(sheetDiff.tableName, selectableRows, 'update')} className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg font-medium text-blue-700">
                      Hanya yang diubah
                    </button>
                  </div>

                  <div className="flex gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.insert}</span> Baru</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.update}</span> Ubah</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.skip}</span> Skip</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.error}</span> Gagal</div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-2 py-3 w-8">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => toggleAllRows(sheetDiff.tableName, selectableRows)}
                                aria-label={`Pilih semua baris ${sheetDiff.tableName}`}
                              />
                            </th>
                            <th className="px-3 py-3 w-10">Aksi</th>
                            <th className="px-3 py-3 w-40">Dusun</th>
                            <th className="px-3 py-3">Perubahan (Hanya yang berbeda)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sheetDiff.rows.map((row, j) => {
                            const checkable = (row.action === 'insert' || row.action === 'update') && row.desaId;
                            const checked = checkable && sel.has(row.desaId);
                            return (
                            <tr key={j} className={
                              row.action === 'insert' ? 'bg-green-50/30' :
                              row.action === 'update' ? 'bg-blue-50/30' :
                              row.action === 'error' ? 'bg-red-50/30' : 'opacity-50'
                            }>
                              <td className="px-2 py-2 align-top">
                                {checkable ? (
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleRow(sheetDiff.tableName, row.desaId)}
                                    aria-label={`Pilih ${row.desaName}`}
                                  />
                                ) : null}
                              </td>
                              <td className="px-3 py-2">
                                {row.action === 'insert' && <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Baru</span>}
                                {row.action === 'update' && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Ubah</span>}
                                {row.action === 'skip' && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">Skip</span>}
                                {row.action === 'error' && <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Error</span>}
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-800">{row.desaName}</td>
                              <td className="px-3 py-2 font-mono text-xs">
                                {row.action === 'error' && <span className="text-red-500">{row.reason}</span>}
                                {row.action === 'skip' && <span className="text-gray-400">Tidak ada perubahan</span>}
                                {(row.action === 'insert' || row.action === 'update') && (
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(row.incoming).map(([col, val]) => {
                                      const prev = row.current?.[col];
                                      return (
                                        <div key={col} className="bg-white border border-gray-200 rounded px-2 py-1 whitespace-nowrap">
                                          <span className="text-gray-400">{col}:</span>{' '}
                                          {row.action === 'update' && prev !== undefined && (
                                            <span className="line-through text-red-400 mr-1">{prev}</span>
                                          )}
                                          <span className="font-bold text-green-600">{val}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Simpan untuk:</label>
                <select
                  value={importBulan}
                  onChange={e => { setImportBulan(Number(e.target.value)); setPreviewStale(true); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  aria-label="Bulan import (untuk tabel bulanan)"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={importTahun}
                  onChange={e => { setImportTahun(Number(e.target.value)); setPreviewStale(true); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  aria-label="Tahun import"
                >
                  {(years && years.length > 0 ? years : [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {previewStale && (
                  <button
                    onClick={async () => { await recomputePreview(); setPreviewStale(false); }}
                    disabled={recomputing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg disabled:opacity-50"
                  >
                    {recomputing ? 'Menghitung...' : '↻ Hitung ulang preview'}
                  </button>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={cancelImport}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Batal
                </button>
                {(() => {
                  const totalSelected = Object.values(selectedRows).reduce((s, set) => s + (set?.size || 0), 0);
                  return (
                    <button
                      onClick={confirmImport}
                      disabled={totalSelected === 0 || previewStale}
                      title={previewStale ? 'Klik "Hitung ulang preview" dulu setelah ganti periode' : undefined}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95"
                    >
                      Simpan {totalSelected > 0 ? `${totalSelected} baris` : ''}
                    </button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
