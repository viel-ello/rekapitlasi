'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  CheckCircle, 
  ExclamationCircle, 
  ArrowRight,
  ShieldCheck,
  CloseCircle
} from 'flowbite-react-icons/outline';
import { auditDusunListConsistency } from '@/lib/dataQuality';

export default function DataQualityAuditor({ rekap, tahun, bulan = 12 }) {
  const shouldReduceMotion = useReducedMotion();
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'error' | 'warning' | 'info'
  const [selectedDusunId, setSelectedDusunId] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Jalankan audit konsistensi lintas tabel dari perDusunMetrics rekap
  const issues = useMemo(() => {
    if (!rekap?.perDusunMetrics || !Array.isArray(rekap.perDusunMetrics)) {
      return [];
    }
    return auditDusunListConsistency(rekap.perDusunMetrics, { tahun, bulan });
  }, [rekap?.perDusunMetrics, tahun, bulan]);

  const counts = useMemo(() => {
    return {
      error: issues.filter((i) => i.severity === 'error').length,
      warning: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
      total: issues.length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchSeverity = severityFilter === 'all' || issue.severity === severityFilter;
      const matchDusun = selectedDusunId === 'all' || String(issue.dusunId) === String(selectedDusunId);
      return matchSeverity && matchDusun;
    });
  }, [issues, severityFilter, selectedDusunId]);

  const dusunList = rekap?.perDusunMetrics || [];

  return (
    <section 
      aria-label="Auditor Kualitas Data Lintas-Tabel" 
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 glass border border-white/50 dark:border-white/10 shadow-lg"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${counts.error > 0 ? 'bg-red-500/15 text-red-600 dark:text-red-400' : counts.warning > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
            {counts.total === 0 ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <ExclamationCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Auditor Kualitas Data Cerdas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
                Lintas Tabel
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Deteksi otomatis inkonsistensi relasional (KK vs Jiwa, Balita Dawis vs Pokja IV/Bumil, Bumil Risti)
            </p>
          </div>
        </div>

        {/* Counter Pills & Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {counts.total > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {counts.error > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                  {counts.error} Kritis
                </span>
              )}
              {counts.warning > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                  {counts.warning} Peringatan
                </span>
              )}
              {counts.info > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                  {counts.info} Info
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-300 transition-colors"
          >
            {isCollapsed ? 'Tampilkan' : 'Ciutkan'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="pt-4 space-y-4"
          >
            {/* Filter controls */}
            {counts.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Severity buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">Tingkat:</span>
                  {[
                    { id: 'all', label: `Semua (${counts.total})` },
                    { id: 'error', label: `Kritis (${counts.error})`, disabled: counts.error === 0 },
                    { id: 'warning', label: `Peringatan (${counts.warning})`, disabled: counts.warning === 0 },
                    { id: 'info', label: `Info (${counts.info})`, disabled: counts.info === 0 },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      disabled={btn.disabled}
                      onClick={() => setSeverityFilter(btn.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        severityFilter === btn.id
                          ? 'bg-primary-600 text-white shadow-sm'
                          : btn.disabled
                          ? 'opacity-40 cursor-not-allowed text-gray-400'
                          : 'bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Dusun selector */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="auditor-dusun-filter" className="text-gray-500 font-medium">
                    Dusun:
                  </label>
                  <select
                    id="auditor-dusun-filter"
                    value={selectedDusunId}
                    onChange={(e) => setSelectedDusunId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none"
                  >
                    <option value="all">Semua Dusun</option>
                    {dusunList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Zero issues state */}
            {counts.total === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              >
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Seluruh data 9 dusun konsisten & sinkron lintas tabel
                  </div>
                  <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    Tidak ditemukan anomali relasional antara Data Umum, Pokja IV, Rekap Dawis, dan Bumil pada periode {tahun} bulan {bulan}.
                  </div>
                </div>
              </motion.div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">
                Tidak ada temuan untuk filter yang dipilih.
              </div>
            ) : (
              /* Issue Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredIssues.map((issue) => {
                  const isError = issue.severity === 'error';
                  const isWarning = issue.severity === 'warning';
                  
                  const borderClass = isError
                    ? 'border-red-300/60 dark:border-red-800/60 bg-red-500/10 dark:bg-red-950/30'
                    : isWarning
                    ? 'border-amber-300/60 dark:border-amber-800/60 bg-amber-500/10 dark:bg-amber-950/30'
                    : 'border-blue-300/60 dark:border-blue-800/60 bg-blue-500/10 dark:bg-blue-950/30';

                  const badgeClass = isError
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                    : isWarning
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';

                  const textTone = isError
                    ? 'text-red-900 dark:text-red-200'
                    : isWarning
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-blue-900 dark:text-blue-200';

                  return (
                    <motion.div
                      key={issue.id}
                      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border backdrop-blur-md shadow-sm ${borderClass}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                              {isError ? 'Kritis' : isWarning ? 'Peringatan' : 'Info'}
                            </span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                              {issue.dusunNama}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">
                            {issue.sourceTable}
                          </span>
                        </div>

                        <h3 className={`text-xs sm:text-sm font-bold ${textTone}`}>
                          {issue.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          Tabel: <code className="text-xs font-semibold">{issue.sourceTable}</code>
                        </span>
                        <Link
                          href={issue.editHref}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        >
                          Perbaiki Data <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
