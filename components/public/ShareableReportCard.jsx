'use client';

import { useMemo, useState } from 'react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const format = (value) => value == null ? 'Belum tersedia' : Number(value).toLocaleString('id-ID');

export default function ShareableReportCard({ summary = {}, tahun, bulan = 12 }) {
  const [selectedId, setSelectedId] = useState('all');
  const [feedback, setFeedback] = useState('');
  const dusunList = summary.dusun || summary.desa || [];
  const report = useMemo(() => {
    if (selectedId === 'all') {
      const available = summary.availability?.data_umum;
      return { name: `Desa Belikurip (${dusunList.length} dusun aktif)`, kk: available ? summary.totals?.total_kk : null, jiwa: available ? summary.totals?.total_jiwa : null, path: `/publik?tahun=${tahun}&bulan=${bulan}`, status: `${summary.completeness?.complete ?? 0} dari ${dusunList.length} dusun berstatus lengkap` };
    }
    const dusun = dusunList.find((row) => String(row.id) === selectedId);
    const chart = (summary.perDusunChart || []).find((row) => row.id != null ? String(row.id) === selectedId : row.nama === dusun?.nama);
    return { name: dusun ? `Dusun ${dusun.nama}` : 'Dusun tidak tersedia', kk: chart?.hasData ? chart.kk : null, jiwa: chart?.hasData ? chart.jiwa : null, path: `/publik/dusun/${encodeURIComponent(selectedId)}?tahun=${tahun}&bulan=${bulan}`, status: ({ lengkap: 'Lengkap', perlu_dicek: 'Perlu dicek', belum_lengkap: 'Belum lengkap' })[dusun?.status] || 'Belum tersedia' };
  }, [selectedId, summary, dusunList, tahun, bulan]);
  const shareText = () => `Lumbung Data PKK Desa Belikurip\n${report.name}\nPeriode: ${MONTHS[bulan - 1]} ${tahun}\nJumlah KK: ${format(report.kk)}\nJumlah jiwa: ${format(report.jiwa)}\nStatus kelengkapan: ${report.status}\nStatus kelengkapan menunjukkan pencatatan, bukan verifikasi lapangan.\n${window.location.origin}${report.path}`;
  const copy = async () => {
    try { if (!navigator.clipboard?.writeText) throw new Error('unavailable'); await navigator.clipboard.writeText(shareText()); setFeedback('Teks laporan berhasil disalin.'); }
    catch { setFeedback('Teks belum dapat disalin. Gunakan tombol WhatsApp atau salin alamat halaman.'); }
  };
  return <section aria-labelledby="share-title" className="glass rounded-3xl p-4 sm:p-6 grid md:grid-cols-[1fr_1.1fr] gap-6 items-center">
    <div><h2 id="share-title" className="text-xl font-bold text-gray-900">Bagikan ringkasan periode</h2><p className="text-sm text-gray-600 mt-2 max-w-sm">Salin ringkasan jumlah KK dan jiwa beserta tautan ke sumber publik untuk periode ini.</p><label htmlFor="share-scope" className="block mt-5 mb-2 text-xs font-semibold text-gray-700">Lingkup ringkasan</label><select id="share-scope" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setFeedback(''); }} className="w-full max-w-sm min-h-11 px-3 rounded-xl bg-white/80 border border-gray-200 text-sm text-gray-800 focus:ring-2 focus:ring-primary-600 outline-none"><option value="all">Seluruh Desa Belikurip</option>{dusunList.map((row) => <option key={row.id} value={String(row.id)}>{row.nama}</option>)}</select></div>
    <div className="rounded-3xl p-5 sm:p-6 bg-emerald-900 text-white"><p className="text-xs text-emerald-200">{MONTHS[bulan - 1]} {tahun}</p><h3 className="mt-2 text-xl font-bold">{report.name}</h3><dl className="grid grid-cols-2 gap-4 mt-6"><div><dt className="text-xs text-emerald-100">Jumlah KK</dt><dd className="mt-1 text-xl font-bold tabular-nums">{format(report.kk)}</dd></div><div><dt className="text-xs text-emerald-100">Jumlah jiwa</dt><dd className="mt-1 text-xl font-bold tabular-nums">{format(report.jiwa)}</dd></div></dl><p className="mt-5 text-xs text-emerald-100">Kelengkapan: {report.status}</p><p className="mt-2 text-xs text-emerald-200">Status menunjukkan pencatatan, bukan verifikasi lapangan.</p><div className="flex flex-wrap gap-2 mt-5"><button type="button" onClick={copy} className="min-h-11 px-4 rounded-xl bg-white text-emerald-950 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-300">Salin ringkasan</button><button type="button" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText())}`, '_blank', 'noopener,noreferrer')} className="min-h-11 px-4 rounded-xl border border-emerald-200/50 text-white text-xs font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-300">Buka WhatsApp</button></div><p role="status" className="mt-3 text-xs text-emerald-100">{feedback}</p></div>
  </section>;
}
