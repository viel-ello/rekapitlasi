"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function ModalTransition({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with fade blur */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-md"
          />

          {/* Modal Panel with Spring Scale & Entry */}
          <motion.div
            key="modal-dialog"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-panel relative z-10 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/70"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/40">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white/40 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-700">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
