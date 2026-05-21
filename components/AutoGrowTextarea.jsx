'use client';

import { useEffect, useRef } from 'react';

/**
 * Textarea yang auto-grow vertikal mengikuti panjang konten.
 *
 * Mendukung 2 mode:
 *   - Controlled: pass `value` + `onChange` (klasik React)
 *   - Uncontrolled: pass `defaultValue` + `onChange` (lebih ringan, tidak
 *     trigger re-render parent setiap karakter — DOM yang pegang nilai)
 *
 * Tinggi awal mengikuti `minHeight` (default 32px), lalu mengembang otomatis
 * saat user mengetik (via input event listener, bukan re-render).
 */
export default function AutoGrowTextarea({
  value,
  defaultValue,
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
  const isControlled = value !== undefined;

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
  };

  // Resize saat mount + saat value (controlled) berubah
  useEffect(() => {
    resize();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Untuk mode uncontrolled, juga resize tiap input event langsung dari DOM
  useEffect(() => {
    if (isControlled) return;
    const el = ref.current;
    if (!el) return;
    const onInput = () => resize();
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [isControlled]); // eslint-disable-line react-hooks/exhaustive-deps

  const props = isControlled
    ? { value: value ?? '' }
    : { defaultValue: defaultValue ?? '' };

  return (
    <textarea
      ref={ref}
      rows={1}
      {...props}
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
