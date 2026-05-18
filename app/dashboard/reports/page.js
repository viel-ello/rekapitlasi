'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChartPie, Download, FileLines, ArrowRight, ArrowLeft, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { DATA_PAGES } from '@/lib/dataPages';
import { useYears } from '@/lib/useYears';
import { applyColumnOverrides } from '@/lib/columnOverrides';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const TABLE_OPTIONS = Object.values(DATA_PAGES).map((p) => ({
  value: p.tableName,
  label: p.title,
  hasMonth: Boolean(p.hasMonth),
  columns: p.columns,
}));

const PRESET_KEY = 'report-builder-preset';

export default function ReportsPage() {
  const { years } = useYears();
  const currentYear = new Date().getFullYear();

  const [step, setStep] = useState(1);
  const [tables, setTables] = useState([]);
  const [tahunFrom, setTahunFrom] = useState(currentYear);
  const [tahunTo, setTahunTo] = useState(currentYear);
  const [bulan, setBulan] = useState(12);
  const [desaList, setDesaList] = useState([]);
  const [desaIds, setDesaIds] = useState([]);
  const [columns, setColumns] = useState({}); // { [tableName]: [keys] }
  const [overridesByTable, setOverridesByTable] = useState({});

  const [building, setBuilding] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Load preset & desa list
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p.tables)) setTables(p.tables);
        if (p.tahunFrom) setTahunFrom(p.tahunFrom);
        if (p.tahunTo) setTahunTo(p.tahunTo);
        if (p.bulan) setBulan(p.bulan);
        if (Array.isArray(p.desaIds)) setDesaIds(p.desaIds);
        if (p.columns) setColumns(p.columns);
      }
    } catch { /* silent */ }

    (async () => {
      try {
        const res = await fetch('/api/dusun');
        if (res.ok) setDesaList(await res.json());
      } catch { /* silent */ }
    })();
  }, []);

  // Auto-pick tahun dari list aktif
  useEffect(() => {
    if (years.length > 0) {
      if (!years.includes(tahunFrom)) setTahunFrom(years[years.length - 1]);
      if (!years.includes(tahunTo)) setTahunTo(years[0]);
    }
  }, [years]);

  // Load overrides untuk tabel terpilih
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = {};
      for (const t of tables) {
        try {
          const res = await fetch(`/api/admin/column-overrides?table_name=${t}`);
          if (res.ok) map[t] = await res.json();
        } catch { /* silent */ }
      }
      if (!cancelled) setOverridesByTable(map);
    })();
    return () => { cancelled = true; };
  }, [tables.join(',')]);

  const savePreset = () => {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify({ tables, tahunFrom, tahunTo, bulan, desaIds, columns }));
    } catch { /* silent */ }
  };

  // Effective columns per tabel berdasarkan override
  const effectiveCols = useMemo(() => {
    const out = {};
    for (const t of tables) {
      const meta = TABLE_OPTIONS.find((o) => o.value === t);
      if (!meta) continue;
      out[t] = applyColumnOverrides(meta.columns, overridesByTable[t]).filter((c) => !c.hidden);
    }
    return out;
  }, [tables, overridesByTable]);

  // Default-select all kolom saat tabel diaktifkan pertama kali
  useEffect(() => {
    setColumns((prev) => {
      const next = { ...prev };
      for (const t of tables) {
        if (!next[t]) next[t] = (effectiveCols[t] || []).map((c) => c.key);
      }
      // Hapus tabel yang tidak dipilih lagi
      for (const k of Object.keys(next)) {
        if (!tables.includes(k)) delete next[k];
      }
      return next;
    });
  }, [tables.join(','), JSON.stringify(effectiveCols)]);

  const config = useMemo(() => ({
    tables, tahunFrom, tahunTo, bulan, desaIds, columns,
  }), [tables, tahunFrom, tahunTo, bulan, desaIds, columns]);

  const canGoNext = step === 1 ? tables.length > 0
    : step === 2 ? (Number(tahunFrom) <= Number(tahunTo))
    : step === 3 ? true
    : true;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  // Preview di step 4
  useEffect(() => {
    if (step !== 4) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    (async () => {
      try {
        const res = await fetch('/api/reports/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, format: 'excel', preview: true }),
        });
        if (!res.ok) {
          if (!cancelled) setPreviewError('Gagal memuat preview');
        } else {
          // Excel buffer tidak bisa di-preview di browser. Untuk preview cepat, kita ambil sampel via /api/dusun untuk hitung row count saja.
          // Skip preview cepat — tampilkan jumlah dusun & tahun
        }
      } catch {
        if (!cancelled) setPreviewError('Gagal menghubungi server');
      }
      if (!cancelled) setPreviewLoading(false);
    })();
    return () => { cancelled = true; };
  }, [step, JSON.stringify(config)]);

  const buildAndDownload = async (format) => {
    setBuilding(true);
    try {
      const res = await fetch('/api/reports/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal membangun laporan');
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'excel' ? 'xlsx' : format === 'word' ? 'docx' : 'pdf';
        a.download = `Laporan_Custom_${new Date().toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        savePreset();
      }
    } catch {
      alert('Gagal menghubungi server');
    }
    setBuilding(false);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ChartPie className="w-7 h-7 text-primary-600" /> Report Builder
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Bangun laporan custom: pilih tabel, periode, dusun, dan kolom — lalu unduh sebagai Excel, Word, atau PDF.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['Tabel', 'Periode', 'Dusun & Kolom', 'Pratinjau'].map((label, idx) => {
          const n = idx + 1;
          const active = step === n;
          const done = step > n;
          return (
            <button
              key={label}
              onClick={() => (n < step) && setStep(n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                active ? 'bg-primary-600 text-white' :
                done ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' :
                'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${active ? 'bg-white/20' : done ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {done ? <CheckCircle className="w-3 h-3" /> : n}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 min-h-[300px]">
        {step === 1 && <Step1Tables tables={tables} setTables={setTables} />}
        {step === 2 && <Step2Period tahunFrom={tahunFrom} setTahunFrom={setTahunFrom} tahunTo={tahunTo} setTahunTo={setTahunTo} years={years} bulan={bulan} setBulan={setBulan} hasMonth={tables.includes('data_bumil')} />}
        {step === 3 && <Step3DesaCols desaList={desaList} desaIds={desaIds} setDesaIds={setDesaIds} tables={tables} effectiveCols={effectiveCols} columns={columns} setColumns={setColumns} />}
        {step === 4 && <Step4Preview config={config} desaList={desaList} effectiveCols={effectiveCols} previewLoading={previewLoading} previewError={previewError} />}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={back}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {step < 4 ? (
          <button
            onClick={next}
            disabled={!canGoNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl"
          >
            Selanjutnya <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => buildAndDownload('excel')} disabled={building} className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {building ? '...' : <><Download className="w-4 h-4" /> Excel</>}
            </button>
            <button onClick={() => buildAndDownload('word')} disabled={building} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {building ? '...' : <><FileLines className="w-4 h-4" /> Word</>}
            </button>
            <button onClick={() => buildAndDownload('pdf')} disabled={building} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {building ? '...' : <><Download className="w-4 h-4" /> PDF</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 1 ───────────────────────────────────────────────────────────────────
function Step1Tables({ tables, setTables }) {
  const toggle = (v) => setTables((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  return (
    <>
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Pilih tabel</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {TABLE_OPTIONS.map((t) => (
          <label key={t.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            tables.includes(t.value) ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}>
            <input type="checkbox" className="mt-0.5" checked={tables.includes(t.value)} onChange={() => toggle(t.value)} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{t.label}</div>
              <div className="text-xs text-gray-500 truncate">{t.value}</div>
            </div>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">Pilih satu atau lebih tabel. Kolom dan periode diatur di langkah berikut.</p>
    </>
  );
}

// ── Step 2 ───────────────────────────────────────────────────────────────────
function Step2Period({ tahunFrom, setTahunFrom, tahunTo, setTahunTo, years, bulan, setBulan, hasMonth }) {
  const yearOptions = years && years.length > 0 ? [...years].sort((a, b) => a - b) : [new Date().getFullYear()];
  return (
    <>
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Pilih periode</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tahun awal</label>
          <select value={tahunFrom} onChange={(e) => setTahunFrom(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tahun akhir</label>
          <select value={tahunTo} onChange={(e) => setTahunTo(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {hasMonth && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Bulan (untuk Data Bumil)</label>
            <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
      </div>
      {tahunTo < tahunFrom && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <ExclamationCircle className="w-4 h-4" /> Tahun akhir harus lebih besar atau sama dengan tahun awal.
        </div>
      )}
    </>
  );
}

// ── Step 3 ───────────────────────────────────────────────────────────────────
function Step3DesaCols({ desaList, desaIds, setDesaIds, tables, effectiveCols, columns, setColumns }) {
  const allDesa = desaList.filter((d) => d.is_active === 1 || d.is_active === true);
  const toggleDesa = (id) => setDesaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAllDesa = () => setDesaIds(desaIds.length === allDesa.length ? [] : allDesa.map((d) => d.id));

  const toggleCol = (tableName, key) => {
    setColumns((prev) => {
      const cur = prev[tableName] || [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { ...prev, [tableName]: next };
    });
  };
  const toggleAllCols = (tableName) => {
    const allKeys = (effectiveCols[tableName] || []).map((c) => c.key);
    const cur = columns[tableName] || [];
    const next = cur.length === allKeys.length ? [] : allKeys;
    setColumns({ ...columns, [tableName]: next });
  };

  return (
    <>
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Pilih dusun</h2>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">{desaIds.length === 0 ? 'Semua dusun aktif' : `${desaIds.length} dusun terpilih`}</span>
          <button onClick={toggleAllDesa} className="text-xs font-semibold text-primary-700 hover:text-primary-800">
            {desaIds.length === allDesa.length ? 'Kosongkan' : 'Pilih semua'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
          {allDesa.map((d) => (
            <label key={d.id} className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
              <input type="checkbox" checked={desaIds.length === 0 || desaIds.includes(d.id)} onChange={() => toggleDesa(d.id)} />
              <span className="text-xs text-gray-700 truncate">{d.nama}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Tip: kosongkan semua untuk menyertakan semua dusun aktif.</p>
      </div>

      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Pilih kolom per tabel</h2>
      <div className="space-y-3">
        {tables.map((t) => {
          const cols = effectiveCols[t] || [];
          const selected = columns[t] || [];
          return (
            <div key={t} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-800">{t} <span className="text-xs text-gray-400">({selected.length}/{cols.length})</span></div>
                <button onClick={() => toggleAllCols(t)} className="text-xs font-semibold text-primary-700 hover:text-primary-800">
                  {selected.length === cols.length ? 'Kosongkan' : 'Pilih semua'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {cols.map((c) => (
                  <label key={c.key} className="inline-flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white cursor-pointer">
                    <input type="checkbox" checked={selected.includes(c.key)} onChange={() => toggleCol(t, c.key)} />
                    <span className="text-xs text-gray-700 truncate" title={c.label}>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Step 4 ───────────────────────────────────────────────────────────────────
function Step4Preview({ config, desaList, effectiveCols, previewLoading, previewError }) {
  const tableTitles = config.tables.map((t) => TABLE_OPTIONS.find((o) => o.value === t)?.label || t);
  const desaCount = config.desaIds.length === 0 ? desaList.filter((d) => d.is_active).length : config.desaIds.length;
  const totalCols = config.tables.reduce((s, t) => s + (config.columns[t]?.length || 0), 0);

  return (
    <>
      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Pratinjau konfigurasi</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Tabel" value={tableTitles.join(', ') || '-'} />
        <Field label="Periode" value={`${config.tahunFrom} – ${config.tahunTo}${config.tables.includes('data_bumil') ? ` · Bulan ${config.bulan}` : ''}`} />
        <Field label="Dusun" value={desaCount > 0 ? `${desaCount} dusun` : 'Semua dusun aktif'} />
        <Field label="Total kolom" value={`${totalCols} kolom`} />
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
        <div className="text-xs font-semibold text-gray-600 mb-2">Detail kolom per tabel</div>
        <div className="space-y-2">
          {config.tables.map((t) => (
            <div key={t} className="text-xs">
              <span className="font-mono font-semibold text-gray-700">{t}</span>
              <span className="text-gray-500"> · {config.columns[t]?.length || 0} kolom</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <ExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          Konfigurasi ini akan disimpan di browser Anda untuk dipakai lagi nanti. Klik tombol unduh di bawah untuk membangun & mengunduh file laporan.
        </div>
      </div>
    </>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 px-3 py-2">
      <div className="text-[11px] font-semibold text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-800 break-words">{value}</div>
    </div>
  );
}
