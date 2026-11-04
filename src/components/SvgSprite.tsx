export function SvgSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-logo" viewBox="0 0 20 20">
          <g fill="currentColor" transform="translate(10 10)">
            <circle r="2.4" />
            <circle cy="-4.3" r="2.2" />
            <circle cx="3.05" cy="-3.05" r="2.2" />
            <circle cx="4.3" r="2.2" />
            <circle cx="3.05" cy="3.05" r="2.2" />
            <circle cy="4.3" r="2.2" />
            <circle cx="-3.05" cy="3.05" r="2.2" />
            <circle cx="-4.3" r="2.2" />
            <circle cx="-3.05" cy="-3.05" r="2.2" />
          </g>
        </symbol>

        <symbol id="i-clip" viewBox="0 0 24 24">
          <path
            d="M21 11.5l-8.6 8.6a5 5 0 01-7.1-7.1l9.2-9.2a3.3 3.3 0 014.7 4.7l-9.3 9.2a1.7 1.7 0 01-2.4-2.4l8.5-8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-bulb" viewBox="0 0 24 24">
          <path
            d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-pen" viewBox="0 0 24 24">
          <path
            d="M4 20l1-5L16.5 3.5a2.1 2.1 0 013 3L8 18l-4 2zM14 6l4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-layout" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <path d="M3 9.5h18M9.5 9.5V20" />
          </g>
        </symbol>

        <symbol id="i-mic" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.500V21" />
          </g>
        </symbol>

        <symbol id="i-arrow-right" viewBox="0 0 24 24">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-arrow-down" viewBox="0 0 24 24">
          <path
            d="M12 3v17M6 14.500l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-check" viewBox="0 0 24 24">
          <path
            d="M5 12.500l4.200 4.200L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </symbol>

        <symbol id="i-chev-l" viewBox="0 0 24 24">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-chev-r" viewBox="0 0 24 24">
          <path
            d="M9 5l7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-moon" viewBox="0 0 24 24">
          <path
            d="M20 14.500A8 8 0 019.500 4 8 8 0 1020 14.500z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-sun" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400" />
          </g>
        </symbol>

        <symbol id="i-menu" viewBox="0 0 24 24">
          <path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </symbol>

        <symbol id="i-close" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </symbol>

        <symbol id="i-facebook" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M13.500 21v-7.500H16l.5-3h-3V8.600c0-.9.300-1.500 1.600-1.500h1.500V4.400c-.3 0-1.200-.1-2.200-.1-2.200 0-3.700 1.300-3.700 3.800v2.400H8v3h2.700V21h2.800z"
          />
        </symbol>

        <symbol id="i-twitter" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M23 3a10.900 10.900 0 01-3.140 1.530 4.480 4.480 0 00-7.860 3v1A10.660 10.660 0 013 4s-4 9 5 13a11.640 11.640 0 01-7 2c9 5 20 0 20-11.500a4.500 4.500 0 00-.080-.830A7.720 7.720 0 0023 3z"
          />
        </symbol>

        <symbol id="i-linkedin" viewBox="0 0 24 24">
          <g fill="currentColor">
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </g>
        </symbol>

        <symbol id="i-rocket" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.500 16.500c-1.500 1.300-2 5-2 5s3.700-.5 5-2c.7-.8.700-2.100-.1-2.900a2.200 2.200 0 00-2.900-.1z" />
            <path d="M12 15l-3-3a22 22 0 012-4 12.900 12.900 0 0111-5c0 2.700-.8 7.500-5 11a22.400 22.400 0 01-4 2z" />
            <path d="M9 12H4s.6-3.100 2-4c1.600-1 5 0 5 0M12 15v5s3.100-.6 4-2c1-1.600 0-5 0-5" />
          </g>
        </symbol>

        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <path
            d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800L12 3zM19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="i-building" viewBox="0 0 24 24">
          <path
            d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 10h4a1 1 0 011 1v10M2 21h20M8 8h3M8 12h3M8 16h3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        {/* client logo marks */}
        <symbol id="l-altshift" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="8" cy="8" r="6.400" />
            <path d="M2.200 5.500h11.600M1.700 8h12.600M2.200 10.500h11.600" />
          </g>
        </symbol>

        <symbol id="l-bio" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.500" strokeLinecap="round">
            <path d="M3 13L7 3M6 14l4.500-11M9.500 14L13 5M12.500 13l1.200-3" />
          </g>
        </symbol>

        <symbol id="l-command" viewBox="0 0 16 16">
          <path
            fill="currentColor"
            d="M4 2h6a3.500 3.500 0 013.500 3.500V14H7a3.500 3.500 0 01-3.500-3.500V2.500A.5.500 0 014 2z"
          />
        </symbol>

        <symbol id="l-epic" viewBox="0 0 16 16">
          <g fill="currentColor">
            <path d="M5 2h9l-1 2.600H4zM4 6.700h8l-1 2.600H3zM3 11.400h7l-1 2.600H2z" />
          </g>
        </symbol>

        <symbol id="l-focal" viewBox="0 0 16 16">
          <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            <path d="M8 1.500v3M8 11.500v3M1.500 8h3M11.500 8h3M3.400 3.400l2.100 2.100M10.500 10.500l2.100 2.100M12.600 3.400l-2.100 2.100M5.500 10.500l-2.100 2.100M5 1.900l1 2.700M10 11.400l1 2.700M14.100 5l-2.700 1M4.600 10l-2.700 1M11 1.900l-1 2.700M6 11.400l-1 2.700M14.100 11l-2.700-1M4.600 6l-2.700-1" />
          </g>
          <circle cx="8" cy="8" r="1.700" fill="currentColor" />
        </symbol>

        <symbol id="l-galileo" viewBox="0 0 16 16">
          <g fill="currentColor">
            <path d="M8 2a6 6 0 010 12z" />
          </g>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
        </symbol>
      </defs>
    </svg>
  );
}

export default SvgSprite;
