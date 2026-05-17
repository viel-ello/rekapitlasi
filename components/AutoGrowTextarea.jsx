'use client';

import { useEffect, useRef } from 'react';

/**
 * Textarea yang auto-grow vertikal mengikuti panjang konten.
 *
 * Props sama dengan <textarea>. Tinggi awal mengikuti `minHeight` (default 32px),
 * lalu mengembang otomatis saat user mengetik.
 *
 * Catatan: sengaja unstyled supaya caller bisa pass className sendiri.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  onBlur,
  className = '',
  style = {},
  minHeight = 32,
  maxHeight = 320,
  placeholder = '',
  ...rest
}) {
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
  };

  useEffect(() => {
    resize();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value ?? ''}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
      style={{
        resize: 'none',
        overflow: 'hidden',
        minHeight,
        maxHeight,
        ...style,
      }}
      {...rest}
    />
  );
}
