'use client';

/**
 * ChatInput — area input: lampiran file Excel, teks, dan tombol kirim.
 * Termasuk bar preview file yang sedang menunggu (pendingFile).
 */
export default function ChatInput({
  input,
  setInput,
  onKeyDown,
  onSend,
  loading,
  pendingFile,
  onClearPendingFile,
  onFileSelect,
  inputRef,
  fileRef,
}) {
  return (
    <>
      {/* File Preview Bar */}
      {pendingFile && (
        <div className="px-3 pt-2 pb-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600 text-sm">📄</span>
            <span className="text-xs text-green-800 font-medium truncate flex-1">{pendingFile.name}</span>
            <span className="text-[10px] text-green-600">{(pendingFile.size / 1024).toFixed(0)} KB</span>
            <button
              onClick={onClearPendingFile}
              className="text-green-500 hover:text-red-500 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              aria-label="Hapus lampiran file"
            >✕</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="px-2.5 py-2.5 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            title="Lampirkan file Excel"
            aria-label="Lampirkan file Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => onFileSelect(e.target.files?.[0])}
          />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={pendingFile ? "Tambahkan pesan (opsional)..." : "Ketik pertanyaan..."}
            className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
            disabled={loading}
            aria-label="Ketik pesan untuk PKK Assistant"
          />
          <button
            onClick={onSend}
            disabled={loading || (!input.trim() && !pendingFile)}
            className="px-3.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            aria-label="Kirim pesan"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
