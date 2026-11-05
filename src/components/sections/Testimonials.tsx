'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { testimonialsData } from '@/data/testimonials';

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [stepSize, setStepSize] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateStep = () => {
      const firstCard = track.querySelector<HTMLElement>('.t-card');
      if (!firstCard) return;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '17');
      setStepSize(firstCard.offsetWidth + gap);
    };

    updateStep();
    window.addEventListener('resize', updateStep);
    const ro = new ResizeObserver(updateStep);
    ro.observe(track);

    return () => {
      window.removeEventListener('resize', updateStep);
      ro.disconnect();
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(testimonialsData.length - 1, index));
    setActiveIndex(clamped);
    setDragOffset(0);
  }, []);

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Pointer drag handling
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let startX = 0;
    let currentDx = 0;
    let dragging = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragging = true;
      startX = e.clientX;
      currentDx = 0;
      setIsDragging(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      let dx = e.clientX - startX;
      // Edge resistance
      if ((activeIndex === 0 && dx > 0) || (activeIndex === testimonialsData.length - 1 && dx < 0)) {
        dx *= 0.3;
      }
      currentDx = dx;
      setDragOffset(dx);
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      setIsDragging(false);

      if (currentDx < -60 && activeIndex < testimonialsData.length - 1) {
        goTo(activeIndex + 1);
      } else if (currentDx > 60 && activeIndex > 0) {
        goTo(activeIndex - 1);
      } else {
        setDragOffset(0);
      }
    };

    track.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      track.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [activeIndex, goTo]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  };

  const trackTranslate = -(activeIndex * stepSize) + dragOffset;

  return (
    <section
      className="testimonials"
      id="experiments"
      aria-labelledby="t-title"
      aria-roledescription="carousel"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="wrap">
        <h2 className="h2" id="t-title" data-reveal data-heading>
          See How AMRS Approaches Real Model Failures.
        </h2>
      </div>

      <div className="t-wrap" data-reveal>
        <div
          ref={trackRef}
          className={`t-track ${isDragging ? 'is-dragging' : ''}`}
          style={{
            transform: `translate3d(${trackTranslate}px, 0, 0)`,
          }}
        >
          {testimonialsData.map((item, i) => {
            const isActive = i === activeIndex;

            return (
              <article
                key={item.id}
                className={`t-card ${isActive ? 'is-active' : ''}`}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${testimonialsData.length}`}
              >
                <div className="t-main">
                  <span className="tag">{item.tag}</span>
                  <h3 className="t-company">{item.company}</h3>
                  <div className="t-experiment-box">
                    <div className="t-exp-row">
                      <strong className="t-exp-label">Problem:</strong>
                      <span className="t-exp-val">{item.problem}</span>
                    </div>
                    <div className="t-exp-row">
                      <strong className="t-exp-label">Expected recovery:</strong>
                      <span className="t-exp-val">{item.recovery}</span>
                    </div>
                  </div>
                  <blockquote>{item.quote}</blockquote>
                  <footer className="t-person">
                    <strong>{item.author}</strong>
                    <span>{item.role}</span>
                    <small>Reproducible Experiment Scenario</small>
                  </footer>
                </div>

                <aside className="t-side">
                  <Image
                    className="t-avatar"
                    src={item.avatar}
                    alt={item.company}
                    width={107}
                    height={160}
                    draggable={false}
                    unoptimized
                  />
                  <div className="t-who">
                    <small>{item.role}</small>
                    <strong>{item.author}</strong>
                  </div>
                  <div className="t-stats">
                    <small>{item.statsTitle}</small>
                    <dl>
                      {item.stats.map((stat, sIndex) => (
                        <div key={sIndex}>
                          <dt>{stat.label}</dt>
                          <dd>{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </aside>
              </article>
            );
          })}
        </div>
      </div>

      <div className="wrap t-controls" data-reveal>
        <div className="t-dots" role="tablist" aria-label="Choose experiment">
          {testimonialsData.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === activeIndex ? 'is-active' : ''}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Experiment ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <a className="see-all t-cta" href="#features">
          Explore All Experiments{' '}
          <svg aria-hidden="true">
            <use href="#i-arrow-right" />
          </svg>
        </a>

        <div className="t-arrows">
          <button
            type="button"
            className="t-prev"
            aria-label="Previous experiment"
            disabled={activeIndex === 0}
            onClick={prev}
          >
            <svg aria-hidden="true">
              <use href="#i-chev-l" />
            </svg>
          </button>
          <button
            type="button"
            className="t-next"
            aria-label="Next experiment"
            disabled={activeIndex === testimonialsData.length - 1}
            onClick={next}
          >
            <svg aria-hidden="true">
              <use href="#i-chev-r" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
