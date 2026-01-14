'use client';

import { useState, useEffect, useCallback } from 'react';

// Custom event name for theme toggling
export const THEME_TOGGLE_EVENT = 'baseline-theme-toggle';

export function toggleTheme() {
  window.dispatchEvent(new CustomEvent(THEME_TOGGLE_EVENT));
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const updateTheme = useCallback((shouldBeDark: boolean) => {
    setIsDark(shouldBeDark);
    localStorage.setItem('theme', shouldBeDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const handleToggle = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev;
      updateTheme(newValue);
      return newValue;
    });
  }, [updateTheme]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    updateTheme(shouldBeDark);

    const onExternalToggle = () => handleToggle();
    window.addEventListener(THEME_TOGGLE_EVENT, onExternalToggle);

    return () => window.removeEventListener(THEME_TOGGLE_EVENT, onExternalToggle);
  }, [updateTheme, handleToggle]);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="p-2 rounded-md text-gray-500 w-9 h-9" aria-label="Toggle theme">
        <span className="sr-only">Loading theme</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
