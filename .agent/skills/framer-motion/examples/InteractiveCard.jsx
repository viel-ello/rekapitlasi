"use client";

import { motion } from "framer-motion";

export default function InteractiveCard({ title, value, subtitle, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -4,
        boxShadow:
          "0 16px 36px -8px rgba(0, 0, 0, 0.12), inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.95)",
      }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="glass-card relative overflow-hidden rounded-2xl p-5 cursor-pointer border border-white/60 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
          {subtitle}
        </span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600 font-medium">{title}</div>
    </motion.div>
  );
}
