'use client';

import React, { useState } from 'react';

export default function Cta() {
  const [email, setEmail] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [noteError, setNoteError] = useState(false);

  const validate = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(email.trim())) {
      setIsInvalid(true);
      setNoteError(true);
      return;
    }
    setIsSubmitted(true);
    setNoteError(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (isInvalid) {
      setIsInvalid(false);
      setNoteError(false);
    }
  };

  return (
    <section className="cta" id="waitlist" aria-labelledby="cta-title">
      <div className="wrap">
        <div className="cta__card" data-reveal suppressHydrationWarning>
          <h2 id="cta-title">Get early access</h2>
          <p>
            Every week, we ship new AI-powered design features. Join and be first in line to shape what we build next.
          </p>
          <form className="cta__form" id="waitlist-form" noValidate onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              value={email}
              disabled={isSubmitted}
              onChange={handleInputChange}
              className={isInvalid ? 'is-invalid' : ''}
            />
            <button type="submit" disabled={isSubmitted}>
              {isSubmitted ? "You're on the list" : 'Join waitlist'}
            </button>
          </form>
          <small className="cta__note" id="waitlist-note">
            {noteError ? (
              <span className="text-red-500 font-medium">Please enter a valid email address.</span>
            ) : (
              <>
                We respect your inbox. No spam, just product updates.{' '}
                <a href="#">Privacy Policy</a>.
              </>
            )}
          </small>
        </div>
      </div>
    </section>
  );
}

