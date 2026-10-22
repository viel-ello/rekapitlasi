'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to manage auto-saving and restoring drafts in localStorage.
 *
 * @param {Object} options
 * @param {string} options.tableName - Table identifier (e.g. 'data_umum', 'data_bumil')
 * @param {number} options.tahun - Current selected year
 * @param {number|null} [options.bulan] - Current selected month (1-12) or null for annual
 * @param {string|number|null} [options.dusunId] - Dusun ID or null if all
 * @param {Function} [options.onRestore] - Callback when user restores draft
 */
export function useLocalDraft({
  tableName,
  tahun,
  bulan = null,
  dusunId = null,
  onRestore,
}) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  const debounceTimerRef = useRef(null);

  const getStorageKey = useCallback(() => {
    if (!tableName || !tahun) return null;
    const b = bulan != null ? `m${bulan}` : 'annual';
    const d = dusunId != null ? `d${dusunId}` : 'all';
    return `pkk_draft_${tableName}_${tahun}_${b}_${d}`;
  }, [tableName, tahun, bulan, dusunId]);

  // Check for existing draft whenever key changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getStorageKey();
    if (!key) {
      setHasDraft(false);
      setDraftTimestamp(null);
      setDraftData(null);
      setShowBanner(false);
      return;
    }

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data && Object.keys(parsed.data).length > 0) {
          setHasDraft(true);
          setDraftData(parsed.data);
          setDraftTimestamp(parsed.timestamp ? new Date(parsed.timestamp) : null);
          setShowBanner(true);
          return;
        }
      }
    } catch {
      // Storage parsing failed or disabled
    }

    setHasDraft(false);
    setDraftTimestamp(null);
    setDraftData(null);
    setShowBanner(false);
  }, [getStorageKey]);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(
    (dataToSave, immediate = false) => {
      if (typeof window === 'undefined') return;
      const key = getStorageKey();
      if (!key) return;

      const doSave = () => {
        try {
          if (!dataToSave || Object.keys(dataToSave).length === 0) {
            localStorage.removeItem(key);
            setHasDraft(false);
            setDraftData(null);
            setDraftTimestamp(null);
            return;
          }
          const now = new Date();
          const payload = {
            timestamp: now.toISOString(),
            data: dataToSave,
          };
          localStorage.setItem(key, JSON.stringify(payload));
          setHasDraft(true);
          setDraftData(dataToSave);
          setDraftTimestamp(now);
        } catch {
          // Quota exceeded or private mode
        }
      };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (immediate) {
        doSave();
      } else {
        debounceTimerRef.current = setTimeout(doSave, 800);
      }
    },
    [getStorageKey]
  );

  // Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const key = getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch { /* silent */ }
    }
    setHasDraft(false);
    setDraftData(null);
    setDraftTimestamp(null);
    setShowBanner(false);
  }, [getStorageKey]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    if (draftData) {
      if (onRestore) {
        onRestore(draftData);
      }
      setShowBanner(false);
      return draftData;
    }
    return null;
  }, [draftData, onRestore]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  return {
    hasDraft,
    draftTimestamp,
    draftData,
    showBanner,
    saveDraft,
    clearDraft,
    restoreDraft,
    dismissBanner,
  };
}
