'use client';

import { useState, useEffect } from 'react';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);

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
      <header className="nav" id="top">
        <div className="nav__inner">
          <a className="brand" href="#top" aria-label="AMRS — Adaptive Model Recovery System" data-in style={{ '--i': 0 } as React.CSSProperties}>
            <svg className="brand__mark" aria-hidden="true">
              <use href="#i-logo" />
            </svg>
            <span className="brand__wrap">
              <span className="brand__word">AMRS</span>
              <span className="brand__sub">Adaptive Model Recovery System</span>
            </span>
          </a>

          <nav className="nav__links" aria-label="Primary" data-in style={{ '--i': 1 } as React.CSSProperties}>
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <a href="#pricing">Pricing</a>
            <a href="#resources">Resources</a>
            <span className="nav__sep" aria-hidden="true" />
            <a href="#waitlist">Contact</a>
            <a href="#waitlist">Join</a>
          </nav>

          <button
            className="menu-btn"
            type="button"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            onClick={() => setIsOpen(true)}
            data-in
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <svg aria-hidden="true">
              <use href="#i-menu" />
            </svg>
            <span className="sr-only">Open menu</span>
          </button>
        </div>
      </header>

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
          <a href="#waitlist" onClick={handleLinkClick}>Join</a>
        </nav>
      </div>
    </>
  );
}

export default Nav;
