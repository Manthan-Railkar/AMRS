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
        <h2 className="h2 faq__title" id="faq-title" data-reveal data-heading>
          Answers to your questions
        </h2>

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

