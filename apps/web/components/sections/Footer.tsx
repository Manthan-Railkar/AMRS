import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__base">
        <div className="wrap">
          <div className="footer__legal">
            <p>© 2026 AMRS, Inc. All rights reserved.</p>
            <div className="footer__social" aria-label="Social media">
              <span className="footer__social-title">Social</span>
              <div>
                <a
                  href="https://github.com/Manthan-Railkar/AMRS"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <svg aria-hidden="true">
                    <use href="#i-github" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <svg
            className="wordmark"
            viewBox="0 0 862 120"
            preserveAspectRatio="xMidYMin meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="wm-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#9d8fd3" stopOpacity=".16" />
                <stop offset="1" stopColor="#8f7fd0" stopOpacity=".34" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="186"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="900"
              fontSize="258"
              textLength="862"
              lengthAdjust="spacingAndGlyphs"
              fill="url(#wm-fill)"
            >
              AMRS
            </text>
          </svg>
        </div>
      </div>
    </footer>
  );
}
