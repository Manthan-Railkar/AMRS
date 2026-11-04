import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SvgSprite from '@/components/SvgSprite';
import SmoothScroll from '@/components/SmoothScroll';
import DragCursor from '@/components/DragCursor';
import ThemeToggle from '@/components/ThemeToggle';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Kraft — AI-powered design for everyone',
  description:
    'Turn simple descriptions into complete, editable designs. Kraft is the AI design workspace that keeps your brand consistent from first prompt to production.',
  icons: {
    icon: '/assets/icons/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled theme on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('kraft-theme');
                  var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <SvgSprite />
        <SmoothScroll>
          {children}
        </SmoothScroll>
        <ThemeToggle />
        <DragCursor />
      </body>
    </html>
  );
}
