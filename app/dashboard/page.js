'use client';

import { useEffect, useState } from 'react';
import { MapPin, Users, Home, Chart, ChartPie, ChartLineUp, Download, FileLines, ClipboardList } from 'flowbite-react-icons/outline';
import { Heart } from 'flowbite-react-icons/solid';

export default function DashboardPage() {
  const [rekap, setRekap] = useState(null);
  const [trend, setTrend] = useState([]);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchRekap();
  }, [tahun]);

  const fetchRekap = async () => {
    setLoading(true);
    try {
      const [resRekap, resTrend] = await Promise.all([
        fetch(`/api/rekap?tahun=${tahun}`),
        fetch('/api/rekap/trend')
      ]);
      setRekap(await resRekap.json());
      setTrend(await resTrend.json());
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
    setLoading(false);
  };

  const handleDownload = async (type) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/export/${type}?tahun=${tahun}`);
      if (!res.ok) throw new Error('Gagal mengunduh');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel'
        ? `Rekapitulasi_PKK_Baturetno_${tahun}.xlsx`
        : `Data_Kegiatan_PKK_${tahun}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Terjadi kesalahan saat mengunduh file.');
    }
    setDownloading(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-3/5 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-4 w-2/5 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const totalJiwa = (rekap?.dataUmum?.total_jiwa_l || 0) + (rekap?.dataUmum?.total_jiwa_p || 0);

  const statCards = [
    { label: 'Total Desa', value: rekap?.totalDesa || 0, icon: MapPin, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Jiwa', value: totalJiwa, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: 'Total KK', value: rekap?.dataUmum?.total_kk || 0, icon: Home, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
    { label: 'Posyandu', value: rekap?.posyanduTotal || 0, icon: Heart, color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Rekapitulasi</h1>
          <p className="text-sm text-gray-500 mt-0.5">TP PKK Kecamatan Baturetno — Tahun {tahun}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloading === 'excel'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-primary-500/20 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading === 'excel' ? 'Sedang...' : 'Export Excel'}
          </button>
          <button
            onClick={() => handleDownload('word')}
            disabled={downloading === 'word'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <FileLines className="w-4 h-4" />
            {downloading === 'word' ? 'Sedang...' : 'Export Word'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-6 h-6 text-${card.color.split('-')[1]}-600`} />
              </div>
              <div className="text-2xl font-bold text-gray-800">{card.value.toLocaleString('id-ID')}</div>
              <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Horizontal Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-5">
            <Chart className="w-5 h-5 text-primary-500" /> Jumlah Jiwa per Desa
          </h3>
          {(() => {
            const items = rekap?.perDesaJiwa || [];
            const maxVal = Math.max(...items.map(x => x.jiwa_l + x.jiwa_p), 1);
            return (
              <div className="space-y-2">
                {items.map((d, i) => {
                  const total = d.jiwa_l + d.jiwa_p;
                  const pct = (total / maxVal) * 100;
                  return (
                    <div key={i} className="group flex items-center gap-3">
                      <div className="w-24 sm:w-28 text-right text-xs font-semibold text-gray-600 truncate flex-shrink-0" title={d.nama}>
                        {d.nama}
                      </div>
                      <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            background: `linear-gradient(90deg, #059669 0%, #10b981 60%, #34d399 100%)`,
                          }}
                        />
                        {total > 0 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors">
                            {total.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-5">
            <ChartPie className="w-5 h-5 text-primary-500" /> Komposisi Jiwa (L/P)
          </h3>
          <div className="flex items-center justify-center gap-8">
            <svg viewBox="0 0 200 200" className="w-44 h-44">
              {(() => {
                const l = rekap?.dataUmum?.total_jiwa_l || 1;
                const p = rekap?.dataUmum?.total_jiwa_p || 1;
                const total = l + p;
                const lPct = l / total;
                const circumference = 2 * Math.PI * 70;
                return (
                  <>
                    {/* Background ring */}
                    <circle cx="100" cy="100" r="70" fill="none" stroke="#f3f4f6" strokeWidth="24" />
                    {/* Male arc */}
                    <circle
                      cx="100" cy="100" r="70" fill="none"
                      stroke="url(#maleGrad)" strokeWidth="24" strokeLinecap="round"
                      strokeDasharray={`${lPct * circumference} ${circumference}`}
                      transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                    {/* Female arc */}
                    <circle
                      cx="100" cy="100" r="70" fill="none"
                      stroke="url(#femaleGrad)" strokeWidth="24" strokeLinecap="round"
                      strokeDasharray={`${(1 - lPct) * circumference} ${circumference}`}
                      strokeDashoffset={`${-lPct * circumference}`}
                      transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                    {/* Center text */}
                    <text x="100" y="93" textAnchor="middle" fill="#1f2937" fontSize="20" fontWeight="800">{total.toLocaleString('id-ID')}</text>
                    <text x="100" y="113" textAnchor="middle" fill="#9ca3af" fontSize="10">Total Jiwa</text>
                    <defs>
                      <linearGradient id="maleGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                      <linearGradient id="femaleGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">Laki-laki</span>
                </div>
                <div className="text-lg font-bold text-gray-800">{(rekap?.dataUmum?.total_jiwa_l || 0).toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <span className="text-xs text-gray-500 font-medium">Perempuan</span>
                </div>
                <div className="text-lg font-bold text-gray-800">{(rekap?.dataUmum?.total_jiwa_p || 0).toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <ChartLineUp className="w-5 h-5 text-gray-400" /> Tren Multi-Tahun (Kecamatan)
        </h3>
        <div className="flex gap-8 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h4 className="text-xs text-gray-400 mb-2 text-center">Total Jiwa</h4>
            <svg viewBox="0 0 300 120" className="w-full overflow-visible">
              {(() => {
                const max = Math.max(...trend.map(t => t.total_jiwa), 1);
                const pts = trend.map((t, i) => `${30 + i * 120},${100 - (t.total_jiwa / max) * 80}`).join(' L ');
                return (
                  <>
                    <path d={`M ${pts}`} fill="none" stroke="#059669" strokeWidth="3" />
                    {trend.map((t, i) => {
                      const x = 30 + i * 120;
                      const y = 100 - (t.total_jiwa / max) * 80;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="5" fill="#fff" stroke="#059669" strokeWidth="2" />
                          <text x={x} y={y - 12} textAnchor="middle" fill="#6b7280" fontSize="10">{t.total_jiwa.toLocaleString()}</text>
                          <text x={x} y="115" textAnchor="middle" fill="#9ca3af" fontSize="10">{t.tahun}</text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex-1 min-w-[280px]">
            <h4 className="text-xs text-gray-400 mb-2 text-center">Total Kepala Keluarga</h4>
            <svg viewBox="0 0 300 120" className="w-full overflow-visible">
              {(() => {
                const max = Math.max(...trend.map(t => t.total_kk), 1);
                const pts = trend.map((t, i) => `${30 + i * 120},${100 - (t.total_kk / max) * 80}`).join(' L ');
                return (
                  <>
                    <path d={`M ${pts}`} fill="none" stroke="#f59e0b" strokeWidth="3" />
                    {trend.map((t, i) => {
                      const x = 30 + i * 120;
                      const y = 100 - (t.total_kk / max) * 80;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="5" fill="#fff" stroke="#f59e0b" strokeWidth="2" />
                          <text x={x} y={y - 12} textAnchor="middle" fill="#6b7280" fontSize="10">{t.total_kk.toLocaleString()}</text>
                          <text x={x} y="115" textAnchor="middle" fill="#9ca3af" fontSize="10">{t.tahun}</text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <ClipboardList className="w-5 h-5 text-gray-400" /> Ringkasan Data per Desa
        </h3>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Desa</th>
                <th className="text-right">Jiwa (L)</th>
                <th className="text-right">Jiwa (P)</th>
                <th className="text-right">Total Jiwa</th>
                <th className="text-right">KK</th>
              </tr>
            </thead>
            <tbody>
              {rekap?.perDesaJiwa?.map((d, i) => (
                <tr key={i}>
                  <td className="text-center">{i + 1}</td>
                  <td className="col-desa">{d.nama}</td>
                  <td className="text-right">{d.jiwa_l.toLocaleString('id-ID')}</td>
                  <td className="text-right">{d.jiwa_p.toLocaleString('id-ID')}</td>
                  <td className="text-right font-semibold">{(d.jiwa_l + d.jiwa_p).toLocaleString('id-ID')}</td>
                  <td className="text-right">{d.kk.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {rekap?.perDesaJiwa && (
                <tr className="row-total">
                  <td></td>
                  <td className="col-desa">JUMLAH</td>
                  <td className="text-right">{(rekap.dataUmum?.total_jiwa_l || 0).toLocaleString('id-ID')}</td>
                  <td className="text-right">{(rekap.dataUmum?.total_jiwa_p || 0).toLocaleString('id-ID')}</td>
                  <td className="text-right">{totalJiwa.toLocaleString('id-ID')}</td>
                  <td className="text-right">{(rekap.dataUmum?.total_kk || 0).toLocaleString('id-ID')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
