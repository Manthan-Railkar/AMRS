'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted
    ? resolvedTheme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    : false;

  const toggleTheme = () => {
    const isCurrentlyDark =
      (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ||
      (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark') ||
      isDark;
    const nextTheme = isCurrentlyDark ? 'light' : 'dark';

    setTheme(nextTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('theme', nextTheme);
      localStorage.setItem('kraft-theme', nextTheme);
    } catch {}
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
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
