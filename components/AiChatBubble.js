'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useYears } from '@/lib/useYears';

/**
 * AiChatBubble Component
 * Provides Gemini AI chat and Excel file import preview
 */
export default function AiChatBubble({ tahun, user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya PKK Assistant. Ada yang bisa saya bantu terkait data atau rekapitulasi PKK?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importTahun, setImportTahun] = useState(tahun || new Date().getFullYear());
  const { years } = useYears();
  const [privacyDismissed, setPrivacyDismissed] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [selectedRows, setSelectedRows] = useState({}); // { [tableName]: Set<desaId> }

  // Load privacy banner state
  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && window.localStorage.getItem('ai-privacy-acknowledged') === '1';
    setPrivacyDismissed(dismissed);
  }, []);

  const dismissPrivacy = () => {
    setPrivacyDismissed(true);
    if (typeof window !== 'undefined') window.localStorage.setItem('ai-privacy-acknowledged', '1');
  };

  const SUGGESTED_PROMPTS = [
    'Desa mana yang datanya belum lengkap tahun ini?',
    'Bandingkan jumlah posyandu 2024 dan 2025',
    'Rata-rata jumlah KK per desa',
    'Bagaimana cara import data Excel?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingFile]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setImportTahun(tahun || new Date().getFullYear());
  }, [tahun]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ File terlalu besar. Maksimal 5MB.' }]);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Format file tidak didukung. Harap unggah file Excel (.xlsx / .xls).' }]);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setPendingFile(file);
  };

  // Upload file to parse and generate preview
  const uploadFile = async (messageText = '') => {
    if (!pendingFile || loading) return;

    const fileName = pendingFile.name;
    const userContent = messageText ? `📄 ${fileName}\n\n${messageText}` : `📄 ${fileName}`;
    setMessages(prev => [...prev, { role: 'user', content: userContent, type: 'file' }]);
    setLoading(true);
    const fileToUpload = pendingFile;
    setPendingFile(null);
    setInput('');

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      if (messageText) formData.append('message', messageText);

      // Parse with AI
      const res = await fetch('/api/chat', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      } else if (data.type === 'import_preview') {
        
        // After parsing, fetch diff preview from new API
        setMessages(prev => [...prev, { role: 'assistant', content: `Membandingkan data Excel dengan database...` }]);
        
        const diffRes = await fetch('/api/import/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parsedData: data.parsedData, tahun: importTahun })
        });
        const diffData = await diffRes.json();
        
        if (diffData.error) {
           setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${diffData.error}` }]);
        } else {
           setImportPreviewData({
             parsedData: data.parsedData,
             diff: diffData.diff,
             fileName: data.fileName,
           });
           // Default-select semua row insert/update
           const initialSel = {};
           for (const sheet of diffData.diff || []) {
             const ids = (sheet.rows || [])
               .filter((r) => (r.action === 'insert' || r.action === 'update') && r.desaId)
               .map((r) => r.desaId);
             if (ids.length > 0) initialSel[sheet.tableName] = new Set(ids);
           }
           setSelectedRows(initialSel);
           setOpen(false);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Gagal mengunggah file. Coba lagi.' }]);
    }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!importPreviewData) return;
    setLoading(true);
    setOpen(true);
    
    const parsedData = importPreviewData.parsedData;
    setImportPreviewData(null); 

    setMessages(prev => [...prev, {
      role: 'user',
      content: `✅ Konfirmasi import data tahun **${importTahun}**`,
    }]);

    try {
      // Convert Set→Array untuk JSON
      const selectedDesaIds = {};
      for (const [t, set] of Object.entries(selectedRows)) {
        if (set && set.size > 0) selectedDesaIds[t] = [...set];
      }
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData, tahun: importTahun, selectedDesaIds }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ ${data.error || data.message || 'Gagal menyimpan hasil import'}`,
        }]);
      } else {
        // data shape: { success, message, imported, results: [{ sheet, table, success, failed, error, unmatched }], diff }
        const results = Array.isArray(data.results) ? data.results : [];
        const detailLines = results
          .map(r => {
            const parts = [];
            if (r.success > 0) parts.push(`${r.success} berhasil`);
            if (r.failed > 0) parts.push(`${r.failed} gagal`);
            if (r.skipped) parts.push(`dilewati (${r.reason || 'akses ditolak'})`);
            if (r.error) parts.push(`error: ${r.error}`);
            if (r.unmatched?.length) parts.push(`tidak cocok: ${r.unmatched.join(', ')}`);
            return parts.length > 0 ? `  • **${r.sheet}** → ${parts.join(', ')}` : null;
          })
          .filter(Boolean);

        const summary = data.message || `Selesai: ${data.imported || 0} baris disimpan`;
        const detail = detailLines.length > 0 ? `\n\n${detailLines.join('\n')}` : '';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ ${summary}${detail}`,
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
        body: JSON.stringify({ message: text, history, tahun }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Terjadi kesalahan jaringan. Coba lagi.' }]);
    }
    setLoading(false);
  };

  const renderContent = (content) => {
    return (
      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <>
      {/* Import Preview Modal (Diff View) */}
      <AnimatePresence>
        {importPreviewData && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={cancelImport}></div>
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10"
            >
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <span className="bg-white/20 p-1.5 rounded-lg">📊</span> Konfirmasi Import Data
                  </h3>
                  <p className="text-primary-100 text-sm mt-1">Review perubahan sebelum menyimpan ke database</p>
                </div>
                <button onClick={cancelImport} className="text-white/70 hover:text-white transition-colors" aria-label="Tutup preview import">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <div className="mb-6 flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="text-blue-600">📄</div>
                  <div className="flex-1 text-sm text-blue-900 font-medium">{importPreviewData.fileName}</div>
                </div>

                {importPreviewData.diff.map((sheetDiff, i) => {
                  const selectableRows = (sheetDiff.rows || []).filter((r) => (r.action === 'insert' || r.action === 'update') && r.desaId);
                  const sel = selectedRows[sheetDiff.tableName] || new Set();
                  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => sel.has(r.desaId));
                  const noneSelected = sel.size === 0;
                  const insertOnly = (action) => () => {
                    const next = new Set();
                    selectableRows.filter((r) => r.action === action).forEach((r) => next.add(r.desaId));
                    setSelectedRows((prev) => ({ ...prev, [sheetDiff.tableName]: next }));
                  };
                  const toggleAll = () => {
                    const next = allSelected ? new Set() : new Set(selectableRows.map((r) => r.desaId));
                    setSelectedRows((prev) => ({ ...prev, [sheetDiff.tableName]: next }));
                  };
                  const toggleRow = (desaId) => {
                    setSelectedRows((prev) => {
                      const cur = new Set(prev[sheetDiff.tableName] || []);
                      cur.has(desaId) ? cur.delete(desaId) : cur.add(desaId);
                      return { ...prev, [sheetDiff.tableName]: cur };
                    });
                  };
                  return (
                  <div key={i} className="mb-8">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3 flex-wrap">
                      <span>Sheet: {sheetDiff.sheetName}</span>
                      <span className="text-xs font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">→ {sheetDiff.tableName}</span>
                      <span className="text-xs font-normal text-primary-700 ml-auto">{sel.size} dari {selectableRows.length} terpilih</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                      <button onClick={toggleAll} className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg font-medium text-gray-700">
                        {allSelected ? 'Kosongkan' : 'Pilih semua'}
                      </button>
                      <button onClick={insertOnly('insert')} className="px-2 py-1 bg-green-50 border border-green-200 hover:bg-green-100 rounded-lg font-medium text-green-700">
                        Hanya yang baru
                      </button>
                      <button onClick={insertOnly('update')} className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg font-medium text-blue-700">
                        Hanya yang diubah
                      </button>
                    </div>

                    <div className="flex gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.insert}</span> Baru</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.update}</span> Ubah</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.skip}</span> Skip</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> <span className="font-medium">{sheetDiff.counts.error}</span> Gagal</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <tr>
                              <th className="px-2 py-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={toggleAll}
                                  aria-label={`Pilih semua baris ${sheetDiff.tableName}`}
                                />
                              </th>
                              <th className="px-3 py-3 w-10">Aksi</th>
                              <th className="px-3 py-3 w-40">Desa</th>
                              <th className="px-3 py-3">Perubahan (Hanya yang berbeda)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {sheetDiff.rows.map((row, j) => {
                              const checkable = (row.action === 'insert' || row.action === 'update') && row.desaId;
                              const checked = checkable && sel.has(row.desaId);
                              return (
                              <tr key={j} className={
                                row.action === 'insert' ? 'bg-green-50/30' : 
                                row.action === 'update' ? 'bg-blue-50/30' : 
                                row.action === 'error' ? 'bg-red-50/30' : 'opacity-50'
                              }>
                                <td className="px-2 py-2 align-top">
                                  {checkable ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleRow(row.desaId)}
                                      aria-label={`Pilih ${row.desaName}`}
                                    />
                                  ) : null}
                                </td>
                                <td className="px-3 py-2">
                                  {row.action === 'insert' && <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Baru</span>}
                                  {row.action === 'update' && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Ubah</span>}
                                  {row.action === 'skip' && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">Skip</span>}
                                  {row.action === 'error' && <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Error</span>}
                                </td>
                                <td className="px-3 py-2 font-medium text-gray-800">{row.desaName}</td>
                                <td className="px-3 py-2 font-mono text-xs">
                                  {row.action === 'error' && <span className="text-red-500">{row.reason}</span>}
                                  {row.action === 'skip' && <span className="text-gray-400">Tidak ada perubahan</span>}
                                  {(row.action === 'insert' || row.action === 'update') && (
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(row.incoming).map(([col, val]) => {
                                        const prev = row.current?.[col];
                                        return (
                                          <div key={col} className="bg-white border border-gray-200 rounded px-2 py-1 whitespace-nowrap">
                                            <span className="text-gray-400">{col}:</span>{' '}
                                            {row.action === 'update' && prev !== undefined && (
                                              <span className="line-through text-red-400 mr-1">{prev}</span>
                                            )}
                                            <span className="font-bold text-green-600">{val}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Simpan untuk Tahun:</label>
                  <select
                    value={importTahun}
                    onChange={e => setImportTahun(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                  >
                    {(years && years.length > 0 ? years : [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]).map(y => (
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
                  {(() => {
                    const totalSelected = Object.values(selectedRows).reduce((s, set) => s + (set?.size || 0), 0);
                    return (
                      <button
                        onClick={confirmImport}
                        disabled={totalSelected === 0}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-95"
                      >
                        Simpan {totalSelected > 0 ? `${totalSelected} baris` : ''}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <div className={`fixed bottom-20 right-4 sm:right-6 z-40 transition-all duration-300 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="w-[340px] sm:w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-200 flex flex-col overflow-hidden relative">
          {/* Mini toast inside chat */}
          {toastMsg && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg animate-in fade-in">
              {toastMsg}
            </div>
          )}
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
            {/* Privacy banner */}
            {!privacyDismissed && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                <span className="flex-shrink-0 mt-0.5">ℹ️</span>
                <div className="flex-1">
                  Pesan dan data konteks (tahun aktif ±1, daftar desa) dikirim ke Google Gemini untuk diproses. Jangan masukkan data pribadi sensitif.
                </div>
                <button onClick={dismissPrivacy} className="flex-shrink-0 text-blue-500 hover:text-blue-700 text-xs font-medium" aria-label="Tutup peringatan privasi">✕</button>
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
                  {/* Copy button for assistant messages */}
                  {msg.role === 'assistant' && msg.content && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content).catch(() => {});
                        setToastMsg('Tersalin ke clipboard');
                        setTimeout(() => setToastMsg(null), 2000);
                      }}
                      className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 bg-white border border-gray-200 rounded-md shadow-sm text-gray-400 hover:text-primary-600"
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
                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
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
                aria-label="Kirim pesan"
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
        aria-label="Buka PKK Assistant"
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
