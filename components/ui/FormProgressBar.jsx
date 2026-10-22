'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'flowbite-react-icons/outline';
import { cn } from '@/lib/utils';

/**
 * FormProgressBar — Indikator progres form bertahap (Typeform style)
 * Menggunakan gaya VisionOS Translucent Liquid Glass (.glass-pill).
 *
 * Props:
 *   - steps: Array<{ id: string, title: string, description?: string }>
 *   - currentStep: number (0-indexed)
 *   - onStepClick?: (stepIndex: number) => void (hanya untuk step yang sudah dilewati)
 *   - className?: string
 */
export default function FormProgressBar({
  steps = [],
  currentStep = 0,
  onStepClick,
  className = '',
}) {
  if (!steps.length) return null;

  const totalSteps = steps.length;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Top Header: Step Counter & Overall Progress Bar */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill text-primary-800 dark:text-primary-300 font-bold">
          Langkah {currentStep + 1} dari {totalSteps}
        </span>
        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
          {progressPercent}% Selesai
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/40 dark:bg-black/30 border border-white/60 dark:border-white/10 shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-400 rounded-full shadow-sm"
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Stepped Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStep;
          const isCompleted = idx < currentStep;
          const isClickable = onStepClick && idx <= currentStep;

          return (
            <button
              key={step.id || idx}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(idx)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200',
                isCurrent && 'text-white font-semibold',
                isCompleted &&
                  'glass-pill text-emerald-800 dark:text-emerald-300 hover:bg-white/70 dark:hover:bg-white/10 cursor-pointer',
                !isCurrent &&
                  !isCompleted &&
                  'opacity-60 text-gray-500 dark:text-gray-400 cursor-not-allowed bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/5'
              )}
              title={step.title}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCurrent && (
                <motion.div
                  layoutId="formProgressActivePill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-primary-600 rounded-full shadow-md ring-2 ring-primary-300/60 dark:ring-primary-500/40 -z-10"
                />
              )}
              <span
                className={cn(
                  'relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  isCurrent && 'bg-white text-primary-700 shadow-sm',
                  isCompleted && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                  !isCurrent && !isCompleted && 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                )}
              >
                {isCompleted ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : idx + 1}
              </span>
              <span className="relative z-10 truncate max-w-[120px] sm:max-w-[160px]">{step.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
