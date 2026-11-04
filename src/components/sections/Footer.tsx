import React from 'react';
import { footerColumns } from '@/data/footer';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__cols">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footer__social">
            <h3>Social</h3>
            <div>
              <a href="#" aria-label="Facebook">
                <svg aria-hidden="true">
                  <use href="#i-facebook" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter">
                <svg aria-hidden="true">
                  <use href="#i-twitter" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg aria-hidden="true">
                  <use href="#i-linkedin" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer__base">
        <div className="wrap">
          <div className="footer__legal">
            <p>© 2026 Kraft, Inc. All rights reserved.</p>
            <nav aria-label="Legal">
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">Cookies</a>
            </nav>
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

