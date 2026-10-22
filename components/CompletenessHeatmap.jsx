'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const rowsOf = rekap => rekap?.completeness?.perDusun || rekap?.completeness?.perDesa || [];
const mapRows = rows => Object.fromEntries(rows.map(row => [String(row.id), row]));

export default function CompletenessHeatmap({ tahun, activeBulan = 12, jenisData = 'all', onSelectBulan, currentRekap = null, selectedDusunId, highlightedDusunId, onHighlightDusun }) {
  const [matrix, setMatrix] = useState({ key: '', months: {} });
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState(null);
  const cache = useRef({});
  const key = `${tahun}:${jenisData}`;
  const dusunList = useMemo(() => rowsOf(currentRekap).map(d => ({ id: String(d.id), nama: d.nama })), [currentRekap]);
  const activeRows = rowsOf(currentRekap);
  const monthData = matrix.key === key ? matrix.months : {};
  // The supplied snapshot and this component always share the loaded period.
  const data = { ...monthData, [activeBulan]: mapRows(activeRows) };

  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setLoading(true);
    setMatrix({ key, months: cache.current[key] || {} });
    (async () => {
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const results = await Promise.allSettled(months.map(async month => {
        const params = new URLSearchParams({ tahun: String(tahun), bulan: String(month), jenis: jenisData });
        const response = await fetch(`/api/rekap?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Periode tidak tersedia');
        return [month, mapRows(rowsOf(await response.json()))];
      }));
      if (controller.signal.aborted) return;
      const loaded = Object.fromEntries(results.filter(result => result.status === 'fulfilled').map(result => result.value));
      cache.current[key] = loaded;
      setMatrix({ key, months: loaded });
      setLoading(false);
    })();
    return () => controller.abort();
  }, [key, tahun, jenisData, retry]);

  const unavailableMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(month => !data[month]);
  return (
    <section className="glass rounded-3xl p-5 md:p-6" aria-label="Jejak kelengkapan pelaporan tahunan" aria-busy={loading}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Jejak pelaporan {tahun}</h2><p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{dusunList.length} dusun, 12 bulan. Pilih sel untuk membuka periode dan memfokuskan dusun.</p></div>
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-gray-600 dark:text-gray-300"><span><span className="inline-block w-2 h-2 rounded-sm bg-primary-600 mr-1" />Lengkap</span><span><span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1" />Perlu dicek</span><span><span className="inline-block w-2 h-2 rounded-sm bg-red-200 mr-1" />Belum lengkap</span><span><span className="inline-block w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-700 mr-1" />Belum tersedia</span></div>
      </div>
      <div className="overflow-x-auto mt-5 pb-1">
        <table className="w-full min-w-[680px] border-separate border-spacing-1 text-xs"><caption className="sr-only">Kelengkapan per dusun dan bulan pada tahun {tahun}. Sel kosong data berbeda dari data yang belum tersedia.</caption>
          <thead><tr><th scope="col" className="text-left font-semibold text-gray-600 dark:text-gray-300 w-36">Dusun</th>{SHORT_MONTHS.map((month, i) => <th key={month} scope="col"><button type="button" onClick={() => onSelectBulan?.(i + 1)} aria-pressed={activeBulan === i + 1} className={`py-2 w-full rounded-lg font-semibold focus-visible:outline-primary-600 ${activeBulan === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10'}`}>{month}</button></th>)}</tr></thead>
          <tbody>{dusunList.map(dusun => <tr key={dusun.id}><th scope="row" className={`text-left font-semibold pr-2 ${String(selectedDusunId) === dusun.id || String(highlightedDusunId) === dusun.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>{dusun.nama}</th>{MONTHS.map((month, index) => {
            const monthNumber = index + 1;
            const cell = data[monthNumber]?.[dusun.id];
            const label = !cell ? 'Belum tersedia' : cell.status === 'lengkap' ? 'Lengkap' : cell.status === 'perlu_dicek' ? 'Perlu dicek' : 'Belum lengkap';
            const tone = !cell ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : cell.status === 'lengkap' ? 'bg-primary-600 text-white' : cell.status === 'perlu_dicek' ? 'bg-amber-500 text-gray-950' : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
            const selected = monthNumber === activeBulan && String(selectedDusunId) === dusun.id;
            const describe = () => setPreview(`${dusun.nama} · ${month} ${tahun}: ${label}${cell ? `. ${cell.filled || 0} dari ${cell.total || 0} tabel lengkap.` : '.'}`);
            return <td key={month}><button type="button" onClick={() => onSelectBulan?.(monthNumber, dusun.id)} onMouseEnter={describe} onMouseLeave={() => setPreview(null)} onFocus={() => { describe(); onHighlightDusun?.(dusun.id); }} onBlur={() => { setPreview(null); onHighlightDusun?.(null); }} aria-label={`${dusun.nama}, ${month} ${tahun}: ${label}`} aria-pressed={selected} className={`h-8 w-full rounded-md text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 hover:brightness-95 ${tone} ${selected ? 'ring-2 ring-offset-1 ring-primary-500 dark:ring-offset-gray-900' : ''}`}>{!cell ? '·' : cell.status === 'lengkap' ? '✓' : cell.status === 'perlu_dicek' ? '!' : '–'}</button></td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300 mt-3 min-h-5" aria-live="polite">{preview || (loading ? 'Memuat periode lain. Data yang belum dimuat ditandai abu-abu.' : unavailableMonths.length ? `${unavailableMonths.length} bulan belum tersedia. Data tersebut tidak dihitung sebagai belum lengkap.` : 'Seluruh periode berhasil dimuat.')}{!loading && unavailableMonths.length > 0 && <button type="button" onClick={() => setRetry(value => value + 1)} className="font-semibold text-primary-700 dark:text-primary-300 underline ml-2">Muat ulang</button>}</div>
    </section>
  );
}
