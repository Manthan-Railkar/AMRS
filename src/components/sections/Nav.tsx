'use client';

import { useState, useEffect } from 'react';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className={`nav-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
        <header className="nav" id="top" data-in style={{ '--i': 0 } as React.CSSProperties}>
          <div className="nav__inner">
            {/* Left: Brand logo */}
            <a className="nav__brand" href="#top" aria-label="AMRS — Adaptive Model Recovery System">
              <svg className="nav__brand-mark" aria-hidden="true">
                <use href="#i-logo" />
              </svg>
              <span className="nav__brand-title">
                AMR<span className="nav__brand-accent">S</span>
              </span>
            </a>

            {/* Center: Navigation Links */}
            <nav className="nav__links" aria-label="Primary">
              <a href="#features">Features</a>
              <a href="#templates">Templates</a>
              <a href="#pricing">Pricing</a>
              <a href="#resources">Resources</a>
            </nav>

            {/* Right: Contact & Action Button */}
            <div className="nav__right">
              <a href="#waitlist" className="nav__action-link">
                Contact
              </a>
              <a href="#waitlist" className="nav__cta-btn">
                <span>Get Started</span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>

              <button
                className="menu-btn"
                type="button"
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
                onClick={() => setIsOpen(true)}
              >
                <svg aria-hidden="true">
                  <use href="#i-menu" />
                </svg>
                <span className="sr-only">Open menu</span>
              </button>
            </div>
          </div>
        </header>
      </div>

      <div
        className={`mobile-menu ${isOpen ? 'is-open' : ''}`}
        id="mobile-menu"
        aria-hidden={!isOpen}
      >
        <button
          className="mobile-menu__close"
          type="button"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
        >
          <svg aria-hidden="true">
            <use href="#i-close" />
          </svg>
        </button>
        <nav aria-label="Mobile">
          <a href="#features" onClick={handleLinkClick}>Features</a>
          <a href="#templates" onClick={handleLinkClick}>Templates</a>
          <a href="#pricing" onClick={handleLinkClick}>Pricing</a>
          <a href="#resources" onClick={handleLinkClick}>Resources</a>
          <a href="#waitlist" onClick={handleLinkClick}>Contact</a>
          <a href="#waitlist" onClick={handleLinkClick}>Get Started</a>
        </nav>
      </div>
    </>
  );
}

export default Nav;
