'use client';

import React, { useState } from 'react';
import { faqData } from '@/data/faq';

const faqPillars = [
  {
    num: '01',
    title: 'Automated Failure Diagnosis',
    text: 'Continuous telemetry monitoring over loss divergence, generalization gaps, and calibration errors to pinpoint root causes.',
  },
  {
    num: '02',
    title: 'Targeted Parameter Recovery',
    text: 'Selective parameter fine-tuning, weight interpolation, and checkpoint averaging that preserve learned knowledge without full retraining.',
  },
  {
    num: '03',
    title: 'Holdout Verification Protocol',
    text: 'Every recovered candidate is empirically validated against holdout acceptance gates before deployment or automated rollback.',
  },
  {
    num: '04',
    title: 'Architecture & Model Lineage',
    text: 'PyTorch classification configurations (MLP, CNN, ResNet18 CIFAR) with roadmap support for Hugging Face PEFT/LoRA transformers.',
  },
];

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
          <div className="faq__intro">
            <h3 className="faq__subheading">Have a specific question?</h3>
            <p className="faq__desc">
              Can’t find what you’re looking for? Test our interactive diagnostics or review reproducible benchmarks.
            </p>
          </div>

          <div className="faq__pillars">
            {faqPillars.map((p) => (
              <div key={p.num} className="faq__pillar">
                <span className="faq__pillar-num">{p.num} · Architecture Principle</span>
                <h4 className="faq__pillar-title">{p.title}</h4>
                <p className="faq__pillar-text">{p.text}</p>
              </div>
            ))}
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
