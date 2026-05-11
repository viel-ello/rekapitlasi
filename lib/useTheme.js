'use client';

/**
 * @file Theme hook — mode 'light' | 'dark' | 'system'.
 * Tersimpan di localStorage key 'theme'. Apply class ke <html>:
 *   'light' → class 'light'
 *   'dark' → class 'dark'
 *   'system' → follow matchMedia '(prefers-color-scheme: dark)'.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme';

function resolveSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effective = theme === 'system' ? resolveSystemTheme() : theme;
  root.classList.remove('light', 'dark');
  root.classList.add(effective);
}

export function ThemeProvider({ children, defaultTheme = 'light' }) {
  const [theme, setThemeState] = useState(defaultTheme);

  // Load dari localStorage sekali saat mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const initial = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : defaultTheme;
    setThemeState(initial);
    applyThemeClass(initial);
  }, [defaultTheme]);

  // Listen system theme change kalau mode 'system'
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeClass('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!['light', 'dark', 'system'].includes(next)) return;
    setThemeState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    applyThemeClass(next);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    effectiveTheme: theme === 'system' ? resolveSystemTheme() : theme,
  }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: 'light', effectiveTheme: 'light', setTheme: () => {} };
  }
  return ctx;
}
