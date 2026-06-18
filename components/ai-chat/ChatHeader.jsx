'use client';

/**
 * ChatHeader — header panel chat PKK Assistant.
 */
export default function ChatHeader({ onClose }) {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-lg">🤖</div>
      <div className="flex-1">
        <div className="text-white font-semibold text-sm">PKK Assistant</div>
        <div className="text-white/70 text-[10px]">Powered by Gemini AI</div>
      </div>
      <button
        onClick={onClose}
        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700"
        aria-label="Tutup chat"
      >✕</button>
    </div>
  );
}
