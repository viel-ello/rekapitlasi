'use client';

import ReactMarkdown from 'react-markdown';
import MutationPreviewCard from './MutationPreviewCard';

function renderContent(content) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

/**
 * ChatMessageList — daftar pesan: banner privasi, bubble, kartu mutasi,
 * indikator loading, suggested prompts.
 */
export default function ChatMessageList({ chat }) {
  const {
    messages, loading, pendingFile,
    privacyDismissed, dismissPrivacy,
    applyMutation, cancelMutation, copyMessage, setInput,
    SUGGESTED_PROMPTS, messagesEndRef,
  } = chat;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[280px] max-h-[360px] bg-gray-50/50">
      {/* Privacy banner */}
      {!privacyDismissed && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          <div className="flex-1">
            Pesan dan data konteks (tahun aktif ±1, daftar dusun) dikirim ke Google Gemini untuk diproses. Jangan masukkan data pribadi sensitif.
          </div>
          <button onClick={dismissPrivacy} className="flex-shrink-0 text-blue-500 hover:text-blue-700 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded" aria-label="Tutup peringatan privasi">✕</button>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`relative group/msg max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
            msg.role === 'user'
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md'
          }`}>
            {renderContent(msg.content)}
            {/* Kartu konfirmasi mutasi AI (dry-run) */}
            {msg.type === 'mutation_preview' && msg.mutation && (
              <MutationPreviewCard
                mutation={msg.mutation}
                done={msg.mutationDone}
                loading={loading}
                onApply={() => applyMutation(i, msg.mutation)}
                onCancel={() => cancelMutation(i)}
              />
            )}
            {/* Copy button for assistant messages */}
            {msg.role === 'assistant' && msg.content && (
              <button
                onClick={() => copyMessage(msg.content)}
                className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 bg-white border border-gray-200 rounded-md shadow-sm text-gray-400 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Salin pesan"
                title="Salin"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      {/* Suggested prompts — tampil hanya saat belum ada percakapan */}
      {messages.length <= 1 && !loading && !pendingFile && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInput(prompt)}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
