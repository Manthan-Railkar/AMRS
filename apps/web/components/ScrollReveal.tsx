'use client';

import { useEffect } from 'react';

/**
 * ScrollReveal manages reveal-on-scroll animations for landing page elements
 * marked with [data-reveal].
 *
 * It is intentionally scoped to the page level (rather than RootLayout) and
 * deferred until after mount via requestAnimationFrame so that it NEVER
 * mutates DOM attributes while React is hydrating server-rendered markup.
 */
export default function ScrollReveal() {
  useEffect(() => {
    // Progressive enhancement marker for CSS
    document.documentElement.classList.add('js');

    const reveal = (el: Element) => {
      el.classList.add('is-in');
      el.setAttribute('data-in', 'true');
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll('[data-reveal]').forEach(reveal);
      return;
    }

    let io: IntersectionObserver | null = null;
    const rafId = requestAnimationFrame(() => {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            reveal(en.target);
            io?.unobserve(en.target);
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -4% 0px' }
      );

      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (el.getAttribute('data-in') === 'true') {
          el.classList.add('is-in');
          return;
        }
        io?.observe(el);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      io?.disconnect();
    };
  }, []);

  return null;
}
