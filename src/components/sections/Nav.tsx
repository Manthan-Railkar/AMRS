'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import StaggeredMenu from '@/components/StaggeredMenu';

const menuItems = [
  { label: 'Features', ariaLabel: '4-step model recovery workflow', link: '#features' },
  { label: 'Strategies', ariaLabel: '6 model recovery strategies', link: '#templates' },
  { label: 'Benchmarks', ariaLabel: 'Performance metrics and evaluation', link: '#performance' },
  { label: 'Experiments', ariaLabel: 'Reproducible failure recovery experiments', link: '#experiments' },
  { label: 'FAQ', ariaLabel: 'Everything you need to know about AMRS', link: '#faq' },
  { label: 'Diagnose', ariaLabel: 'Interactive model failure diagnosis', link: '#prompt-form' },
];

const socialItems = [
  { label: 'GitHub', link: 'https://github.com/Manthan-Railkar/AMRS' },
  { label: 'PyTorch', link: 'https://pytorch.org' },
  { label: 'FastAPI', link: 'https://fastapi.tiangolo.com' },
];

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
      <div
        className={`nav-wrapper fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none ${
          scrolled ? 'is-scrolled pt-2.5 sm:pt-3' : 'pt-4 sm:pt-5'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingTop: scrolled ? '12px' : '18px',
          paddingBottom: '8px',
          pointerEvents: 'none',
          transition: 'padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <header
          className={`nav mx-auto flex items-center justify-between rounded-full border text-white transition-all duration-300 pointer-events-auto ${
            scrolled
              ? 'bg-[#0a0814]/85 border-white/15 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl'
              : 'bg-transparent border-transparent shadow-none backdrop-blur-none'
          }`}
          id="top"
          style={{
            pointerEvents: 'auto',
            width: 'min(1140px, calc(100% - 32px))',
            marginInline: 'auto',
            height: '52px',
            padding: '0 8px 0 20px',
            borderRadius: '9999px',
            backgroundColor: scrolled ? 'rgba(10, 8, 20, 0.85)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
            border: scrolled ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
            boxShadow: scrolled ? '0 16px 40px -10px rgba(0, 0, 0, 0.7)' : 'none',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
          }}
        >
          {/* Left: Brand logo */}
          <a
            className="nav__brand flex items-center text-white no-underline shrink-0 group"
            href="#top"
            aria-label="AMRS — Adaptive Model Recovery System"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Image
              src="/assets/img/amrs-logo.png"
              alt="AMRS"
              width={95}
              height={33}
              priority
              className="nav__brand-logo h-7 sm:h-[30px] w-auto object-contain transition-opacity duration-200 group-hover:opacity-90"
              style={{
                height: '28px',
                width: 'auto',
                display: 'block',
              }}
            />
          </a>

          {/* Center: Navigation Links */}
          <nav
            className="nav__links hidden md:flex items-center gap-7 lg:gap-8 text-[12px] font-semibold uppercase tracking-[0.1em]"
            aria-label="Primary"
            style={{
              alignItems: 'center',
              textTransform: 'uppercase',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            <a
              href="#features"
              className="text-white/70 hover:text-white transition-colors duration-200"
              style={{ color: 'rgba(255, 255, 255, 0.72)', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Features
            </a>
            <a
              href="#templates"
              className="text-white/70 hover:text-white transition-colors duration-200"
              style={{ color: 'rgba(255, 255, 255, 0.72)', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Templates
            </a>
            <a
              href="#experiments"
              className="text-white/70 hover:text-white transition-colors duration-200"
              style={{ color: 'rgba(255, 255, 255, 0.72)', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Experiments
            </a>
            <a
              href="#resources"
              className="text-white/70 hover:text-white transition-colors duration-200"
              style={{ color: 'rgba(255, 255, 255, 0.72)', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Resources
            </a>
          </nav>

          {/* Right: Contact & Action Button */}
          <div
            className="nav__right flex items-center gap-3 sm:gap-4 shrink-0"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <a
              href="#prompt"
              className="nav__action-link hidden sm:inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-white/75 hover:text-white transition-colors duration-200"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.75)',
                textDecoration: 'none',
              }}
            >
              Diagnose
            </a>
            <a
              href="#top"
              className="nav__cta-btn inline-flex items-center gap-1.5 bg-white text-[#0b0914] hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.98] font-bold text-[12px] uppercase tracking-wider px-4 sm:px-5 py-2 rounded-full transition-all duration-200 shadow-[0_2px_12px_rgba(255,255,255,0.2)]"
              style={{
                height: '38px',
                padding: '0 18px',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                color: '#0b0914',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px -2px rgba(255, 255, 255, 0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Get Started</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{
                  width: '11px',
                  height: '11px',
                  minWidth: '11px',
                  minHeight: '11px',
                  display: 'inline-block',
                }}
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
              className="menu-btn md:hidden w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
              type="button"
              aria-expanded={isOpen}
              aria-controls="staggered-menu-panel"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'none', // Shown in CSS on mobile
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ width: '18px', height: '18px' }}
              >
                <use href="#i-menu" />
              </svg>
              <span className="sr-only">Toggle menu</span>
            </button>
          </div>
        </header>
      </div>

      <StaggeredMenu
        isOpen={isOpen}
        onMenuOpen={() => setIsOpen(true)}
        onMenuClose={() => setIsOpen(false)}
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        accentColor="#a78bfa"
        colors={['#181230', '#2d1858', '#5b21b6']}
        position="right"
        isFixed={true}
      />
    </>
  );
}

export default Nav;
