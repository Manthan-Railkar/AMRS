'use client';

import React, { createContext, useContext, useEffect, useRef, useMemo } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface LenisContextValue {
  getLenis: () => Lenis | null;
  scrollTo: (target: string | HTMLElement | number, options?: Record<string, unknown>) => void;
}

const LenisContext = createContext<LenisContextValue>({
  getLenis: () => null,
  scrollTo: () => {},
});

export const useLenisScroll = () => useContext(LenisContext);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('js');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Global anchor interception
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href === '#') return;

      e.preventDefault();
      const el = href === '#top' ? document.body : document.querySelector(href);
      if (el) {
        lenis.scrollTo(href === '#top' ? 0 : (el as HTMLElement), { offset: -20 });
      }
    };

    document.addEventListener('click', handleAnchorClick);

    // Refresh ScrollTrigger after assets settle
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => {
      clearTimeout(refreshTimer);
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const contextValue = useMemo<LenisContextValue>(
    () => ({
      getLenis: () => lenisRef.current,
      scrollTo: (target: string | HTMLElement | number, options?: Record<string, unknown>) => {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(target, options);
        } else if (typeof target === 'string') {
          const el = target === '#top' ? document.body : document.querySelector(target);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    }),
    []
  );

  return (
    <LenisContext.Provider value={contextValue}>
      {children}
    </LenisContext.Provider>
  );
}

export default SmoothScroll;
