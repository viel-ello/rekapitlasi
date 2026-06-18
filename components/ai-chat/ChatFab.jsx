'use client';

/**
 * ChatFab — tombol mengambang untuk membuka/menutup PKK Assistant.
 */
export default function ChatFab({ open, onToggle, hasNew }) {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-4 right-4 sm:right-6 z-40 w-14 h-14 rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        open
          ? 'bg-primary-800 hover:bg-primary-900 rotate-0'
          : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800'
      }`}
      title="PKK Assistant"
      aria-label="Buka PKK Assistant"
    >
      {open ? (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      ) : (
        <span className="text-2xl">🤖</span>
      )}
      {!open && hasNew && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
}
