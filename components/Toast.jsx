'use client';

/**
 * @file Global Toast viewport. Render sekali di dashboard layout.
 *
 * Accessibility:
 * - role="status" untuk success/info/warning (polite)
 * - role="alert" untuk error (assertive)
 * - tombol close punya focus ring + aria-label
 */

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ExclamationCircle, InfoCircle, Close } from 'flowbite-react-icons/outline';
import { useToast } from '@/lib/useToast';

const ICON_BY_TYPE = {
  success: CheckCircle,
  error: ExclamationCircle,
  warning: ExclamationCircle,
  info: InfoCircle,
};

const CLASS_BY_TYPE = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

const ICON_COLOR_BY_TYPE = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICON_BY_TYPE[toast.type] || InfoCircle;
          const isAlert = toast.type === 'error';
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              role={isAlert ? 'alert' : 'status'}
              aria-live={isAlert ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${CLASS_BY_TYPE[toast.type] || CLASS_BY_TYPE.info}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_COLOR_BY_TYPE[toast.type] || ICON_COLOR_BY_TYPE.info}`} />
              <div className="flex-1 min-w-0 break-words">
                {toast.message}
              </div>
              {toast.dismissable && (
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
                  aria-label="Tutup notifikasi"
                >
                  <Close className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
