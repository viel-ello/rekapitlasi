'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, FileLines, Close } from 'flowbite-react-icons/outline';

const STORAGE_KEY = 'pkk_edit_mode_default';

/**
 * Modal pemilih mode edit data.
 *
 * Dua pilihan:
 *   - Mode Excel: tabel rapat, input angka padat (default historis)
 *   - Mode Word: tabel auto-stretch, textarea bisa terima kalimat panjang
 *
 * Pilihan terakhir disimpan di localStorage sebagai default berikutnya.
 *
 * Usage:
 *   <EditModeModal open={open} onClose={...} editPath="/dashboard/pokja1/edit" />
 */
export default function EditModeModal({ open, onClose, editPath }) {
  const router = useRouter();
  const [defaultMode, setDefaultMode] = useState('excel');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'word' || saved === 'excel') setDefaultMode(saved);
  }, []);

  const go = (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    onClose?.();
    router.push(`${editPath}?mode=${mode}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-mode-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Tutup"
            >
              <Close className="w-5 h-5" />
            </button>

            <div className="px-6 pt-6 pb-3">
              <h2 id="edit-mode-modal-title" className="text-xl font-bold text-gray-900">
                Pilih Mode Edit Data
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Pilih tampilan input yang sesuai dengan data yang akan kamu isi.
              </p>
            </div>

            <div className="px-6 pb-6 grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => go('excel')}
                className={`group relative text-left p-5 rounded-xl border-2 transition-all hover:shadow-lg ${
                  defaultMode === 'excel'
                    ? 'border-primary-500 bg-primary-50/30'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                {defaultMode === 'excel' && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-primary-600 text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    Terakhir dipakai
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-700">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Mode Excel</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Tabel padat seperti spreadsheet. Cocok untuk input rutin angka harian.
                </p>
                <ul className="space-y-1 text-xs text-gray-500">
                  <li>• Kolom rapat, scroll horizontal</li>
                  <li>• Input numpad-friendly (inputMode decimal)</li>
                  <li>• Total per kolom otomatis di footer</li>
                  <li>• Cepat untuk pengisian banyak angka</li>
                </ul>
              </button>

              <button
                onClick={() => go('word')}
                className={`group relative text-left p-5 rounded-xl border-2 transition-all hover:shadow-lg ${
                  defaultMode === 'word'
                    ? 'border-primary-500 bg-primary-50/30'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                {defaultMode === 'word' && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-primary-600 text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    Terakhir dipakai
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <FileLines className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Mode Word</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Tabel auto-stretch. Kolom melebar mengikuti panjang kalimat.
                </p>
                <ul className="space-y-1 text-xs text-gray-500">
                  <li>• Cell auto-grow vertikal mengikuti teks</li>
                  <li>• Bisa isi kalimat / catatan, bukan cuma angka</li>
                  <li>• Kolom melebar otomatis (table-layout: auto)</li>
                  <li>• Cocok untuk catatan kasus khusus</li>
                </ul>
              </button>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
              Tip: pilihan ini bisa diubah lagi nanti dari tombol di pojok kanan atas tabel.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
