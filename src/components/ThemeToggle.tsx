'use client';

import { useSyncExternalStore } from 'react';

function getThemeSnapshot(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
}

function subscribe(callback: () => void) {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') {
        callback();
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('kraft-theme', nextTheme);
    } catch {}
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <svg className="theme-toggle__moon" aria-hidden="true">
        <use href="#i-moon" />
      </svg>
      <svg className="theme-toggle__sun" aria-hidden="true">
        <use href="#i-sun" />
      </svg>
    </button>
  );
}

export default ThemeToggle;
