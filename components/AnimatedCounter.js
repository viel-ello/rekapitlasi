'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

function normalizeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function AnimatedCounter({
  value,
  duration = 1.2,
  delay = 0,
  start = 0,
  locale = 'id-ID',
  formatOptions,
  formatLocale = true,
  prefix = '',
  suffix = '',
  className,
  as: Component = 'span',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();
  const target = normalizeNumber(value);
  const [display, setDisplay] = useState(shouldReduceMotion ? target : normalizeNumber(start));

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(target);
      return;
    }
    if (!isInView) return;

    const controls = animate(normalizeNumber(start), target, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, target, duration, delay, start, shouldReduceMotion]);

  const formattedValue = formatLocale
    ? display.toLocaleString(locale, formatOptions)
    : String(display);

  return (
    <Component ref={ref} className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </Component>
  );
}
