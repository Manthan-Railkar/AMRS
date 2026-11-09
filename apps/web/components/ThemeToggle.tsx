'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const isTogglingRef = React.useRef(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const toggleTheme = () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 150);

    const nextTheme = isDark ? 'light' : 'dark';

    setTheme(nextTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
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
