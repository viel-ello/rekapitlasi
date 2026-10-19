'use client';

import { ExclamationCircle } from 'flowbite-react-icons/outline';
import { useId } from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ConfirmModal({
  isOpen,
  title = "Konfirmasi Tindakan",
  message,
  onConfirm,
  onCancel,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  type = "danger"
}) {
  const descId = useId();

  return (
    <Dialog
      open={!!isOpen}
      onClose={onCancel}
      title={title}
      describedBy={descId}
      containerClassName="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
      panelClassName="relative z-10 glass-panel rounded-3xl w-full max-w-md p-6 overflow-hidden"
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <ExclamationCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>

        <p id={descId} className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 glass-pill text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
