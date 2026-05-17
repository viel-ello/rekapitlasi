'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, ExclamationCircle, Pen, ChartLineUp, Clock,
} from 'flowbite-react-icons/outline';
import { useYears } from '@/lib/useYears';
import { DATA_PAGES } from '@/lib/dataPages';
import AnimatedCounter from '@/components/AnimatedCounter';
import EditModeModal from '@/components/EditModeModal';
import { timeAgo } from '@/lib/time';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const STATUS_BADGE = {
  lengkap: 'bg-green-50 text-green-700 border-green-200',
  perlu_dicek: 'bg-amber-50 text-amber-700 border-amber-200',
  belum_lengkap: 'bg-red-50 text-red-700 border-red-200',
};

const TAB_TABLES = [
  { id: 'ringkasan', label: 'Ringkasan', table: null },
  { id: 'data_umum', label: 'Data Umum', table: 'data_umum', editPath: '/dashboard/data-umum/edit' },
  { id: 'data_pokja1', label: 'Pokja I', table: 'data_pokja1', editPath: '/dashboard/pokja1/edit' },
  { id: 'data_pokja2', label: 'Pokja II', table: 'data_pokja2', editPath: '/dashboard/pokja2/edit' },
  { id: 'data_pokja3', label: 'Pokja III', table: 'data_pokja3', editPath: '/dashboard/pokja3/edit' },
  { id: 'data_pokja4', label: 'Pokja IV', table: 'data_pokja4', editPath: '/dashboard/pokja4/edit' },
  { id: 'data_rekap_dawis', label: 'Rekapitulasi Dawis', table: 'data_rekap_dawis', editPath: '/dashboard/rekap-dawis/edit' },
  { id: 'data_bumil', label: 'Bumil', table: 'data_bumil', editPath: '/dashboard/bumil/edit' },
  { id: 'validasi', label: 'Validasi', table: null },
];

function getColumnsForTable(tableName) {
  const page = Object.values(DATA_PAGES).find((p) => p.tableName === tableName);
  return page?.columns || [];
}

export default function InternalDusunDetail() {
  const params = useParams();
  const search = useSearchParams();
  const dusunId = params?.id;

  const [tahun, setTahun] = useState(Number(search.get('tahun')) || new Date().getFullYear());
  const [bulan, setBulan] = useState(Number(search.get('bulan')) || 12);
  const [tab, setTab] = useState('ringkasan');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const { years } = useYears();

  useEffect(() => {
    if (years.length > 0 && !years.includes(tahun)) setTahun(years[0]);
  }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me');
        if (r.ok) setMe(await r.json());
      } catch { /* silent */ }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const queryParams = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) });
        const res = await fetch(`/api/rekap/dusun/${dusunId}?${queryParams.toString()}`);
        if (res.ok && !cancelled) setData(await res.json());
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dusunId, tahun, bulan]);

  const canEditTable = (t) => Array.isArray(me?.permissions) && me.permissions.includes(t);
  const trend = data?.trend || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800">
            <ArrowLeft className="w-3 h-3" /> Kembali ke Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mt-1 truncate">
            {data?.dusun?.nama || (loading ? 'Memuat...' : 'Dusun')}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {data?.statusLabel && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[data.status]}`}>
                {data.status === 'lengkap' ? <CheckCircle className="w-3 h-3" /> : <ExclamationCircle className="w-3 h-3" />}
                {data.statusLabel}
              </span>
            )}
            <span className="text-xs text-gray-500">Periode {tahun} · {MONTHS[bulan - 1]}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
            aria-label="Pilih tahun"
          >
            {(years.length > 0 ? years : [tahun]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
            aria-label="Pilih bulan"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs — horizontal scroll di mobile */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex gap-1 px-2 py-2 min-w-max">
            {TAB_TABLES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  tab === t.id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Memuat...</div>
      ) : !data ? (
        <div className="bg-white rounded-2xl border border-red-100 p-6 text-center text-sm text-red-600">
          Gagal memuat data dusun.
        </div>
      ) : (
        <>
          {tab === 'ringkasan' && <Ringkasan data={data} trend={trend} />}
          {TAB_TABLES.filter((t) => t.table).map((t) => (
            tab === t.id && (
              <PerTablePanel
                key={t.id}
                tableName={t.table}
                tableData={data.tables[t.table]}
                tableStatus={data.tableStatuses[t.table]}
                editPath={t.editPath}
                canEdit={canEditTable(t.table)}
              />
            )
          ))}
          {tab === 'validasi' && <ValidasiPanel data={data} />}
        </>
      )}

      {/* Last activity */}
      {!loading && data?.lastActivity?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" /> Aktivitas Terkait Dusun Ini
          </h3>
          <div className="space-y-2">
            {data.lastActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0 text-sm">
                  <div className="text-gray-800"><span className="font-medium">{a.username}</span> · {a.action}</div>
                  {a.detail && <div className="text-xs text-gray-500 truncate">{a.detail}</div>}
                  <div className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Ringkasan({ data, trend }) {
  const u = data.tables?.data_umum || {};
  const p4 = data.tables?.data_pokja4 || {};
  const bumil = data.tables?.data_bumil || {};
  const issues = data.issueTotal || { errors: 0, warnings: 0, infos: 0 };

  const kpi = [
    { label: 'Total KK', value: Number(u.jml_kk || 0) },
    { label: 'Total Jiwa', value: Number(u.jml_jiwa_l || 0) + Number(u.jml_jiwa_p || 0) },
    { label: 'Posyandu', value: Number(p4.posyandu_jumlah || 0) },
    { label: 'Ibu Hamil', value: Number(bumil.ibu_hamil || 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpi.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-800"><AnimatedCounter value={k.value} /></div>
            <div className="text-xs text-gray-600 truncate">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Status per tabel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Status Per Tabel</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(data.tableStatuses || {}).map(([t, s]) => (
            <div key={t} className="rounded-lg border border-gray-100 p-2.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-700 truncate">{t}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                s.status === 'lengkap' ? 'bg-green-50 text-green-700' :
                s.status === 'perlu_dicek' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ChartLineUp className="w-4 h-4 text-primary-600" /> Tren 5 Tahun
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <MiniTrend rows={trend} field="total_jiwa" label="Total Jiwa" color="#059669" />
          <MiniTrend rows={trend} field="total_kk" label="Total KK" color="#3B82F6" />
          <MiniTrend rows={trend} field="total_posyandu" label="Posyandu" color="#F59E0B" />
          <MiniTrend rows={trend} field="total_dasa_wisma" label="Dasa Wisma" color="#10b981" />
        </div>
      </div>

      {/* Issue summary */}
      {(issues.errors > 0 || issues.warnings > 0) && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
          <ExclamationCircle className="w-4 h-4" />
          Total {issues.errors + issues.warnings} masalah validasi ditemukan ({issues.errors} error, {issues.warnings} warning).
        </div>
      )}
    </div>
  );
}

function PerTablePanel({ tableName, tableData, tableStatus, editPath, canEdit }) {
  const cols = getColumnsForTable(tableName);
  const [modeOpen, setModeOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">{tableName}</h3>
          {tableStatus && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              tableStatus.status === 'lengkap' ? 'bg-green-50 text-green-700' :
              tableStatus.status === 'perlu_dicek' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {tableStatus.label}
            </span>
          )}
        </div>
        {canEdit && editPath && (
          <button
            type="button"
            onClick={() => setModeOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg"
          >
            <Pen className="w-3 h-3" /> Edit Data
          </button>
        )}
      </div>
      <EditModeModal open={modeOpen} onClose={() => setModeOpen(false)} editPath={editPath} />
      {!tableData ? (
        <div className="text-xs text-gray-400 py-4 text-center">Belum ada data untuk periode ini.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {cols.map((c) => (
            <div key={c.key} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="text-base font-bold text-gray-800">{Number(tableData[c.key] || 0).toLocaleString('id-ID')}</div>
              <div className="text-[11px] text-gray-500 truncate" title={c.label}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValidasiPanel({ data }) {
  const grouped = data.validation || {};
  const tables = Object.keys(grouped);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Detail Validasi</h3>
      {tables.length === 0 ? (
        <div className="text-sm text-gray-400">Belum ada data untuk divalidasi.</div>
      ) : (
        <div className="space-y-4">
          {tables.map((t) => {
            const v = grouped[t] || {};
            const issues = Object.entries(v).filter(([, val]) => val.severity === 'error' || val.severity === 'warning');
            return (
              <div key={t}>
                <div className="text-xs font-bold text-gray-700 mb-2">{t} <span className="text-gray-400 font-normal">({issues.length} masalah)</span></div>
                {issues.length === 0 ? (
                  <div className="text-xs text-gray-400">Tidak ada masalah validasi.</div>
                ) : (
                  <div className="space-y-1.5">
                    {issues.map(([k, val]) => (
                      <div key={k} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                        val.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                      }`}>
                        <ExclamationCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold font-mono">{k}</div>
                          <div>{val.warning}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniTrend({ rows, field, label, color }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 p-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">{label}</div>
        <div className="h-20 flex items-center justify-center text-xs text-gray-400">—</div>
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => Number(r[field] || 0)), 1);
  const last = Number(rows[rows.length - 1]?.[field] || 0);
  const padX = 28, padY = 22, width = 280, height = 100;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = rows.length > 1 ? innerW / (rows.length - 1) : 0;
  const points = rows.map((r, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (Number(r[field] || 0) / max) * innerH;
    return `${x},${y}`;
  }).join(' L ');

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-xs font-semibold text-gray-600">{label}</div>
        <div className="text-base font-bold text-gray-800">{last.toLocaleString('id-ID')}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-20">
        <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {rows.map((r, i) => {
          const x = padX + i * stepX;
          const y = padY + innerH - (Number(r[field] || 0) / max) * innerH;
          return <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke={color} strokeWidth="2" />;
        })}
        {rows.map((r, i) => {
          const x = padX + i * stepX;
          const anchor = i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle';
          return <text key={`y-${i}`} x={x} y={height - 4} textAnchor={anchor} fontSize="10" fill="#6b7280">{r.tahun}</text>;
        })}
      </svg>
    </div>
  );
}
