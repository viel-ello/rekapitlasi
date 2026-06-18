'use client';

import { useAiChat } from '@/hooks/useAiChat';
import ChatFab from '@/components/ai-chat/ChatFab';
import ChatHeader from '@/components/ai-chat/ChatHeader';
import ChatMessageList from '@/components/ai-chat/ChatMessageList';
import ChatInput from '@/components/ai-chat/ChatInput';
import ImportPreviewModal from '@/components/ai-chat/ImportPreviewModal';

/**
 * AiChatBubble — komposisi tipis. Semua state/logika ada di useAiChat,
 * UI dipecah ke sub-komponen di components/ai-chat/*.
 * Menyediakan chat Gemini AI + preview import Excel.
 */
export default function AiChatBubble({ tahun, user }) {
  const chat = useAiChat({ tahun, user });

  return (
    <>
      {/* Import Preview Modal (Diff View) */}
      <ImportPreviewModal chat={chat} />

      {/* Chat Panel */}
      <div className={`fixed bottom-20 right-4 sm:right-6 z-40 transition-all duration-300 ${chat.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="w-[340px] sm:w-[380px] max-h-[520px] bg-white rounded-3xl shadow-modal border border-gray-200 flex flex-col overflow-hidden relative">
          {/* Mini toast inside chat */}
          {chat.toastMsg && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg animate-in fade-in">
              {chat.toastMsg}
            </div>
          )}
          <ChatHeader onClose={() => chat.setOpen(false)} />
          <ChatMessageList chat={chat} />
          <ChatInput
            input={chat.input}
            setInput={chat.setInput}
            onKeyDown={chat.handleKeyDown}
            onSend={chat.sendMessage}
            loading={chat.loading}
            pendingFile={chat.pendingFile}
            onClearPendingFile={() => { chat.setPendingFile(null); if (chat.fileRef.current) chat.fileRef.current.value = ''; }}
            onFileSelect={chat.handleFileSelect}
            inputRef={chat.inputRef}
            fileRef={chat.fileRef}
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <ChatFab open={chat.open} onToggle={() => chat.setOpen(!chat.open)} hasNew={chat.messages.length <= 1} />
    </>
  );
}
