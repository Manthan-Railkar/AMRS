'use client';

import React, { useState } from 'react';
import { faqData } from '@/data/faq';

export default function Faq() {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggle = (id: string) => {
    setOpenId((curr) => (curr === id ? null : id));
  };

  return (
    <section className="faq" id="resources" aria-labelledby="faq-title">
      <div className="wrap faq__grid">
        <div className="faq__side" data-reveal>
          <h2 className="h2 faq__title" id="faq-title" data-heading>
            Everything You Need to Know About AMRS.
          </h2>

          <div className="faq__help-card">
            <div className="faq__help-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="faq__help-heading">Have a specific question?</h3>
            <p className="faq__help-desc">
              Can’t find what you’re looking for? Test our interactive diagnostics or review reproducible benchmarks.
            </p>
            <a href="#prompt" className="faq__help-btn">
              <span>Diagnose Your Model</span>
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

        <div className="faq__list" data-stagger>
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
