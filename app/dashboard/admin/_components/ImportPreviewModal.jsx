'use client';

export default function ImportPreviewModal({ preview, tahun, setTahun, bulan, monthLabel, yearOptions, confirming, onCancel, onConfirm }) {
  const totals = (preview.diff || []).reduce((acc, sheet) => {
    acc.insert += sheet.counts?.insert || 0;
    acc.update += sheet.counts?.update || 0;
    acc.skip += sheet.counts?.skip || 0;
    acc.error += sheet.counts?.error || 0;
    return acc;
  }, { insert: 0, update: 0, skip: 0, error: 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Preview Import Excel</h3>
            <p className="text-sm text-gray-500">{preview.fileName} - data belum disimpan</p>
            <p className="text-xs text-amber-600 mt-0.5">Target periode tabel bulanan: <strong>{monthLabel} {tahun}</strong></p>
          </div>
          <button onClick={onCancel} className="self-start sm:self-auto px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50" aria-label="Tutup preview import">
            Tutup
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl border border-green-100 bg-green-50 p-3"><div className="text-xl font-bold text-green-700">{totals.insert}</div><div className="text-xs text-green-700">Baru</div></div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-xl font-bold text-blue-700">{totals.update}</div><div className="text-xs text-blue-700">Diubah</div></div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="text-xl font-bold text-gray-700">{totals.skip}</div><div className="text-xs text-gray-600">Dilewati</div></div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3"><div className="text-xl font-bold text-red-700">{totals.error}</div><div className="text-xs text-red-700">Gagal</div></div>
          </div>

          {preview.parseErrors?.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.parseErrors.map((error, index) => <div key={index}>{error}</div>)}
            </div>
          )}

          {(preview.diff || []).map((sheet, index) => (
            <div key={`${sheet.tableName}-${index}`} className="mb-6 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-800">{sheet.sheetName}</div>
                  <div className="text-xs text-gray-500">{sheet.tableName}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-green-50 text-green-700">{sheet.counts?.insert || 0} baru</span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{sheet.counts?.update || 0} ubah</span>
                  <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">{sheet.counts?.skip || 0} skip</span>
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700">{sheet.counts?.error || 0} gagal</span>
                </div>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Aksi</th>
                      <th className="px-3 py-2 text-left">Dusun</th>
                      <th className="px-3 py-2 text-left">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(sheet.rows || []).map((row, rowIndex) => (
                      <tr key={rowIndex} className={row.action === 'error' ? 'bg-red-50/40' : row.action === 'update' ? 'bg-blue-50/30' : row.action === 'insert' ? 'bg-green-50/30' : ''}>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            row.action === 'error' ? 'bg-red-100 text-red-700' :
                            row.action === 'update' ? 'bg-blue-100 text-blue-700' :
                            row.action === 'insert' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{row.action}</span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800">{row.dusunName || row.desaName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">
                          {row.reason || `${Object.keys(row.incoming || {}).length} kolom terbaca`}
                          {row.issueCount > 0 && row.action !== 'error' && (
                            <span className="ml-2 text-amber-600">Ada {row.issueCount} peringatan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(sheet.rows || []).length === 0 && (
                      <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-400">Tidak ada baris terbaca.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="confirm-import-year" className="text-sm font-medium text-gray-700">Tahun</label>
            <select id="confirm-import-year" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {(yearOptions && yearOptions.length > 0 ? yearOptions : Array.from({ length: 11 }, (_, i) => 2020 + i)).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium">Batal</button>
            <button onClick={onConfirm} disabled={confirming || totals.error > 0 || (totals.insert + totals.update) === 0} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {confirming ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
