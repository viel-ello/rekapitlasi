'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ExclamationCircle, Globe, ArrowRight } from 'flowbite-react-icons/outline';
import PublicHeader from '@/components/PublicHeader';
import AnimatedCounter from '@/components/AnimatedCounter';
import { useYears } from '@/lib/useYears';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const STATUS_BADGE = {
  lengkap: 'bg-green-50 text-green-700 border-green-200',
  perlu_dicek: 'bg-amber-50 text-amber-700 border-amber-200',
  belum_lengkap: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_LABEL = {
  lengkap: 'Lengkap',
  perlu_dicek: 'Perlu dicek',
  belum_lengkap: 'Belum lengkap',
};

export default function PublikPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(12);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) });
        const res = await fetch(`/api/public/summary?${params.toString()}`, { cache: 'no-store' });
        if (res.ok && !cancelled) setSummary(await res.json());
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tahun, bulan]);

  const totals = summary?.totals || {};
  const completeness = summary?.completeness || { complete: 0, needsCheck: 0, incomplete: 0 };

  const kpi = useMemo(() => ([
    { label: 'Total Dusun', value: summary?.totalDusun ?? summary?.totalDesa, sub: 'dusun aktif', tone: 'primary' },
    { label: 'Dusun Lengkap', value: completeness.complete, sub: `dari ${summary?.totalDusun ?? summary?.totalDesa ?? 0}`, tone: 'green' },
    { label: 'Perlu Dicek', value: completeness.needsCheck, sub: 'ada warning', tone: 'amber' },
    { label: 'Belum Lengkap', value: completeness.incomplete, sub: 'data minimal', tone: 'red' },
  ]), [summary, completeness]);

  const indicators = useMemo(() => ([
    { label: 'Total KK', value: totals.total_kk, tone: 'primary' },
    { label: 'Total Jiwa', value: totals.total_jiwa, tone: 'blue' },
    { label: 'Dasa Wisma', value: totals.total_dasa_wisma, tone: 'green' },
    { label: 'Posyandu', value: totals.total_posyandu, tone: 'amber' },
    { label: 'Ibu Hamil', value: totals.total_bumil, tone: 'blue' },
    { label: 'Rumah Sehat', value: totals.total_rumah_sehat, tone: 'green' },
    { label: 'Kelahiran Bayi', value: totals.total_kelahiran, tone: 'primary' },
    { label: 'JKN/BPJS', value: totals.total_jkn_bpjs, tone: 'blue' },
  ]), [totals]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-primary-700">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-700">Data Publik</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary-600" /> Data Publik PKK Desa Belikurip
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ringkasan agregat per dusun. Data pribadi/individu tidak ditampilkan.
          </p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="pubtahun" className="text-xs font-semibold text-gray-600">Tahun</label>
            <select
              id="pubtahun"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {(years.length > 0 ? years : [tahun]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pubbulan" className="text-xs font-semibold text-gray-600">Bulan</label>
            <select
              id="pubbulan"
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpi.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="text-2xl font-bold text-gray-800">
                {loading ? '—' : <AnimatedCounter value={Number(k.value || 0)} />}
              </div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</div>
              <div className="text-[11px] text-gray-500">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Indikator agregat */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Indikator Agregat</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {indicators.map((it) => (
              <div key={it.label} className="rounded-xl border border-gray-100 p-3">
                <div className="text-lg font-bold text-gray-800">
                  {loading ? '—' : <AnimatedCounter value={Number(it.value || 0)} />}
                </div>
                <div className="text-xs text-gray-600 truncate">{it.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabel dusun */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Per Dusun</h2>
            <span className="text-xs text-gray-500">Klik dusun untuk detail publik</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Dusun</th>
                  <th className="px-4 py-2 text-center">Status Kelengkapan</th>
                  <th className="px-4 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
                ) : ((summary?.dusun || summary?.desa) || []).length === 0 ? (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">Belum ada data</td></tr>
                ) : (
                  (summary.dusun || summary.desa).map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{d.nama}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[d.status]}`}>
                          {d.status === 'lengkap' ? <CheckCircle className="w-3 h-3" /> : <ExclamationCircle className="w-3 h-3" />}
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/publik/dusun/${d.id}?tahun=${tahun}&bulan=${bulan}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
                        >
                          Lihat detail <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          <strong>Catatan:</strong> Data yang ditampilkan adalah agregat (jumlah/total) per dusun.
          Data perorangan, identitas warga, log aktivitas, dan dokumen internal tidak diakses dari halaman ini.
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>© {new Date().getFullYear()} TP PKK Desa Belikurip · Kecamatan Baturetno · Wonogiri</div>
          <Link href="/login" className="hover:text-primary-700">Masuk Aplikasi</Link>
        </div>
      </footer>
    </div>
  );
}
