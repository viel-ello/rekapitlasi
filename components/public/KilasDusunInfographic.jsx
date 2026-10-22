'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';

const STATUS = { lengkap: ['Lengkap', 'bg-emerald-50 text-emerald-800'], perlu_dicek: ['Perlu dicek', 'bg-amber-50 text-amber-800'], belum_lengkap: ['Belum lengkap', 'bg-rose-50 text-rose-800'] };
const fmt = (value) => value == null ? '—' : Number(value).toLocaleString('id-ID');

export default function KilasDusunInfographic({ dusunList = [], perDusunChart = [], tahun, bulan, selectedId = null, onSelect }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const rows = useMemo(() => dusunList.map((dusun) => {
    const chart = perDusunChart.find((item) => item.id != null ? String(item.id) === String(dusun.id) : item.nama === dusun.nama);
    return { ...dusun, id: String(dusun.id), chart };
  }).filter((dusun) => dusun.nama.toLocaleLowerCase('id-ID').includes(query.toLocaleLowerCase('id-ID')) && (statusFilter === 'all' || dusun.status === statusFilter)), [dusunList, perDusunChart, query, statusFilter]);

  return <section aria-labelledby="kilas-title" className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><h2 id="kilas-title" className="text-xl font-bold text-gray-900">Catatan dari setiap dusun</h2><p className="text-sm text-gray-600 mt-1">Pilih kartu atau batang grafik untuk menyorot dusun yang sama.</p></div>
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="dusun-search">Cari dusun</label><input id="dusun-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari dusun" className="w-40 min-h-11 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm focus:ring-2 focus:ring-primary-600 outline-none" />
        <label className="sr-only" htmlFor="dusun-status">Status kelengkapan</label><select id="dusun-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm focus:ring-2 focus:ring-primary-600 outline-none"><option value="all">Semua status</option>{Object.entries(STATUS).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((dusun) => {
        const selected = String(selectedId) === dusun.id;
        const [label, tone] = STATUS[dusun.status] || ['Belum tersedia', 'bg-gray-100 text-gray-600'];
        const available = dusun.chart?.hasData === true;
        return <article key={dusun.id} className={`glass rounded-3xl overflow-hidden border transition-colors ${selected ? 'border-primary-500 ring-2 ring-primary-500/30 bg-emerald-50/70' : 'border-white/70'}`}>
          <button type="button" aria-pressed={selected} onClick={() => onSelect?.(selected ? null : dusun.id)} className="w-full text-left p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600">
            <div className="flex justify-between gap-2 items-start"><h3 className="text-lg font-bold text-gray-900">{dusun.nama}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>{dusun.status === 'lengkap' ? <CheckCircle className="w-3 h-3" /> : <ExclamationCircle className="w-3 h-3" />}{label}</span></div>
            <dl className="grid grid-cols-2 gap-3 mt-6"><div><dt className="text-xs text-gray-600">Jumlah KK</dt><dd className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{fmt(available ? dusun.chart.kk : null)}</dd></div><div><dt className="text-xs text-gray-600">Jumlah jiwa</dt><dd className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{fmt(available ? dusun.chart.jiwa : null)}</dd></div></dl>
            <p className="text-xs text-gray-500 mt-4">{available ? selected ? 'Dusun disorot pada grafik.' : 'Data Umum tercatat pada periode ini.' : 'Data Umum belum tersedia pada periode ini.'}</p>
          </button>
          <Link href={`/publik/dusun/${encodeURIComponent(dusun.id)}?tahun=${tahun}&bulan=${bulan}`} className="flex items-center justify-between min-h-11 px-5 py-3 border-t border-white/70 text-xs font-semibold text-primary-800 hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600">Lihat detail periode <ArrowRight className="w-4 h-4" /></Link>
        </article>;
      })}
    </div>
    {!rows.length && <p role="status" className="glass rounded-2xl p-6 text-sm text-gray-600">Tidak ada dusun yang sesuai dengan pencarian.</p>}
  </section>;
}
