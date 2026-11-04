'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { galleryRows } from '@/data/gallery';

export function Gallery() {
  const galleryRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

    const updateRows = () => {
      const vh = window.innerHeight;

      rowRefs.current.forEach((row) => {
        if (!row) return;
        const r = row.getBoundingClientRect();
        if (r.bottom < -vh * 0.6 || r.top > vh * 1.6) return;

        // Offset from center of viewport in vh units
        const u = (r.top + r.height / 2 - vh / 2) / vh;

        let gap = 98;
        let side = 450;
        let scale = 1;
        let blur = 0;
        let op = 1;

        if (u >= 0) {
          // Below center
          const q = easeOut(clamp(u / 0.45, 0, 1));
          const f = clamp((u - 0.12) / 0.4, 0, 1);
          gap = lerp(98, 265, q);
          side = 450;
          scale = lerp(1, 0.87, q);
          blur = f * 10;
          op = 1 - f * 0.5;
        } else {
          // Above center
          const q = easeOut(clamp(-u / 0.4, 0, 1));
          const f = clamp((-u - 0.5) / 0.3, 0, 1);
          gap = lerp(98, 24, q);
          side = lerp(450, 300, q);
          scale = 1;
          blur = f * 6;
          op = 1 - f * 0.35;
        }

        row.style.setProperty('--gap', gap.toFixed(1));
        row.style.setProperty('--side', side.toFixed(1));
        row.style.setProperty('--scale', scale.toFixed(3));
        row.style.setProperty('--blur', `${blur.toFixed(1)}px`);
        row.style.setProperty('--op', op.toFixed(2));
      });
    };

    window.addEventListener('scroll', updateRows, { passive: true });
    window.addEventListener('resize', updateRows);
    updateRows();

    return () => {
      window.removeEventListener('scroll', updateRows);
      window.removeEventListener('resize', updateRows);
    };
  }, []);

  return (
    <section ref={galleryRef} className="gallery" aria-label="Designs generated with Kraft">
      {galleryRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          ref={(el) => {
            rowRefs.current[rowIndex] = el;
          }}
          className="g-row"
        >
          {row.map((img, imgIndex) => (
            <Image
              key={imgIndex}
              className={`g-img ${img.isTall ? 'g-img--tall' : ''}`}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

export default Gallery;
