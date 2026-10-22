'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  FloppyDisk,
  Close,
  CheckCircle,
  ExclamationCircle,
} from 'flowbite-react-icons/outline';
import FormProgressBar from './FormProgressBar';
import FormReviewStep from './FormReviewStep';
import InlineFieldError from './InlineFieldError';
import { cn } from '@/lib/utils';

const EMPTY_DATA = {};

/**
 * SteppedForm — Master Wizard Form Container (Typeform pattern).
 *
 * Mengelompokkan formulir panjang ke dalam langkah-langkah logis,
 * dilengkapi indikator progres, validasi per-field, dan tinjauan akhir.
 *
 * Props:
 *   - isOpen: boolean
 *   - onClose: () => void
 *   - title: string
 *   - subtitle?: string
 *   - steps: Array<{
 *       id: string,
 *       title: string,
 *       description?: string,
 *       fields: Array<{
 *         key: string,
 *         label: string,
 *         type?: string,
 *         hint?: string,
 *         unit?: string,
 *         placeholder?: string,
 *         required?: boolean,
 *         min?: number,
 *         max?: number
 *       }>
 *     }>
 *   - initialData?: Record<string, any>
 *   - validation?: Record<string, { valid: boolean, severity?: string, warning?: string }>
 *   - onSave: (formData: Record<string, any>) => Promise<void> | void
 *   - isSaving?: boolean
 *   - dusunName?: string
 *   - tahun?: number
 *   - bulanName?: string
 */
export default function SteppedForm({
  isOpen = true,
  onClose,
  title,
  subtitle,
  steps = [],
  initialData = EMPTY_DATA,
  validation = {},
  onSave,
  isSaving = false,
  dusunName,
  tahun,
  bulanName,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({ ...initialData });
  const [localValidation, setLocalValidation] = useState({});
  const shouldReduceMotion = useReducedMotion();
  const prevOpenRef = useRef(isOpen);

  // Sinkronisasi data awal saat modal dibuka atau initialData berganti
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setFormData({ ...initialData });
      setCurrentStep(0);
      setDirection(1);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialData]);

  // Directional slide variants for step transitions
  const slideVariants = useMemo(
    () => ({
      enter: (dir) => ({
        x: shouldReduceMotion ? 0 : dir > 0 ? 32 : -32,
        opacity: 0,
      }),
      center: {
        x: 0,
        opacity: 1,
        transition: {
          x: { type: 'spring', stiffness: 350, damping: 28 },
          opacity: { duration: 0.2 },
        },
      },
      exit: (dir) => ({
        x: shouldReduceMotion ? 0 : dir > 0 ? -32 : 32,
        opacity: 0,
        transition: {
          x: { type: 'spring', stiffness: 350, damping: 28 },
          opacity: { duration: 0.15 },
        },
      }),
    }),
    [shouldReduceMotion]
  );

  // Gabungkan semua langkah definisi + 1 langkah Tinjauan Akhir
  const allSteps = useMemo(() => {
    return [
      ...steps,
      {
        id: 'review-step',
        title: 'Ringkasan & Verifikasi',
        description: 'Tinjau kembali seluruh isian data sebelum disimpan ke sistem.',
        isReview: true,
      },
    ];
  }, [steps]);

  const totalSteps = allSteps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const currentStepDef = allSteps[currentStep] || {};

  // Handler ubah nilai input
  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Bersihkan error lokal jika user sudah mengisi
    if (localValidation[key]) {
      setLocalValidation((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Navigasi Langkah
  const handleNext = () => {
    // Validasi field required pada step saat ini sebelum lanjut
    if (!currentStepDef.isReview && currentStepDef.fields) {
      const stepErrors = {};
      currentStepDef.fields.forEach((f) => {
        if (f.required) {
          const val = formData[f.key];
          if (val === undefined || val === null || String(val).trim() === '') {
            stepErrors[f.key] = `${f.label} wajib diisi`;
          }
        }
      });

      if (Object.keys(stepErrors).length > 0) {
        setLocalValidation(stepErrors);
        return;
      }
    }

    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  };

  const handleJumpToStep = (stepIdx) => {
    if (stepIdx >= 0 && stepIdx < totalSteps) {
      setDirection(stepIdx > currentStep ? 1 : -1);
      setCurrentStep(stepIdx);
    }
  };

  // Submit akhir
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (onSave) {
      await onSave(formData);
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowRight' && e.altKey) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        handlePrev();
      }
    },
    [isOpen, onClose, currentStep, totalSteps]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Siapkan data review untuk langkah terakhir
  const reviewGroups = steps.map((s, idx) => ({
    stepIndex: idx,
    title: s.title,
    fields: (s.fields || []).map((f) => ({
      key: f.key,
      label: f.label,
      value: formData[f.key],
      unit: f.unit,
    })),
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="stepped-form-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          {/* Backdrop Kaca Gelap Frosted */}
          <motion.div
            key="stepped-form-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-md transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Kontainer Modal VisionOS Glass Panel */}
          <motion.div
            key="stepped-form-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stepped-form-title"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/80 dark:border-white/20 z-10"
          >
            {/* Header Modal */}
            <div className="glass-header px-5 sm:px-8 py-4 flex items-center justify-between border-b border-white/60 dark:border-white/10 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-pulse" />
                  <h2 id="stepped-form-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                    {title}
                  </h2>
                </div>
                {subtitle && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {subtitle}
                    {dusunName && ` • Dusun ${dusunName}`}
                    {tahun && ` • Tahun ${tahun}`}
                    {bulanName && ` • Bulan ${bulanName}`}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full glass-pill hover:bg-white/80 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Tutup formulir"
              >
                <Close className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar Area */}
            <div className="px-5 sm:px-8 pt-4 pb-2 border-b border-white/40 dark:border-white/10 flex-shrink-0 bg-white/15 dark:bg-black/10">
              <FormProgressBar
                steps={allSteps}
                currentStep={currentStep}
                onStepClick={handleJumpToStep}
              />
            </div>

            {/* Konten Langkah (Scrollable Body) dengan Directional Slide */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-6 relative overflow-x-hidden">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full"
                >
                  {currentStepDef.isReview ? (
                    /* Langkah Terakhir: Tinjauan Ulang */
                    <FormReviewStep
                      groups={reviewGroups}
                      onEditStep={handleJumpToStep}
                      summaryMeta={{ dusunName, tahun, bulanName }}
                      validation={validation}
                    />
                  ) : (
                    /* Langkah Input Biasa */
                    <div className="space-y-6">
                      {/* Judul & Deskripsi Langkah */}
                      <div className="pb-3 border-b border-gray-100 dark:border-white/10">
                        <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wide">
                          Bagian {currentStep + 1}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                          {currentStepDef.title}
                        </h3>
                        {currentStepDef.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {currentStepDef.description}
                          </p>
                        )}
                      </div>

                      {/* Grid Input Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                        {(currentStepDef.fields || []).map((field) => {
                          const val = formData[field.key] ?? '';
                          const err = localValidation[field.key];
                          const warn = validation[field.key]?.warning;
                          const isTextarea = field.type === 'text' || field.type === 'textarea';

                          return (
                            <div
                              key={field.key}
                              className={cn(
                                'flex flex-col',
                                isTextarea ? 'sm:col-span-2 md:col-span-3' : ''
                              )}
                            >
                              <label
                                htmlFor={`field-${field.key}`}
                                className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5 flex items-center justify-between"
                              >
                                <span className="truncate" title={field.label}>
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                                {field.unit && (
                                  <span className="text-[10px] text-gray-600 dark:text-gray-400 font-normal">
                                    ({field.unit})
                                  </span>
                                )}
                              </label>

                              {isTextarea ? (
                                <textarea
                                  id={`field-${field.key}`}
                                  rows={3}
                                  value={val}
                                  onChange={(e) => handleChange(field.key, e.target.value)}
                                  placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                                  className={cn(
                                    'glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none transition-all resize-none',
                                    err && 'border-red-400 ring-2 ring-red-300/40'
                                  )}
                                />
                              ) : (
                                <input
                                  id={`field-${field.key}`}
                                  type="text"
                                  inputMode="decimal"
                                  value={val}
                                  onChange={(e) => handleChange(field.key, e.target.value)}
                                  placeholder={field.placeholder || '0'}
                                  className={cn(
                                    'glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none transition-all font-semibold',
                                    err && 'border-red-400 ring-2 ring-red-300/40'
                                  )}
                                />
                              )}

                              {/* Validasi & Helper Inline */}
                              <InlineFieldError
                                error={err}
                                warning={warn}
                                hint={field.hint}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Navigasi Langkah */}
            <div className="glass-header px-5 sm:px-8 py-3.5 flex items-center justify-between border-t border-white/60 dark:border-white/10 flex-shrink-0 bg-white/20 dark:bg-black/20">
              <div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-full glass-pill text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Batal
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-pill text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-white/20 transition-colors shadow-sm"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                  </button>
                )}

                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Lanjut <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <FloppyDisk className="w-3.5 h-3.5" /> Simpan Data
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
