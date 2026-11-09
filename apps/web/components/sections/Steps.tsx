'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { stepsData } from '@/data/steps';

export function Steps() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let moved = 0;
    let lastX = 0;
    let lastTime = 0;
    let vel = 0;
    let rafInertia: number | null = null;

    const stopInertia = () => {
      if (rafInertia) {
        cancelAnimationFrame(rafInertia);
        rafInertia = null;
      }
    };

    const runInertia = () => {
      if (Math.abs(vel) > 0.3) {
        track.scrollLeft -= vel;
        vel *= 0.94;
        rafInertia = requestAnimationFrame(runInertia);
      } else {
        rafInertia = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDown = true;
      stopInertia();
      startX = e.clientX;
      scrollStart = track.scrollLeft;
      lastX = e.clientX;
      lastTime = performance.now();
      moved = 0;
      vel = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      moved += Math.abs(e.clientX - lastX);
      if (moved > 4) {
        track.classList.add('is-dragging');
      }
      track.scrollLeft = scrollStart - dx;

      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      vel = ((e.clientX - lastX) / dt) * 16;
      lastX = e.clientX;
      lastTime = now;
    };

    const onPointerUp = () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
      if (moved > 4 && Math.abs(vel) > 1) {
        runInertia();
      }
    };

    const onClick = (e: MouseEvent) => {
      if (moved > 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    track.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    track.addEventListener('click', onClick, { capture: true });

    return () => {
      stopInertia();
      track.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      track.removeEventListener('click', onClick, { capture: true });
    };
  }, []);

  return (
    <section className="steps" id="features" aria-labelledby="steps-title">
      <div className="wrap">
        <h2 className="h2" id="steps-title" data-reveal data-heading suppressHydrationWarning>
          From Model Failure to Verified Recovery in Four Steps.
        </h2>
      </div>
      <div ref={trackRef} className="steps__track" data-drag data-stagger>
        {stepsData.map((step) => (
          <article key={step.id} className="step" data-reveal suppressHydrationWarning>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <Image
              src={step.image}
              alt=""
              width={step.width}
              height={step.height}
              draggable={false}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export default Steps;
