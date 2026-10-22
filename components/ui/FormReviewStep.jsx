'use client';

import React from 'react';
import { Pen, CheckCircle, ExclamationCircle } from 'flowbite-react-icons/outline';
import { cn } from '@/lib/utils';

/**
 * FormReviewStep — Ringkasan data sebelum simpan (Typeform review pattern).
 * Memberikan kepastian bagi kader/operator sebelum submit ke server.
 *
 * Props:
 *   - groups: Array<{ stepIndex: number, title: string, fields: Array<{ key: string, label: string, value: any, unit?: string }> }>
 *   - onEditStep: (stepIndex: number) => void
 *   - summaryMeta?: { dusunName: string, tahun: number, bulanName?: string }
 *   - validation?: Record<string, { valid: boolean, severity?: string, warning?: string }>
 *   - className?: string
 */
export default function FormReviewStep({
  groups = [],
  onEditStep,
  summaryMeta,
  validation = {},
  className = '',
}) {
  // Hitung total terisi
  let totalFields = 0;
  let filledFields = 0;
  let issueCount = 0;

  groups.forEach((g) => {
    (g.fields || []).forEach((f) => {
      totalFields++;
      const val = f.value;
      if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0') {
        filledFields++;
      }
      if (validation[f.key] && !validation[f.key].valid) {
        issueCount++;
      }
    });
  });

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Ringkasan */}
      <div className="glass-panel rounded-2xl p-5 border border-white/70 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full glass-pill text-primary-800 dark:text-primary-300 text-xs font-semibold mb-1.5">
              Tinjauan Akhir Sebelum Simpan
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {summaryMeta?.dusunName ? `Dusun ${summaryMeta.dusunName}` : 'Data Dusun'}
              {summaryMeta?.tahun && ` • Tahun ${summaryMeta.tahun}`}
              {summaryMeta?.bulanName && ` • Bulan ${summaryMeta.bulanName}`}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Periksa kembali seluruh isian formulir di bawah ini. Anda dapat mengklik tombol Ubah untuk memperbaiki bagian tertentu.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl glass-pill text-center min-w-[90px]">
              <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {filledFields} / {totalFields}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Kolom Terisi</div>
            </div>

            {issueCount > 0 ? (
              <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center min-w-[90px]">
                <div className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
                  <ExclamationCircle className="w-4 h-4 text-amber-600" />
                  {issueCount}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400">Perhatian</div>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center min-w-[90px]">
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Valid
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Siap Simpan</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Bagian / Step Cards */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.title}
            className="glass rounded-2xl p-4 sm:p-5 border border-white/60 dark:border-white/10 hover:shadow-card transition-shadow"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full glass-pill text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center">
                  {group.stepIndex + 1}
                </span>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {group.title}
                </h4>
              </div>

              {onEditStep && (
                <button
                  type="button"
                  onClick={() => onEditStep(group.stepIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill text-xs font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
                  aria-label={`Ubah bagian ${group.title}`}
                >
                  <Pen className="w-3.5 h-3.5" /> Ubah
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(group.fields || []).map((field) => {
                const val = field.value;
                const isFilled = val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0';
                const issue = validation[field.key];
                const hasIssue = issue && !issue.valid;

                return (
                  <div
                    key={field.key}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all text-left',
                      hasIssue
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        : isFilled
                        ? 'bg-white/40 dark:bg-black/20 border-white/60 dark:border-white/10'
                        : 'bg-gray-50/40 dark:bg-black/10 border-gray-100 dark:border-white/5 opacity-70'
                    )}
                  >
                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate mb-1" title={field.label}>
                      {field.label}
                    </div>
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                      {isFilled ? (
                        <span>
                          {String(val)}
                          {field.unit && <span className="text-[10px] font-normal text-gray-500 ml-1">{field.unit}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 font-normal italic text-xs">0</span>
                      )}
                    </div>
                    {hasIssue && (
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 line-clamp-1" title={issue.warning}>
                        ⚠️ {issue.warning}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
