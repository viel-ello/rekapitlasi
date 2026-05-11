'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';

function normalizeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function AnimatedCounter({
  value,
  duration = 1.5,
  delay = 0,
  start = 0,
  locale = 'id-ID',
  formatOptions,
  prefix = '',
  suffix = '',
  className,
  as: Component = 'span',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const target = normalizeNumber(value);
  const [display, setDisplay] = useState(normalizeNumber(start));

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(normalizeNumber(start), target, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, target, duration, delay, start]);

  return (
    <Component ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(locale, formatOptions)}
      {suffix}
    </Component>
  );
}
