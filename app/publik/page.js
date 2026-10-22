'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ExclamationCircle, Globe, ArrowRight } from 'flowbite-react-icons/outline';
import PublicHeader from '@/components/PublicHeader';
import AnimatedCounter from '@/components/AnimatedCounter';
import { usePublicYears } from '@/lib/usePublicYears';
import KilasDusunInfographic from '@/components/public/KilasDusunInfographic';
import DusunBenchmarkMatrix from '@/components/public/DusunBenchmarkMatrix';
import ShareableReportCard from '@/components/public/ShareableReportCard';
import AmbientBackdrop from '@/components/AmbientBackdrop';

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
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedDusunId, setSelectedDusunId] = useState(null);
  const { years, error: yearsError, retry: retryYears } = usePublicYears();

  useEffect(() => {
    // Keep the visitor's selected period, including historical deep links.
    const selected = new URLSearchParams(window.location.search);
    const year = Number(selected.get('tahun'));
    const month = Number(selected.get('bulan'));
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) setTahun(year);
    if (Number.isInteger(month) && month >= 1 && month <= 12) setBulan(month);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSummary(null);
    (async () => {
      try {
        const params = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) });
        const res = await fetch(`/api/public/summary?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) throw new Error('Ringkasan publik belum dapat dimuat. Silakan coba lagi.');
        const payload = await res.json();
        if (!controller.signal.aborted) setSummary(payload);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message || 'Gagal menghubungi server.');
      }
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [tahun, bulan, attempt]);

  const totals = summary?.totals || {};
  const chartRows = useMemo(() => (summary?.dusun || summary?.desa || []).map((dusun) => ({ ...summary?.perDusunChart?.find((item) => item.id != null ? String(item.id) === String(dusun.id) : item.nama === dusun.nama), id: String(dusun.id), nama: dusun.nama })), [summary]);
  const completeness = summary?.completeness || { complete: 0, needsCheck: 0, incomplete: 0 };

  const kpi = useMemo(() => ([
    { label: 'Total Dusun', value: summary?.totalDusun ?? summary?.totalDesa, sub: 'dusun aktif', tone: 'primary' },
    { label: 'Dusun Lengkap', value: completeness.complete, sub: `dari ${summary?.totalDusun ?? summary?.totalDesa ?? 0}`, tone: 'green' },
    { label: 'Perlu Dicek', value: completeness.needsCheck, sub: 'ada warning', tone: 'amber' },
    { label: 'Belum Lengkap', value: completeness.incomplete, sub: 'data minimal', tone: 'red' },
  ]), [summary, completeness]);

  const indicators = useMemo(() => ([
    { label: 'Total KK', value: totals.total_kk, tables: ['data_umum'] },
    { label: 'Total Jiwa', value: totals.total_jiwa, tables: ['data_umum'] },
    { label: 'Dasa Wisma', value: totals.total_dasa_wisma, tables: ['data_umum'] },
    { label: 'Posyandu', value: totals.total_posyandu, tables: ['data_pokja4'] },
    { label: 'Ibu Hamil', value: totals.total_bumil, tables: ['data_bumil'] },
    { label: 'Rumah Sehat', value: totals.total_rumah_sehat, tables: ['data_pokja3', 'data_rekap_dawis'] },
    { label: 'Kelahiran Bayi', value: totals.total_kelahiran, tables: ['data_bumil'] },
    { label: 'JKN/BPJS', value: totals.total_jkn_bpjs, tables: ['data_rekap_dawis'] },
  ]), [totals]);

  return (
    <div className="relative min-h-screen bg-gray-50">
      <AmbientBackdrop />
      <div className="relative z-[1]">
      <PublicHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Title */}
        <div className="mb-6 glass-panel rounded-3xl p-5 sm:p-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-primary-700">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-700">Data Publik</span>
          </div>
          <div className="flex flex-wrap justify-between items-start gap-4"><h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary-600" /> Data Publik PKK Desa Belikurip
          </h1></div>
          <p className="text-sm text-gray-600 mt-1">
            Ringkasan agregat per dusun. Data pribadi/individu tidak ditampilkan.
          </p>
          {!loading && summary?.lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Data Umum terakhir diperbarui: {new Date(summary.lastUpdated).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
        </div>

        {yearsError && <p role="status" className="text-sm text-amber-800 mb-3">{yearsError} <button type="button" className="underline" onClick={retryYears}>Coba lagi</button></p>}

        {/* Filter */}
        <div className="glass rounded-3xl p-3 sm:p-4 mb-6 flex flex-wrap items-center gap-3">
          <p className="font-semibold text-sm text-primary-900 sm:mr-auto">Periode laporan <span className="block text-xs font-normal text-gray-600 mt-1">{MONTHS[bulan - 1]} {tahun}</span></p>
          <div className="flex items-center gap-2">
            <label htmlFor="pubtahun" className="text-xs font-semibold text-gray-600">Tahun</label>
            <select
              id="pubtahun"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {[...new Set([tahun, ...years])].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
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

        {error && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-800">{error} <button type="button" className="ml-2 underline font-semibold" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button></div>}
        {!loading && !error && summary && (summary.totalDusun === 0 || !summary.hasData) && <p role="status" className="mb-6 rounded-2xl bg-white p-4 text-sm text-gray-700">{summary.totalDusun === 0 ? 'Belum ada dusun aktif yang ditampilkan.' : 'Belum ada catatan untuk periode ini. Pilih tahun atau bulan lain untuk melihat data yang tersedia.'}</p>}
        <p className="text-xs text-gray-600 mb-4">Data Umum, Rekap Dawis, dan Bumil mengikuti bulan yang dipilih. Pokja I–IV merupakan data tahunan.</p>
        {Object.values(summary?.periods || {}).includes('annual_legacy') && <p role="status" className="text-xs text-amber-800 mb-4">Sebagian tabel masih memakai skema tahunan. Nilainya merupakan laporan tahunan, bukan khusus bulan yang dipilih.</p>}
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpi.map((k) => (
            <div key={k.label} className="glass rounded-3xl p-4">
              <div className="text-2xl font-bold text-gray-800 tabular-nums">
                {loading || error || k.value == null ? '—' : <AnimatedCounter value={Number(k.value)} />}
              </div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</div>
              <div className="text-[11px] text-gray-500">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Narasi ringkas */}
        {!loading && !error && summary?.totalDusun > 0 && summary.hasData && !summary.availability?.data_umum && <p role="status" className="mb-6 rounded-2xl bg-white p-4 text-sm text-gray-700">Catatan kegiatan tersedia, tetapi Data Umum untuk periode ini belum tersedia. Jumlah KK dan jiwa belum dapat diringkas.</p>}
        {!loading && !error && summary?.totalDusun > 0 && summary.availability?.data_umum && (
          <div className="glass rounded-3xl p-4 sm:p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">Ringkasan Kondisi</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pada periode <strong>{MONTHS[bulan - 1]} {tahun}</strong>, TP PKK Desa Belikurip
              mencatat <strong>{Number(totals.total_kk || 0).toLocaleString('id-ID')} KK</strong> dan
              {' '}<strong>{Number(totals.total_jiwa || 0).toLocaleString('id-ID')} jiwa</strong> di
              {' '}{summary.totalDusun ?? 0} dusun.
              {' '}Dari sisi kelengkapan data, <strong>{completeness.complete}</strong> dusun sudah lengkap
              {completeness.needsCheck > 0 && <>, <strong>{completeness.needsCheck}</strong> perlu dicek</>}
              {completeness.incomplete > 0 && <>, dan <strong>{completeness.incomplete}</strong> belum lengkap</>}.
              {(completeness.needsCheck > 0 || completeness.incomplete > 0)
                ? ' Status tersebut menunjukkan bagian pencatatan yang perlu ditinjau.'
                : ' Seluruh dusun telah melengkapi data periode ini.'}
            </p>
          </div>
        )}

        {/* Chart sederhana: KK per dusun */}
        {!loading && !error && chartRows.length > 0 && (
          <div className="glass rounded-3xl p-4 sm:p-5 mb-6">
            <div className="flex justify-between flex-wrap gap-2 mb-3"><h2 className="text-lg font-bold text-gray-800">Jumlah KK per dusun</h2>{selectedDusunId && <button type="button" className="text-xs text-primary-700 font-semibold underline min-h-8 focus-visible:ring-2 focus-visible:ring-primary-600" onClick={() => setSelectedDusunId(null)}>Hapus sorotan</button>}</div>
            <PublicBarChart data={chartRows} selectedId={selectedDusunId} onSelect={setSelectedDusunId} />
          </div>
        )}

        {/* Indikator agregat */}
        <div className="glass rounded-3xl p-4 sm:p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Indikator Agregat</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {indicators.map((it) => {
              const availableSources = it.tables.filter((table) => summary?.availability?.[table]).length;
              const completeSources = availableSources === it.tables.length;
              return (
              <div key={it.label} className="rounded-2xl border border-white/50 bg-white/40 p-3">
                <div className="text-lg font-bold text-gray-800 tabular-nums">
                  {loading || error || !completeSources ? '—' : <AnimatedCounter value={Number(it.value || 0)} />}
                </div>
                <div className="text-xs text-gray-600 truncate">{it.label}</div>
                {!loading && !error && !completeSources && <p className="text-xs text-gray-500">{availableSources > 0 ? 'Sebagian sumber belum tersedia' : 'Belum ada catatan'}</p>}
              </div>
              );
            })}
          </div>
        </div>

        {/* Infografis Kilas Dusun */}
        {!loading && !error && summary && (
          <div className="mb-6">
            <KilasDusunInfographic
              dusunList={summary.dusun || summary.desa || []}
              perDusunChart={summary.perDusunChart || []}
              totals={totals}
              tahun={tahun}
              bulan={bulan}
              selectedId={selectedDusunId}
              onSelect={setSelectedDusunId}
            />
          </div>
        )}

        {/* Matriks Komparasi Dusun */}
        {!loading && !error && summary && (
          <div className="mb-6">
            <DusunBenchmarkMatrix
              dusunList={summary.dusun || summary.desa || []}
              perDusunChart={summary.perDusunChart || []}
              tahun={tahun}
              bulan={bulan}
              selectedId={selectedDusunId}
            />
          </div>
        )}

        {/* Tabel dusun */}
        <div className="glass rounded-3xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-white/40 flex items-center justify-between flex-wrap gap-2">
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
                {error ? (<tr><td colSpan="3" className="px-4 py-8 text-center text-gray-600">Data belum dapat dimuat.</td></tr>) : loading ? (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
                ) : ((summary?.dusun || summary?.desa) || []).length === 0 ? (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">Belum ada data</td></tr>
                ) : (
                  (summary.dusun || summary.desa).map((d) => (
                    <tr key={d.id} className={String(selectedDusunId) === String(d.id) ? 'bg-emerald-50' : 'hover:bg-gray-50'}>
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
                            className="inline-flex items-center gap-1 min-h-11 text-xs font-semibold text-primary-700 hover:text-primary-800 focus-visible:ring-2 focus-visible:ring-primary-600"
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

        {/* Kartu Laporan Ringkas Siap Bagikan */}
        {!loading && !error && summary && (
          <div className="mt-6 mb-6">
            <ShareableReportCard
              summary={summary}
              tahun={tahun}
              bulan={bulan}
            />
          </div>
        )}

        {/* Definisi istilah */}
        <div className="mt-6 glass rounded-3xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Definisi Istilah</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="font-semibold text-gray-700 inline">Dasa Wisma:</dt><dd className="text-gray-600 inline"> kelompok rumah tangga dalam pencatatan PKK.</dd></div>
            <div><dt className="font-semibold text-gray-700 inline">KK:</dt><dd className="text-gray-600 inline"> jumlah keluarga yang tercatat.</dd></div>
            <div><dt className="font-semibold text-gray-700 inline">Posyandu:</dt><dd className="text-gray-600 inline"> jumlah pos pelayanan terpadu yang tercatat.</dd></div>
            <div><dt className="font-semibold text-gray-700 inline">JKN/BPJS:</dt><dd className="text-gray-600 inline"> jumlah kepesertaan yang tercatat.</dd></div>
            <div><dt className="font-semibold text-gray-700 inline">Rumah Sehat:</dt><dd className="text-gray-600 inline"> jumlah pada kolom rumah sehat di laporan.</dd></div>
            <div><dt className="font-semibold text-gray-700 inline">Ibu Hamil:</dt><dd className="text-gray-600 inline"> jumlah ibu hamil yang tercatat pada periode.</dd></div>
          </dl>
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
    </div>
  );
}

/** Bar chart horizontal sederhana (tanpa lib) untuk KK per dusun. */
function PublicBarChart({ data, selectedId, onSelect }) {
  const rows = data || [];
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">Belum ada data KK untuk periode ini.</p>;
  }
  const max = Math.max(...rows.map((d) => d.hasData ? Number(d.kk) || 0 : 0), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((d) => (
        <button type="button" key={d.id} aria-pressed={String(selectedId) === d.id} aria-label={`${d.nama}, ${d.hasData ? `${d.kk} KK` : 'Data Umum belum tersedia'}`} onClick={() => onSelect(String(selectedId) === d.id ? null : d.id)} className={`flex w-full min-h-11 items-center gap-2 p-2 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${String(selectedId) === d.id ? 'bg-emerald-100/70 ring-1 ring-emerald-300' : 'hover:bg-white/70'}`}>
          <div className="w-28 shrink-0 text-xs text-gray-600 truncate" title={d.nama}>{d.nama}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${d.hasData ? (Number(d.kk) / max) * 100 : 0}%` }}
            />
          </div>
          <div className="w-14 shrink-0 text-right text-xs font-semibold text-gray-700">{d.hasData ? Number(d.kk).toLocaleString('id-ID') : '—'}</div>
        </button>
      ))}
    </div>
  );
}
