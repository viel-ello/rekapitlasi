'use client';

/**
 * MutationPreviewCard — kartu dry-run usulan perubahan data dari AI.
 * Tampil di dalam bubble pesan assistant bertipe `mutation_preview`.
 */
export default function MutationPreviewCard({ mutation, done, loading, onApply, onCancel }) {
  return (
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px]">
      <div className="font-semibold text-amber-900 mb-1.5">
        Usulan perubahan: {mutation.dusunNama} · {mutation.tableLabel} · {mutation.tahun}{mutation.isMonthly ? ` / bln ${mutation.bulan}` : ''}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-amber-700">
              <th className="py-1 pr-3 font-medium">Kolom</th>
              <th className="py-1 pr-3 font-medium">Sebelum</th>
              <th className="py-1 font-medium">Sesudah</th>
            </tr>
          </thead>
          <tbody>
            {mutation.changes.map((c) => (
              <tr key={c.key} className="border-t border-amber-200/60">
                <td className="py-1 pr-3 font-mono text-[11px] text-gray-700">{c.key}</td>
                <td className="py-1 pr-3 text-gray-500">{c.before === null || c.before === '' ? '—' : String(c.before)}</td>
                <td className="py-1 font-semibold text-gray-900">{String(c.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!done ? (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onApply}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Terapkan
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
          >
            Batal
          </button>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-gray-500 italic">Sudah diproses.</div>
      )}
    </div>
  );
}
