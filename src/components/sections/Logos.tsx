'use client';

import React from 'react';
import { logosData } from '@/data/logos';

export function Logos() {
  // Duplicate array to achieve an endless seamless loop in the horizontal strip
  const repeatedLogos = [...logosData, ...logosData];

  return (
    <section className="logos" id="technologies" aria-labelledby="logos-title">
      <div className="wrap wrap--logos">
        <div className="logos__header">
          <h2 className="h2 logos__title" id="logos-title" data-reveal data-heading>
            Built on the Technologies Powering Modern Machine Learning.
          </h2>
          <p className="logos__lead lead" data-reveal>
            An extensible recovery framework built for reproducible machine learning experimentation.
          </p>
        </div>
      </div>

      {/* Horizontal scrolling strip */}
      <div
        className="logos__strip-wrap"
        data-reveal
        role="region"
        aria-label="Technologies powered by modern machine learning"
      >
        <div className="logos__marquee" aria-hidden="false">
          {repeatedLogos.map((logo, index) => (
            <a
              key={`${logo.id}-${index}`}
              className="logo-pill group"
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={logo.name}
              tabIndex={index >= logosData.length ? -1 : 0}
            >
              <svg
                className="logo-pill__icon"
                aria-hidden="true"
                style={{ color: logo.color }}
              >
                <use href={`#${logo.iconId}`} />
              </svg>
              <span className="logo-pill__name">{logo.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Logos;
