'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { faqData } from '@/data/faq';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Faq() {
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => {
    setOpenId((curr) => (curr === id ? null : id));
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 350);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 901px)', () => {
      const section = sectionRef.current;
      const title = titleRef.current;
      const list = listRef.current;
      if (!section || !title || !list) return;

      const getTravel = () => {
        const vh = window.innerHeight;
        const listH = list.offsetHeight;
        const titleH = title.offsetHeight;

        // Target: align with the bottom of the questions list
        const listBottomAlign = Math.max(0, listH - titleH);

        // Safety viewport clamp: ensure the bottom of the title stays well inside the viewport
        const pinnedTop = 80;
        const maxViewportTravel = Math.max(0, vh - pinnedTop - titleH - 50);

        return Math.min(listBottomAlign, maxViewportTravel);
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top+=80',
          end: () => `+=${getTravel() + 120}`,
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      tl.to(title, {
        y: () => getTravel(),
        ease: 'power1.out',
      });

      return () => {
        tl.kill();
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="faq" id="resources" aria-labelledby="faq-title">
      <div className="wrap faq__grid">
        <h2 ref={titleRef} className="h2 faq__title" id="faq-title">
          Everything You Need to Know About AMRS.
        </h2>

        <div ref={listRef} className="faq__list" data-stagger>
          {faqData.map((item, idx) => {
            const isOpen = openId === item.id;
            const btnId = `faq-b${idx + 1}`;
            const panelId = `faq-p${idx + 1}`;

            return (
              <div
                key={item.id}
                className="faq__item"
                data-open={isOpen ? 'true' : 'false'}
                data-reveal
              >
                <button
                  type="button"
                  id={btnId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                >
                  <span>{item.question}</span>
                  <svg aria-hidden="true">
                    <use href="#i-plus" />
                  </svg>
                </button>
                <div
                  className="faq__panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                >
                  <div>
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
