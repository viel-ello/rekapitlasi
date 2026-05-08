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
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
            <Chart className="w-5 h-5 text-gray-400" /> Jumlah Jiwa per Desa
          </h3>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 700 280" className="w-full min-w-[500px]">
              {rekap?.perDesaJiwa?.map((d, i) => {
                const maxVal = Math.max(...(rekap.perDesaJiwa || []).map(x => x.jiwa_l + x.jiwa_p), 1);
                const barH = ((d.jiwa_l + d.jiwa_p) / maxVal) * 200;
                const x = 45 + i * 50;
                return (
                  <g key={i}>
                    <rect x={x} y={250 - barH} width={36} height={barH} rx={6} fill="url(#barGrad)" opacity={0.85}>
                      <animate attributeName="height" from="0" to={barH} dur="0.6s" fill="freeze" />
                      <animate attributeName="y" from="250" to={250 - barH} dur="0.6s" fill="freeze" />
                    </rect>
                    <text x={x + 18} y={265} textAnchor="middle" fill="#9ca3af" fontSize="7" transform={`rotate(-45, ${x + 18}, 265)`}>
                      {d.nama.length > 8 ? d.nama.substring(0, 8) + '..' : d.nama}
                    </text>
                    <text x={x + 18} y={245 - barH} textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="600">
                      {(d.jiwa_l + d.jiwa_p).toLocaleString()}
                    </text>
                  </g>
                );
              })}
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
            <ChartPie className="w-5 h-5 text-gray-400" /> Komposisi Jiwa (L/P)
          </h3>
          <div className="flex items-center justify-center gap-8">
            <svg viewBox="0 0 200 200" className="w-44 h-44">
              {(() => {
                const l = rekap?.dataUmum?.total_jiwa_l || 1;
                const p = rekap?.dataUmum?.total_jiwa_p || 1;
                const total = l + p;
                const lPct = l / total;
                const lAngle = lPct * 360;
                const lRad = (lAngle * Math.PI) / 180;
                const largeArc = lAngle > 180 ? 1 : 0;
                const x1 = 100 + 75 * Math.sin(lRad);
                const y1 = 100 - 75 * Math.cos(lRad);
                return (
                  <>
                    <circle cx="100" cy="100" r="75" fill="none" stroke="#f3f4f6" strokeWidth="30" />
                    <path d={`M 100 25 A 75 75 0 ${largeArc} 1 ${x1} ${y1}`} fill="none" stroke="#3b82f6" strokeWidth="30" strokeLinecap="round">
                      <animate attributeName="stroke-dasharray" from="0 472" to={`${lPct * 472} ${(1 - lPct) * 472}`} dur="0.8s" fill="freeze" />
                    </path>
                    <path d={`M ${x1} ${y1} A 75 75 0 ${1 - largeArc} 1 100 25`} fill="none" stroke="#f472b6" strokeWidth="30" strokeLinecap="round" />
                    <text x="100" y="95" textAnchor="middle" fill="#1f2937" fontSize="18" fontWeight="800">{total.toLocaleString()}</text>
                    <text x="100" y="112" textAnchor="middle" fill="#9ca3af" fontSize="9">Total Jiwa</text>
                  </>
                );
              })()}
            </svg>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm text-gray-600">Laki-laki: <strong className="text-gray-800">{(rekap?.dataUmum?.total_jiwa_l || 0).toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-pink-400" />
                <span className="text-sm text-gray-600">Perempuan: <strong className="text-gray-800">{(rekap?.dataUmum?.total_jiwa_p || 0).toLocaleString()}</strong></span>
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
