import React from 'react';
import { plansData } from '@/data/plans';

export default function Pricing() {
  return (
    <section className="pricing" id="pricing" aria-labelledby="pricing-title">
      <div className="wrap">
        <h2 className="h2" id="pricing-title" data-reveal data-heading suppressHydrationWarning>
          Simple, transparent pricing
        </h2>

        <div className="plans" data-stagger>
          {plansData.map((plan) => (
            <article
              key={plan.id}
              className={`plan${plan.id === 'pro' ? ' plan--pro' : ''}`}
              data-reveal
              suppressHydrationWarning
            >
              <header>
                <div className="plan__top">
                  <span className="plan__icon">
                    <svg aria-hidden="true">
                      <use href={`#${plan.iconId}`} />
                    </svg>
                  </span>
                  {plan.badge && <span className="badge">{plan.badge}</span>}
                </div>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <div className="plan__price">
                  <strong>{plan.price}</strong>
                  {plan.period && <span>{plan.period}</span>}
                  {plan.subnote && <small>{plan.subnote}</small>}
                </div>
              </header>
              <div className="plan__panel">
                <ul>
                  {plan.features.map((feat, idx) => (
                    <li key={idx}>
                      <svg aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <a
                  className={`btn btn--${plan.ctaVariant}`}
                  href={plan.href}
                >
                  {plan.ctaLabel}
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="pricing__note" data-reveal suppressHydrationWarning>
          Start free and scale as you grow. No hidden fees, no surprises.
        </p>
      </div>
    </section>
  );
}

