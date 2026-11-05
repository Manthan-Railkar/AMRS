'use client';

import React from 'react';
import Image from 'next/image';
import { presetsData } from '@/data/presets';

export function Presets() {
  return (
    <section className="presets" id="templates" aria-labelledby="presets-title">
      <div className="wrap">
        <div className="presets__head">
          <h2 className="h2" id="presets-title" data-reveal data-heading>
            A Recovery Strategy for Every Model Failure.
          </h2>
          <p className="presets__lead lead" data-reveal>
            AMRS uses a collection of recovery techniques to address different model degradation patterns. Strategies are selected based on diagnosis results, prerequisites and estimated computational cost.
          </p>
        </div>

        <div className="preset-grid" data-stagger>
          {presetsData.map((preset) => (
            <a key={preset.id} className="preset group" href={preset.href} data-reveal>
              <Image
                src={preset.image}
                alt={preset.title}
                width={preset.width}
                height={preset.height}
              />
              <div className="preset__overlay">
                <span className="preset__tag">{preset.index}</span>
                <span className="preset__title">{preset.title}</span>
                <p className="preset__desc">{preset.description}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="preset-foot" data-reveal>
          <p>
            AMRS uses a collection of recovery techniques to address different model degradation patterns. Strategies are selected based on diagnosis results, prerequisites and estimated computational cost.
          </p>
          <a className="see-all" href="#waitlist">
            Explore all strategies{' '}
            <svg aria-hidden="true">
              <use href="#i-arrow-right" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default Presets;
