'use client';

import { useState, useRef, useEffect } from 'react';
import { useYears } from '@/lib/useYears';

/**
 * useAiChat — semua state & logika bisnis untuk AiChatBubble.
 *
 * Diekstrak dari komponen God (AiChatBubble.js) agar UI murni presentational.
 * Handler ditulis sebagai fungsi biasa (dibuat ulang tiap render) supaya
 * closure terhadap state selalu segar — perilaku identik dengan versi lama.
 */

export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const SUGGESTED_PROMPTS = [
  'Dusun mana yang datanya belum lengkap tahun ini?',
  'Bandingkan jumlah posyandu 2024 dan 2025',
  'Rata-rata jumlah KK per dusun',
  'Bagaimana cara import data Excel?',
];

const INITIAL_MESSAGES = [
  { role: 'assistant', content: 'Halo! Saya PKK Assistant. Ada yang bisa saya bantu terkait data atau rekapitulasi PKK?' },
];

export function useAiChat({ tahun, user } = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importTahun, setImportTahun] = useState(tahun || new Date().getFullYear());
  const [importBulan, setImportBulan] = useState(new Date().getMonth() + 1);
  const [recomputing, setRecomputing] = useState(false);
  // Tandai preview perlu dihitung ulang karena periode berubah setelah upload.
  const [previewStale, setPreviewStale] = useState(false);
  const { years } = useYears();
  const [privacyDismissed, setPrivacyDismissed] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [selectedRows, setSelectedRows] = useState({}); // { [tableName]: Set<desaId> }

  // Load privacy banner state
  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && window.localStorage.getItem('ai-privacy-acknowledged') === '1';
    setPrivacyDismissed(dismissed);
  }, []);

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

  const dismissPrivacy = () => {
    setPrivacyDismissed(true);
    if (typeof window !== 'undefined') window.localStorage.setItem('ai-privacy-acknowledged', '1');
  };

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
          body: JSON.stringify({ parsedData: data.parsedData, tahun: importTahun, bulan: importBulan })
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
           setPreviewStale(false);
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
        body: JSON.stringify({ parsedData, tahun: importTahun, bulan: importBulan, selectedDesaIds }),
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

  // Hitung ulang preview diff terhadap periode (tahun/bulan) yang dipilih saat
  // ini. Dipakai saat user mengganti tahun/bulan setelah upload, supaya diff
  // sinkron dengan periode target sebelum konfirmasi.
  const recomputePreview = async () => {
    if (!importPreviewData) return;
    setRecomputing(true);
    try {
      const diffRes = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData: importPreviewData.parsedData, tahun: importTahun, bulan: importBulan }),
      });
      const diffData = await diffRes.json();
      if (!diffRes.ok || diffData.error) {
        setToastMsg(diffData.error || 'Gagal menghitung ulang preview');
        setTimeout(() => setToastMsg(null), 2500);
      } else {
        setImportPreviewData((prev) => ({ ...prev, diff: diffData.diff }));
        const initialSel = {};
        for (const sheet of diffData.diff || []) {
          const ids = (sheet.rows || [])
            .filter((r) => (r.action === 'insert' || r.action === 'update') && r.desaId)
            .map((r) => r.desaId);
          if (ids.length > 0) initialSel[sheet.tableName] = new Set(ids);
        }
        setSelectedRows(initialSel);
      }
    } catch {
      setToastMsg('Gagal menghubungi server');
      setTimeout(() => setToastMsg(null), 2500);
    }
    setRecomputing(false);
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
      } else if (data.type === 'mutation_preview' && data.mutation) {
        // AI mengusulkan perubahan data — tampilkan kartu konfirmasi (dry-run).
        setMessages(prev => [...prev, {
          role: 'assistant',
          type: 'mutation_preview',
          content: data.reply,
          mutation: data.mutation,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Terjadi kesalahan jaringan. Coba lagi.' }]);
    }
    setLoading(false);
  };

  // Terapkan mutasi yang diusulkan AI setelah user klik "Terapkan".
  const applyMutation = async (msgIndex, mutation) => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/confirm-mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutation }),
      });
      const data = await res.json();
      // Tandai kartu sebagai sudah diproses supaya tombol hilang.
      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, mutationDone: true } : m));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (!res.ok || data.error) ? `❌ ${data.error || 'Gagal menerapkan perubahan'}` : `✅ ${data.message}`,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Gagal menerapkan perubahan. Coba lagi.' }]);
    }
    setLoading(false);
  };

  const cancelMutation = (msgIndex) => {
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, mutationDone: true } : m));
    setMessages(prev => [...prev, { role: 'assistant', content: '🚫 Perubahan dibatalkan. Data tidak diubah.' }]);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setToastMsg('Tersalin ke clipboard');
    setTimeout(() => setToastMsg(null), 2000);
  };

  // ── Selection helpers untuk import preview ───────────────────────────────
  const toggleAllRows = (tableName, selectableRows) => {
    setSelectedRows((prev) => {
      const cur = prev[tableName] || new Set();
      const allSelected = selectableRows.length > 0 && selectableRows.every((r) => cur.has(r.desaId));
      const next = allSelected ? new Set() : new Set(selectableRows.map((r) => r.desaId));
      return { ...prev, [tableName]: next };
    });
  };

  const selectByAction = (tableName, selectableRows, action) => {
    const next = new Set();
    selectableRows.filter((r) => r.action === action).forEach((r) => next.add(r.desaId));
    setSelectedRows((prev) => ({ ...prev, [tableName]: next }));
  };

  const toggleRow = (tableName, desaId) => {
    setSelectedRows((prev) => {
      const cur = new Set(prev[tableName] || []);
      cur.has(desaId) ? cur.delete(desaId) : cur.add(desaId);
      return { ...prev, [tableName]: cur };
    });
  };

  return {
    // state
    open, setOpen,
    messages,
    input, setInput,
    loading,
    pendingFile, setPendingFile,
    importPreviewData,
    importTahun, setImportTahun,
    importBulan, setImportBulan,
    recomputing,
    previewStale, setPreviewStale,
    privacyDismissed,
    toastMsg,
    selectedRows,
    years,
    // refs
    messagesEndRef, inputRef, fileRef,
    // constants
    SUGGESTED_PROMPTS, MONTHS,
    // handlers
    dismissPrivacy,
    handleKeyDown,
    handleFileSelect,
    uploadFile,
    confirmImport,
    cancelImport,
    recomputePreview,
    sendMessage,
    applyMutation,
    cancelMutation,
    copyMessage,
    toggleAllRows,
    selectByAction,
    toggleRow,
  };
}
