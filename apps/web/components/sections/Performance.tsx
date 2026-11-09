'use client';

import React, { useEffect, useRef, useState } from 'react';
import { performanceData } from '@/data/charts';

export function Performance() {
  const groupRef = useRef<HTMLDivElement>(null);
  const [animatedValues, setAnimatedValues] = useState<Record<string, string>>({});
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = groupRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Calculate max values per category and set --p
    performanceData.forEach((category) => {
      const maxVal = Math.max(...category.bars.map((b) => b.value));
      category.bars.forEach((bar) => {
        const key = `${category.title}-${bar.label}`;
        const p = bar.value / maxVal;
        const domBar = el.querySelector<HTMLElement>(`[data-key="${key}"]`);
        if (domBar) {
          domBar.style.setProperty('--p', p.toString());
        }
      });
    });

    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          el.classList.add('is-in');
          observer.disconnect();

          if (prefersReducedMotion) {
            const staticVals: Record<string, string> = {};
            performanceData.forEach((cat) => {
              cat.bars.forEach((b) => {
                staticVals[`${cat.title}-${b.label}`] = b.value.toFixed(1);
              });
            });
            setAnimatedValues(staticVals);
            return;
          }

          // Count-up animation
          const duration = 1300;
          performanceData.forEach((category) => {
            category.bars.forEach((bar, i) => {
              const key = `${category.title}-${bar.label}`;
              const delay = (i % 4) * 110;
              const target = bar.value;

              setTimeout(() => {
                const startTime = performance.now();
                const step = (now: number) => {
                  const elapsed = now - startTime;
                  const progress = Math.min(1, elapsed / duration);
                  const currentVal = (target * easeOut(progress)).toFixed(1);

                  setAnimatedValues((prev) => ({
                    ...prev,
                    [key]: currentVal,
                  }));

                  if (progress < 1) {
                    requestAnimationFrame(step);
                  }
                };
                requestAnimationFrame(step);
              }, delay);
            });
          });
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section className="perf" aria-labelledby="perf-title">
      <div className="wrap">
        <h2 className="h2" id="perf-title" data-reveal data-heading suppressHydrationWarning>
          Performance that stands out
        </h2>
        <p className="lead" data-reveal suppressHydrationWarning style={{ '--d': '80ms' } as React.CSSProperties}>
          We benchmark AMRS against standard recovery baselines across speed, accuracy, and retention. The results speak for themselves.
        </p>

        <div ref={groupRef} className={`charts ${isInView ? 'is-in' : ''}`} data-chart-group>
          {performanceData.map((category) => (
            <div
              key={category.title}
              className="chart"
              data-reveal
              suppressHydrationWarning
              style={category.delay ? ({ '--d': category.delay } as React.CSSProperties) : undefined}
            >
              <h3>{category.title}</h3>
              <ul>
                {category.bars.map((bar, i) => {
                  const key = `${category.title}-${bar.label}`;
                  const displayVal = animatedValues[key] || (isInView ? bar.value.toFixed(1) : '0.0');

                  return (
                    <li
                      key={bar.label}
                      className={`bar ${bar.isKraft || bar.isAmrs ? 'is-kraft is-amrs' : ''}`}
                      data-key={key}
                      data-value={bar.value}
                      style={{ '--bd': `${i * 110}ms` } as React.CSSProperties}
                    >
                      <span className="bar__label">{bar.label}</span>
                      <span className="bar__track">
                        <span className="bar__fill" />
                      </span>
                      <span className="bar__val">{displayVal}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Performance;
