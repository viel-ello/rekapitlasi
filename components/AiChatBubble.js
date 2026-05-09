'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! 👋 Saya **PKK Assistant**. Saya bisa membantu Anda menganalisis data PKK, menjawab pertanyaan, atau memberi rekomendasi.\n\n📎 Anda juga bisa **kirim file Excel** untuk import data!\n\nCoba tanya sesuatu seperti:\n- "Desa mana yang jumlah jiwanya paling banyak?"\n- "Berapa total posyandu se-kecamatan?"\n- "Bandingkan data Pokja 1 antar desa"' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tahun] = useState(new Date().getFullYear());
  const [user, setUser] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  
  // Modal Preview State
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importTahun, setImportTahun] = useState(new Date().getFullYear());

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Format file tidak didukung. Hanya file **.xlsx** atau **.xls** yang bisa diimport.',
      }]);
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ File terlalu besar (maksimal **5MB**).',
      }]);
      return;
    }

    setPendingFile(file);
  };

  // Upload file for parsing
  const uploadFile = async (messageText = '') => {
    if (!pendingFile || loading) return;

    const fileName = pendingFile.name;
    const userContent = messageText 
      ? `📄 ${fileName}\n\n${messageText}` 
      : `📄 ${fileName}`;
    setMessages(prev => [...prev, { role: 'user', content: userContent, type: 'file' }]);
    setLoading(true);
    const fileToUpload = pendingFile;
    setPendingFile(null);
    setInput('');

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('user', JSON.stringify(user));
      if (messageText) formData.append('message', messageText);

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      } else if (data.type === 'import_preview') {
        // Trigger Modal instead of inline bubble
        setImportPreviewData({
          content: data.preview,
          parsedData: data.parsedData,
          fileName: data.fileName,
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Gagal mengunggah file. Coba lagi.' }]);
    }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Confirm import
  const confirmImport = async () => {
    if (!importPreviewData) return;
    setLoading(true);
    setOpen(true);
    
    const parsedData = importPreviewData.parsedData;
    setImportPreviewData(null); // Close modal

    setMessages(prev => [...prev, {
      role: 'user',
      content: `✅ Konfirmasi import data tahun **${importTahun}**`,
    }]);

    try {
      const res = await fetch('/api/chat/import-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData, tahun: importTahun, user }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          type: 'import_result',
          content: data.summary,
          results: data.results,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Gagal melakukan import. Coba lagi.' }]);
    }
    setLoading(false);
  };

  const cancelImport = () => {
    setImportPreviewData(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🚫 Import dibatalkan. Data tidak diubah.',
    }]);
    setOpen(true);
  };

  // Send text message (existing Gemini chat)
  const sendMessage = async () => {
    if (pendingFile) {
      uploadFile(input.trim());
      return;
    }

    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(1).filter(m => !m.type || m.type === 'text').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, tahun, user }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Gagal menghubungi server. Coba lagi.' }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  // Generate Table Columns from preview data
  const getTableHeaders = (rows) => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]);
  };

  return (
    <>
      {/* Fullscreen Modal Preview */}
      <AnimatePresence>
        {importPreviewData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Preview Import Data</h3>
                  <p className="text-primary-100 text-sm">Validasi data Anda sebelum disimpan ke database</p>
                </div>
                <button
                  onClick={cancelImport}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex-1 overflow-auto bg-gray-50">
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-800 mb-2">Ringkasan AI:</h4>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {renderContent(importPreviewData.content)}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[40vh]">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 whitespace-nowrap">Row</th>
                          {getTableHeaders(importPreviewData.parsedData?.rows).map(header => (
                            <th key={header} className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 whitespace-nowrap">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importPreviewData.parsedData?.rows?.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-gray-500">{i + 1}</td>
                            {getTableHeaders(importPreviewData.parsedData?.rows).map(header => {
                              const value = row[header];
                              // Basic validation: empty string, null, or undefined is considered invalid/empty
                              const isInvalid = value === null || value === undefined || value === '';
                              return (
                                <td 
                                  key={header} 
                                  className={`px-4 py-2.5 text-sm ${isInvalid ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                                  title={isInvalid ? 'Data Kosong / Tidak Valid' : ''}
                                >
                                  {isInvalid ? '⚠️ Kosong' : value}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Tahun Data:</label>
                  <select
                    value={importTahun}
                    onChange={e => setImportTahun(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  >
                    {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={cancelImport}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmImport}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95"
                  >
                    Konfirmasi & Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <div className={`fixed bottom-20 right-4 sm:right-6 z-40 transition-all duration-300 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="w-[340px] sm:w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-lg">🤖</div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">PKK Assistant</div>
              <div className="text-white/70 text-[10px]">Powered by Gemini AI</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
            >✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[280px] max-h-[360px] bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md'
                }`}>
                  {renderContent(msg.content)}
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
            <div ref={messagesEndRef} />
          </div>

          {/* File Preview Bar */}
          {pendingFile && (
            <div className="px-3 pt-2 pb-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-600 text-sm">📄</span>
                <span className="text-xs text-green-800 font-medium truncate flex-1">{pendingFile.name}</span>
                <span className="text-[10px] text-green-600">{(pendingFile.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-green-500 hover:text-red-500 text-sm transition-colors"
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
                className="px-2.5 py-2.5 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
                title="Lampirkan file Excel"
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
                onChange={e => handleFileSelect(e.target.files?.[0])}
              />

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pendingFile ? "Tambahkan pesan (opsional)..." : "Ketik pertanyaan..."}
                className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !pendingFile)}
                className="px-3.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 right-4 sm:right-6 z-40 w-14 h-14 rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
          open
            ? 'bg-gray-700 hover:bg-gray-800 rotate-0'
            : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800'
        }`}
        title="PKK Assistant"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
        {!open && messages.length <= 1 && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </>
  );
}
