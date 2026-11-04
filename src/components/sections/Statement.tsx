'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STATEMENT_TEXT = 'If you can dream it, you can prompt it into existence.';

export function Statement() {
  const containerRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const words = STATEMENT_TEXT.split(/\s+/);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // IntersectionObserver for initial entrance
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add('is-in');
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);

    if (prefersReducedMotion) return;

    // Scroll-linked word blur/fade-out as words approach top of viewport
    const innerWords = el.querySelectorAll<HTMLElement>('.wi');
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    const onScroll = () => {
      const vh = window.innerHeight;
      const fadeStart = Math.min(150, vh * 0.2);

      innerWords.forEach((word) => {
        const y = word.getBoundingClientRect().top;
        if (y < fadeStart) {
          const t = clamp((fadeStart - y) / (fadeStart * 0.8), 0, 1);
          word.style.filter = `blur(${(t * 10).toFixed(1)}px)`;
          word.style.opacity = (1 - t * 0.85).toFixed(2);
        } else {
          word.style.filter = '';
          word.style.opacity = '';
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section ref={containerRef} className="statement" id="statement">
      <p ref={textRef} className="statement__text" data-words aria-label={STATEMENT_TEXT}>
        {words.map((word, i) => (
          <React.Fragment key={i}>
            <span
              className="w"
              style={{ '--i': i } as React.CSSProperties}
              aria-hidden="true"
            >
              <span className="wi">{word}</span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        ))}
      </p>
    </section>
  );
}

export default Statement;
