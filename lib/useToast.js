'use client';

/**
 * @file Toast context + hook
 *
 * Pemakaian:
 *   <ToastProvider> di root dashboard layout.
 *   const { showToast } = useToast();
 *   showToast({ type: 'success', message: 'Tersimpan', duration: 5000, dismissable: true });
 *
 * Default duration 5 detik (lebih lama dari versi lama 3s), error tidak auto-dismiss.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const MAX_VISIBLE = 3;

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `toast-${Date.now()}-${idCounter}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback((options) => {
    const toast = {
      id: makeId(),
      type: options.type || 'info',
      message: options.message || '',
      dismissable: options.dismissable !== false,
      duration: options.duration ?? (options.type === 'error' ? 0 : 5000),
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      const next = [...prev, toast];
      // Max 3 visible — drop oldest
      if (next.length > MAX_VISIBLE) {
        const dropped = next.slice(0, next.length - MAX_VISIBLE);
        dropped.forEach((t) => {
          if (timersRef.current[t.id]) {
            clearTimeout(timersRef.current[t.id]);
            delete timersRef.current[t.id];
          }
        });
        return next.slice(next.length - MAX_VISIBLE);
      }
      return next;
    });

    if (toast.duration > 0) {
      timersRef.current[toast.id] = setTimeout(() => {
        dismissToast(toast.id);
      }, toast.duration);
    }

    return toast.id;
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast, toasts }), [showToast, dismissToast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: log ke console supaya tidak crash di komponen yang belum wrap provider.
    return {
      showToast: (opts) => {
        console.warn('[useToast] ToastProvider missing. Message:', opts?.message);
      },
      dismissToast: () => {},
      toasts: [],
    };
  }
  return ctx;
}
