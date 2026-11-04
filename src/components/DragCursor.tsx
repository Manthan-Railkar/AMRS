'use client';

import { useEffect, useRef } from 'react';

export function DragCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isFinePointer) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    const track = document.querySelector<HTMLElement>('.steps__track');
    if (!track) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let targetScale = 0;
    let currentScale = 0;
    let isInside = false;
    let rafId: number | null = null;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const update = () => {
      currentX = lerp(currentX, targetX, 0.22);
      currentY = lerp(currentY, targetY, 0.22);
      currentScale = lerp(currentScale, targetScale, 0.2);

      if (cursor) {
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentScale.toFixed(3)})`;
      }

      if (isInside || currentScale > 0.01) {
        rafId = requestAnimationFrame(update);
      } else {
        rafId = null;
      }
    };

    const startLoop = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(update);
      }
    };

    const handlePointerEnter = (e: PointerEvent) => {
      isInside = true;
      targetScale = 1;
      targetX = e.clientX;
      targetY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      cursor.classList.add('is-visible');
      startLoop();
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      startLoop();
    };

    const handlePointerLeave = () => {
      isInside = false;
      targetScale = 0;
      cursor.classList.remove('is-visible', 'is-down');
    };

    const handlePointerDown = () => {
      cursor.classList.add('is-down');
    };

    const handlePointerUp = () => {
      cursor.classList.remove('is-down');
    };

    track.addEventListener('pointerenter', handlePointerEnter);
    track.addEventListener('pointermove', handlePointerMove);
    track.addEventListener('pointerleave', handlePointerLeave);
    track.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      track.removeEventListener('pointerenter', handlePointerEnter);
      track.removeEventListener('pointermove', handlePointerMove);
      track.removeEventListener('pointerleave', handlePointerLeave);
      track.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={cursorRef} className="drag-cursor" aria-hidden="true">
      <span>Drag</span>
    </div>
  );
}

export default DragCursor;
