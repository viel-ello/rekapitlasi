'use client';

import { useEffect, useMemo, useState } from 'react';

function numeric(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const METRICS = [
  ['KK', 'data_umum', (row) => row.jml_kk],
  ['Jiwa', 'data_umum', (row) => { const male = numeric(row.jml_jiwa_l); const female = numeric(row.jml_jiwa_p); return male == null || female == null ? null : male + female; }],
  ['Dasa Wisma', 'data_umum', (row) => row.jml_dasa_wisma],
  ['Rumah sehat (Pokja III)', 'data_pokja3', (row) => row.rumah_sehat],
  ['Posyandu', 'data_pokja4', (row) => row.posyandu_jumlah],
  ['JKN/BPJS', 'data_rekap_dawis', (row) => row.jkn_bpjs],
];

export default function DusunBenchmarkMatrix({ dusunList = [], tahun, bulan, selectedId }) {
  const [chosen, setChosen] = useState(null);
  const [result, setResult] = useState({ key: '', data: {}, loading: false });
  const selected = useMemo(() => {
    const available = dusunList.map((row) => String(row.id));
    const ids = chosen == null ? available.slice(0, 3) : chosen.filter((id) => available.includes(id));
    if (chosen == null && selectedId != null && available.includes(String(selectedId)) && !ids.includes(String(selectedId))) return [String(selectedId), ...ids].slice(0, 3);
    return ids;
  }, [chosen, dusunList, selectedId]);
  const requestKey = `${tahun}:${bulan}:${selected.join(',')}`;
  useEffect(() => {
    const controller = new AbortController();
    setResult({ key: requestKey, data: {}, loading: true });
    Promise.allSettled(selected.map(async (id) => {
      const response = await fetch(`/api/public/dusun/${encodeURIComponent(id)}?tahun=${tahun}&bulan=${bulan}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('unavailable');
      return [id, await response.json()];
    })).then((results) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, data: Object.fromEntries(results.filter((entry) => entry.status === 'fulfilled').map((entry) => entry.value)), loading: false });
    });
    return () => controller.abort();
  }, [requestKey]); // The key contains the complete set of selected ids and the period.
  const current = result.key === requestKey ? result : { data: {}, loading: true };
  const toggle = (id) => setChosen(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected.slice(-2), id]);
  if (!dusunList.length) return null;
  return <section aria-labelledby="comparison-title" className="glass rounded-3xl p-4 sm:p-6">
    <h2 id="comparison-title" className="text-lg font-bold text-gray-900">Bandingkan catatan dusun</h2><p className="text-sm text-gray-600 mt-1">Pilih hingga tiga dusun. Jumlah yang lebih tinggi tidak menunjukkan kualitas layanan.</p>
    <div className="flex flex-wrap gap-2 mt-4">{dusunList.map((row) => <button key={row.id} type="button" aria-pressed={selected.includes(String(row.id))} onClick={() => toggle(String(row.id))} className={`min-h-11 px-3 rounded-xl text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${selected.includes(String(row.id)) ? 'bg-primary-700 text-white' : 'bg-white/70 text-gray-700 border border-gray-200'}`}>{row.nama}</button>)}</div>
    <p role="status" className="text-xs text-gray-500 mt-3">{!selected.length ? 'Pilih dusun untuk menampilkan perbandingan.' : current.loading ? 'Memuat perbandingan periode terpilih…' : 'Tanda — berarti sumber belum tersedia atau belum dapat dimuat.'}</p>
    <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><caption className="sr-only">Perbandingan dusun tahun {tahun}, bulan {bulan}</caption><thead><tr className="border-b border-gray-200/60"><th scope="col" className="py-3 text-left font-semibold text-gray-600">Indikator</th>{selected.map((id) => <th scope="col" key={id} className={`px-4 py-3 text-right text-gray-900 whitespace-nowrap ${String(selectedId) === id ? 'bg-emerald-50/70' : ''}`}>{dusunList.find((row) => String(row.id) === id)?.nama}</th>)}</tr></thead><tbody>{METRICS.map(([label, table, getValue]) => <tr key={label} className="border-b border-gray-100/70"><th scope="row" className="py-3 text-left text-xs font-medium text-gray-600">{label}</th>{selected.map((id) => { const source = current.data[id]?.tables?.[table]; const value = source ? numeric(getValue(source)) : null; return <td key={id} className={`py-3 px-4 text-right font-semibold tabular-nums text-gray-900 ${String(selectedId) === id ? 'bg-emerald-50/70' : ''}`}>{value == null ? '—' : value.toLocaleString('id-ID')}</td>; })}</tr>)}</tbody></table></div>
    <p className="text-xs text-gray-500 mt-3">Data Umum dan Rekap Dawis mengikuti bulan terpilih. Pokja III dan IV merupakan catatan tahunan.</p>
    {Object.values(current.data).some((entry) => Object.values(entry.periods || {}).includes('annual_legacy')) && <p role="status" className="mt-2 text-xs text-amber-800">Sebagian sumber masih memakai catatan tahunan. Nilainya tidak mewakili bulan terpilih secara khusus.</p>}
  </section>;
}
