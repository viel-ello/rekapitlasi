'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, ExclamationCircle, ChartLineUp } from 'flowbite-react-icons/outline';
import PublicHeader from '@/components/PublicHeader';
import { usePublicYears } from '@/lib/usePublicYears';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const TABLE_LABEL = {
  data_umum: 'Data Umum',
  data_pokja1: 'Pokja I',
  data_pokja2: 'Pokja II',
  data_pokja3: 'Pokja III',
  data_pokja4: 'Pokja IV',
  data_rekap_dawis: 'Rekapitulasi Dawis',
  data_bumil: 'Data Bumil',
};

const COLUMN_LABEL = {
  jml_dusun: 'Dusun', jml_pkk_rw: 'PKK RW', jml_pkk_rt: 'PKK RT', jml_dasa_wisma: 'Dasa Wisma',
  jml_krt: 'KRT', jml_kk: 'KK', jml_jiwa_l: 'Jiwa (L)', jml_jiwa_p: 'Jiwa (P)',
  kader_pkbn: 'Kader PKBN', kader_pkdrt: 'Kader PKDRT', kader_pola_asuh: 'Kader Pola Asuh',
  lansia_jml_klp: 'Lansia (Klp)', lansia_jml_anggota: 'Lansia (Angg)',
  gr_kerja_bakti: 'Kerja Bakti', gr_keagamaan: 'Keagamaan', gr_jimpitan: 'Jimpitan', gr_arisan: 'Arisan',
  paket_a_wrg: 'Paket A', paket_b_wrg: 'Paket B', paket_c_wrg: 'Paket C',
  taman_bacaan: 'Taman Bacaan',
  kader_pangan: 'Kader Pangan', kader_sandang: 'Kader Sandang', kader_tata_laksana_rt: 'Kader Tata RT',
  pemanfaatan_toga: 'TOGA', rumah_sehat: 'Rumah Sehat', rumah_kurang_sehat: 'Rumah Kurang Sehat',
  kader_posyandu: 'Kader Posyandu', kader_gizi: 'Kader Gizi', kader_kesling: 'Kader Kesling',
  kader_kb: 'Kader KB', posyandu_jumlah: 'Jumlah Posyandu', posyandu_terintegrasi: 'Posyandu Terintegrasi',
  rumah_jamban: 'Jamban', rumah_spal: 'SPAL', air_pdam: 'Air PDAM', air_sumur: 'Air Sumur',
  jml_anggota_l: 'Anggota (L)', jml_anggota_p: 'Anggota (P)', jamban: 'Jamban Warga', jkn_bpjs: 'JKN/BPJS',
  ibu_hamil: 'Ibu Hamil', ibu_melahirkan: 'Ibu Melahirkan', bayi_lahir_l: 'Bayi (L)', bayi_lahir_p: 'Bayi (P)',
};

const STATUS_LABEL = { lengkap: 'Lengkap', perlu_dicek: 'Perlu Dicek', belum_lengkap: 'Belum Lengkap' };

function fmt(n) {
  return Number(n || 0).toLocaleString('id-ID');
}

export default function PublikDusunDetail() {
  const params = useParams();
  const search = useSearchParams();
  const { years, error: yearsError, retry: retryYears } = usePublicYears();

  const [tahun, setTahun] = useState(Number(search.get('tahun')) || new Date().getFullYear());
  const [bulan, setBulan] = useState(Number(search.get('bulan')) || 12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const dusunId = params?.id;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const queryParams = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) });
        const res = await fetch(`/api/public/dusun/${dusunId}?${queryParams.toString()}`, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (!controller.signal.aborted) setError(errData.error || 'Gagal memuat data');
        } else {
          const json = await res.json();
          if (!controller.signal.aborted) setData(json);
        }
      } catch {
        if (!controller.signal.aborted) setError('Gagal menghubungi server');
      }
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [dusunId, tahun, bulan, attempt]);

  const trend = data?.trend || [];

  return (
    <div className="relative min-h-screen bg-[#f6f9f6]">
      <div className="glass-ambient" aria-hidden="true" />
      <div className="relative z-[1]">
      <PublicHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href={`/publik?tahun=${tahun}&bulan=${bulan}`}
          className="inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar dusun
        </Link>

        {yearsError && <p role="status" className="text-sm text-amber-800 mb-3">{yearsError} <button type="button" className="underline" onClick={retryYears}>Coba lagi</button></p>}

        {error ? (
          <div role="alert" className="bg-white rounded-2xl border border-red-100 p-6 text-center">
            <ExclamationCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h1 className="text-base font-bold text-gray-800">{error}</h1>
            <p className="text-sm text-gray-500 mt-1">Coba pilih tahun lain atau kembali ke daftar dusun.</p>
            <button type="button" className="mt-3 underline text-primary-700" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-4 sm:mb-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">Dusun</div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {data?.dusun?.nama || (loading ? 'Memuat...' : 'Dusun')}
                  </h1>
                  {data?.statusLabel && (
                    <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      data.status === 'lengkap' ? 'bg-green-50 text-green-700 border-green-200' :
                      data.status === 'perlu_dicek' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {data.statusLabel}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tahun}
                    onChange={(e) => setTahun(Number(e.target.value))}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    aria-label="Tahun"
                  >
                    {[...new Set([tahun, ...years])].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    value={bulan}
                    onChange={(e) => setBulan(Number(e.target.value))}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    aria-label="Bulan"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {!loading && !data?.hasData && <p role="status" className="mb-4 text-sm text-gray-600">Belum ada catatan untuk periode ini.</p>}
            <p className="text-xs text-gray-600 mb-4">Data Umum, Rekap Dawis, dan Bumil mengikuti bulan yang dipilih. Pokja I–IV merupakan data tahunan.</p>
            {Object.values(data?.periods || {}).includes('annual_legacy') && <p role="status" className="text-xs text-amber-800 mb-4">Sebagian tabel masih memakai skema tahunan. Nilainya merupakan laporan tahunan.</p>}
            {/* Trend penduduk */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-4 sm:mb-5 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ChartLineUp className="w-4 h-4 text-primary-600" /> Tren 5 Tahun
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <TrendCard label="Total Jiwa" rows={trend} field="total_jiwa" color="#059669" />
                <TrendCard label="Total KK" rows={trend} field="total_kk" color="#3B82F6" />
                <TrendCard label="Posyandu" rows={trend} field="total_posyandu" color="#F59E0B" />
                <TrendCard label="Dasa Wisma" rows={trend} field="total_dasa_wisma" color="#10b981" />
              </div>
            </div>

            {/* Per tabel */}
            <div className="space-y-4">
              {Object.keys(TABLE_LABEL).map((t) => {
                const row = data?.tables?.[t];
                const status = data?.tableStatuses?.[t]?.status;
                // Schema baru: kolom unit canonical adalah dusun_id. desa_id
                // dipertahankan di filter exclude untuk archive row legacy.
                const fields = row
                  ? Object.keys(row).filter((k) => !['dusun_id', 'desa_id', 'tahun', 'bulan'].includes(k))
                  : [];
                return (
                  <div key={t} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-bold text-gray-800">{TABLE_LABEL[t]}</h3>
                      {status && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          status === 'lengkap' ? 'bg-green-50 text-green-700' :
                          status === 'perlu_dicek' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {status === 'lengkap' ? <CheckCircle className="w-3 h-3" /> : <ExclamationCircle className="w-3 h-3" />}
                          {STATUS_LABEL[status]}
                        </span>
                      )}
                    </div>
                    {!row ? (
                      <div className="text-xs text-gray-500">{loading ? 'Memuat data…' : 'Belum ada data untuk periode ini.'}</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {fields.map((k) => (
                          <div key={k} className="rounded-lg border border-gray-100 px-3 py-2">
                            <div className="text-base font-bold text-gray-800">{fmt(row[k])}</div>
                            <div className="text-[11px] text-gray-500 truncate" title={COLUMN_LABEL[k] || k}>{COLUMN_LABEL[k] || k}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              <strong>Catatan privasi:</strong> Halaman ini hanya menampilkan agregat per dusun.
              Data perorangan, identitas warga, dan log aktivitas hanya bisa dilihat petugas yang berwenang.
            </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
}

function TrendCard({ label, rows, field, color }) {
  if (!rows || !rows.some((row) => row[field] !== null && row[field] !== undefined)) {
    return (
      <div className="rounded-xl border border-gray-100 p-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">{label}</div>
        <div className="h-24 flex items-center justify-center text-xs text-gray-400">Belum ada data</div>
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => Number(r[field] || 0)), 1);
  const last = rows[rows.length - 1]?.[field];
  const padX = 28;
  const padY = 22;
  const width = 280;
  const height = 110;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = rows.length > 1 ? innerW / (rows.length - 1) : 0;
  const segments = [];
  rows.forEach((r, i) => {
    if (r[field] == null) return;
    const x = padX + i * stepX;
    const y = padY + innerH - (Number(r[field] || 0) / max) * innerH;
    segments.push(`${i === 0 || rows[i - 1][field] == null ? 'M' : 'L'} ${x},${y}`);
  });

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs font-semibold text-gray-600">{label}</div>
        <div className="text-base font-bold text-gray-800">{last == null ? '—' : fmt(last)}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-24">
        <path d={segments.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {rows.map((r, i) => {
          const x = padX + i * stepX;
          const y = padY + innerH - (Number(r[field] || 0) / max) * innerH;
          const anchor = i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle';
          return (
            <g key={i}>
              {r[field] != null && <circle cx={x} cy={y} r="3" fill="#fff" stroke={color} strokeWidth="2" />}
              <text x={x} y={height - 6} textAnchor={anchor} fontSize="10" fill="#6b7280">{r.tahun}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
