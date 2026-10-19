'use client';

/**
 * @file Dialog — modal reusable yang accessible.
 *
 * Fitur a11y:
 *   - role="dialog" + aria-modal="true"
 *   - aria-labelledby (otomatis dari `title` atau prop `labelledBy`)
 *   - Escape untuk menutup
 *   - Focus trap sederhana (Tab/Shift+Tab berputar di dalam dialog)
 *   - Focus restore ke elemen pemicu saat ditutup
 *   - Klik backdrop menutup (opsional via `closeOnBackdrop`)
 *   - Body scroll lock saat terbuka
 *
 * Tidak mengubah visual: caller menyusun isi via children. Komponen ini hanya
 * menyediakan shell backdrop + panel + perilaku a11y.
 */

import { useEffect, useId, useRef, useCallback } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Dialog({
  open,
  onClose,
  title,
  labelledBy,
  describedBy,
  children,
  closeOnBackdrop = true,
  panelClassName = 'relative z-10 w-full max-w-md glass-panel rounded-3xl p-6',
  backdropClassName = 'fixed inset-0 bg-gray-950/45 backdrop-blur-md',
  containerClassName = 'fixed inset-0 z-[100] flex items-center justify-center p-4',
  initialFocusRef,
}) {
  const panelRef = useRef(null);
  const previousActiveRef = useRef(null);
  const autoId = useId();
  const titleId = labelledBy || (title ? `dialog-title-${autoId}` : undefined);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
      return;
    }
    if (e.key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    // Simpan elemen aktif untuk focus restore.
    previousActiveRef.current = document.activeElement;

    // Lock body scroll.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Set focus awal ke dalam dialog.
    const t = setTimeout(() => {
      const target = initialFocusRef?.current
        || panelRef.current?.querySelector(FOCUSABLE)
        || panelRef.current;
      target?.focus?.();
    }, 0);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      // Focus restore.
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return (
    <div className={containerClassName} onKeyDown={handleKeyDown}>
      <div
        className={backdropClassName}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={panelClassName}
      >
        {title && (
          <h2 id={titleId} className="sr-only">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
