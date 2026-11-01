/**
 * Centralized Theme Context Provider — Light, Dark & System Preference
 *
 * Implements:
 * - 3-state theme architecture: 'light' | 'dark' | 'system'.
 * - Dynamic resolution of system preference via window.matchMedia.
 * - Reactive update when operating system appearance changes while in 'system' mode.
 * - Strict persistence across page reloads, navigation, authentication, and language changes.
 * - DOM class synchronization (.dark class and [data-theme="light" | "dark"]).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Theme } from '../types';

export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'yojana_theme';

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as Theme;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  return 'system';
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getInitialTheme()));

  // Apply resolved theme to HTML root element
  const applyThemeToDOM = useCallback((resolved: ResolvedTheme) => {
    document.documentElement.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Set theme explicitly
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      // Dispatch storage event for other tabs/listeners
      window.dispatchEvent(new Event('yojana_theme_change'));
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [applyThemeToDOM]);

  // Toggle between light, dark, and system smoothly
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      let next: Theme;
      if (prev === 'light') next = 'dark';
      else if (prev === 'dark') next = 'system';
      else next = 'light';

      try {
        localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new Event('yojana_theme_change'));
      } catch (e) {}

      const resolved = resolveTheme(next);
      setResolvedTheme(resolved);
      applyThemeToDOM(resolved);
      return next;
    });
  }, [applyThemeToDOM]);

  // Listen to system OS preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const nextResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(nextResolved);
        applyThemeToDOM(nextResolved);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleSystemChange);
      return () => (mediaQuery as any).removeListener(handleSystemChange);
    }
  }, [theme, applyThemeToDOM]);

  // Synchronize on mount and whenever theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [theme, applyThemeToDOM]);

  // Listen to cross-window or citizenStore theme change events
  useEffect(() => {
    const handleCustomChange = () => {
      const stored = getInitialTheme();
      if (stored !== theme) {
        setThemeState(stored);
        const resolved = resolveTheme(stored);
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved);
      }
    };
    window.addEventListener('yojana_theme_change', handleCustomChange);
    return () => window.removeEventListener('yojana_theme_change', handleCustomChange);
  }, [theme, applyThemeToDOM]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
