'use client';

/**
 * @file Re-export ThemeProvider untuk kejelasan import path.
 * Pemakaian:
 *   import ThemeProvider from '@/components/ThemeProvider';
 */

import { MotionConfig } from 'framer-motion';
import { ThemeProvider as Provider } from '@/lib/useTheme';

export default function ThemeProvider({ children, defaultTheme = 'light' }) {
  // reducedMotion="user" → framer-motion otomatis menonaktifkan animasi
  // transform/layout untuk user yang set prefers-reduced-motion di OS.
  return (
    <Provider defaultTheme={defaultTheme}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Provider>
  );
}
