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

        <symbol id="i-github" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
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

        {/* technology logo marks */}
        <symbol id="l-python" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M11.914 0C5.82 0 6.2 2.645 6.2 2.645l.006 2.738h5.814v.825H3.882s-3.882.44-3.882 6.305c0 5.867 3.39 5.674 3.39 5.674h2.024v-2.836s-.11-3.39 3.33-3.39h5.717s3.226.052 3.226-3.14V3.14S18.064 0 11.914 0zM8.7 1.705a1.01 1.01 0 1 1 0 2.02 1.01 1.01 0 0 1 0-2.02zm3.386 22.295c6.094 0 5.714-2.645 5.714-2.645l-.006-2.738H11.98v-.825h8.138s3.882-.44 3.882-6.305c0-5.867-3.39-5.674-3.39-5.674h-2.024v2.836s.11 3.39-3.33 3.39H9.539s-3.226-.052-3.226 3.14v5.674s-.377 3.14 5.773 3.14zm3.214-1.705a1.01 1.01 0 1 1 0-2.02 1.01 1.01 0 0 1 0 2.02z"
          />
        </symbol>

        <symbol id="l-pytorch" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.784 0a10.87 10.87 0 0 0-4.04 1.258 10.37 10.37 0 0 0-3.666 3.666 10.87 10.87 0 0 0-1.258 4.04 8.78 8.78 0 0 1 1.745-.733c.87-.245 1.767-.348 2.662-.307.253-1.63.957-3.144 2.037-4.322a8.55 8.55 0 0 1 4.24-2.457 2.09 2.09 0 0 0-.256-.475 2.15 2.15 0 0 0-1.464-.67zm2.937 1.954a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zm-1.895 4.887a7.73 7.73 0 0 0-5.024 2.872 7.82 7.82 0 0 0-1.47 5.568 7.75 7.75 0 0 0 3.01 5.08 7.82 7.82 0 0 0 5.64 1.34 7.75 7.75 0 0 0 5.08-3.01 7.82 7.82 0 0 0 1.34-5.64 7.75 7.75 0 0 0-2.87-5.024l-.396.396a7.19 7.19 0 0 1 2.65 4.636c.15 1.72-.41 3.42-1.57 4.7a7.19 7.19 0 0 1-4.7 2.65 7.19 7.19 0 0 1-5.21-1.24 7.19 7.19 0 0 1-2.77-4.68 7.19 7.19 0 0 1 1.35-5.18 7.19 7.19 0 0 1 4.63-2.65l-.65-.455z"
          />
        </symbol>

        <symbol id="l-fastapi" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.82 2.164a9.836 9.836 0 1 1-1.64 0zm-.92 2.455v7.262H7.28l6.098 7.498v-7.262h4.621z"
          />
        </symbol>

        <symbol id="l-nextjs" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.82 17.52L10.3 7.82h-2.1v8.36h1.76v-5.96l6.24 8.24c-.45.36-.93.68-1.44.96l3.06-1.9zm-.06-9.7h-1.76v6.4l1.76 2.32V7.82z"
          />
        </symbol>

        <symbol id="l-typescript" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M1.5 0h21A1.5 1.5 0 0 1 24 1.5v21a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 0 22.5v-21A1.5 1.5 0 0 1 1.5 0zm10.74 13.55h-2.92v6.92H7.1v-6.92H4.18V11.3h8.06v2.25zm8.9 2.53c0-2.4-1.39-3.48-3.92-4.04-.98-.22-1.76-.44-1.76-.98 0-.48.42-.76 1.14-.76.84 0 1.72.34 2.38.86l1.08-1.72c-.88-.7-2.06-1.04-3.46-1.04-2.4 0-3.94 1.34-3.94 3.36 0 2.22 1.34 3.28 3.82 3.86 1.08.26 1.86.5 1.86 1.1 0 .54-.52.88-1.34.88-1.06 0-2.12-.44-2.96-1.08l-1.12 1.76c1.04.82 2.48 1.28 4.08 1.28 2.68 0 4.16-1.4 4.16-3.48z"
          />
        </symbol>

        <symbol id="l-tailwindcss" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.336 6.182 14.975 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.336 13.382 8.975 12 6.001 12z"
          />
        </symbol>

        <symbol id="l-numpy" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 2L2 7.7v8.6L12 22l10-5.7V7.7L12 2zm-1.1 2.2v4.8L4.2 13v-3.7l6.7-5.1zm2.2 0l6.7 5.1V13l-6.7-4V4.2zM3.4 14.8l7.5 4.3v-4.4L3.4 10.4v4.4zm17.2 0l-7.5-4.3v4.4l7.5 4.3v-4.4z"
          />
        </symbol>

        <symbol id="l-scikitlearn" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M15.5 2a6.5 6.5 0 0 0-5.2 10.4A6.5 6.5 0 1 0 15.5 2zm-7 10a4.5 4.5 0 1 1 4.5-4.5 4.5 4.5 0 0 1-4.5 4.5zm7-2a4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 1 1-4.5-4.5z"
          />
        </symbol>

        <symbol id="l-plotly" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M3 21h18v-2H3v2zm1-4h3V9H4v8zm5 0h3V3H9v14zm5 0h3v-6h-3v6zm5 0h3v-10h-3v10z"
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
