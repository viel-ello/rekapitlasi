'use client';

/**
 * @file Re-export ThemeProvider untuk kejelasan import path.
 * Pemakaian:
 *   import ThemeProvider from '@/components/ThemeProvider';
 */

import { ThemeProvider as Provider } from '@/lib/useTheme';

export default function ThemeProvider({ children, defaultTheme = 'light' }) {
  return <Provider defaultTheme={defaultTheme}>{children}</Provider>;
}
