# Kraft — AI-Powered Design Landing Page

A 1:1 port of the vanilla Kraft AI SaaS landing page into **Next.js 15 (App Router, TypeScript)** + **Tailwind CSS v4** + **GSAP (ScrollTrigger)** + **Framer Motion** + **Lenis**.

---

## Stack & Architecture

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@theme` token mappings and persistent dark theme (`[data-theme="dark"]`).
- **Typography**: Inter via `next/font/google` (`--font-inter`).
- **Smooth Scroll**: [Lenis](https://github.com/darkroomengineering/lenis) via a client `<SmoothScroll />` provider synchronized with GSAP ScrollTrigger ticker and anchor navigation.
- **Scroll Animations**: [GSAP](https://greensock.com/) + ScrollTrigger for scroll-linked effects (statement blur/fade scrub, gallery morph).
- **Motion & UI State**: [Framer Motion](https://www.framer.com/motion/) for micro-interactions, responsive carousel slider, and accordion state.
- **Image Optimization**: `next/image` with responsive dimensions and WebP/AVIF support.
- **Accessibility**: Full keyboard navigation, `aria-expanded`, `aria-controls`, `aria-roledescription`, focus management, and `prefers-reduced-motion` compliance.

---

## Project Structure

```
├── public/
│   └── assets/
│       ├── icons/        # Favicon and vector assets
│       └── img/          # Gallery, preset, step, and avatar images
├── src/
│   ├── app/
│   │   ├── globals.css   # Tailwind v4 import, @theme tokens, layout & responsive styles
│   │   ├── layout.tsx    # Root layout, Inter font, flash-free theme script, layout providers
│   │   └── page.tsx      # Main landing page composed of section components
│   ├── components/
│   │   ├── DragCursor.tsx       # Custom pointer-following "Drag" cursor for steps
│   │   ├── SmoothScroll.tsx     # Lenis provider synced with GSAP ScrollTrigger
│   │   ├── SvgSprite.tsx        # Vector icon sprite symbols
│   │   ├── ThemeToggle.tsx      # Persistent dark/light theme switch
│   │   └── sections/
│   │       ├── Nav.tsx          # Sticky navigation & slide-down mobile menu
│   │       ├── Hero.tsx         # Staggered blur-rise load-in, 3 drifting blobs, prompt box
│   │       ├── Statement.tsx    # Word-split scroll-linked blur & fade-out scrub
│   │       ├── Gallery.tsx      # 4-row scroll-driven morph (gap 98→265 / 98→24, side 450→300)
│   │       ├── Logos.tsx        # Customer logo pill grid
│   │       ├── Steps.tsx        # Draggable horizontal workflow carousel with inertia
│   │       ├── Presets.tsx      # Pre-built design presets with hover zoom
│   │       ├── Performance.tsx  # Benchmark metrics with animated bar widths & count-up
│   │       ├── Testimonials.tsx # Touch, mouse-drag, and arrow/dot testimonial slider
│   │       ├── Pricing.tsx      # Starter, Pro (popular badge), Enterprise plans
│   │       ├── Faq.tsx          # Single-open accordion with height & blur transition
│   │       ├── Cta.tsx          # Early access waitlist card with email validation
│   │       └── Footer.tsx       # Multi-column footer links and large SVG KRAFT wordmark
│   └── data/
│       ├── charts.ts        # Performance benchmark categories & metrics
│       ├── faq.ts           # Frequently asked questions & answers
│       ├── footer.ts        # Footer navigation links & social icons
│       ├── gallery.ts       # 4 rows of 12 gallery images with aspect dimensions
│       ├── logos.ts         # Partner and client logo definitions
│       ├── plans.ts         # Subscription plans, feature checklists, and pricing
│       ├── presets.ts       # Template cards and image references
│       ├── steps.ts         # 4-step workflow details
│       └── testimonials.ts  # Customer reviews, quotes, avatars, and metrics
```

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development Server

Start the Next.js development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Linting

Run ESLint checks:

```bash
npm run lint
```

Build the optimized static export / production bundle:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

---

## Effects & Interactions Implemented

- **Hero**: Staggered blur-rise load-in; 3 pointer-tracking organic blurred gradient blobs drifting with lerp physics; interactive prompt box with pills and reasoning toggle.
- **Statement**: Text split into individual words with scroll-linked blur and fade-out based on viewport distance.
- **Gallery**: Scroll-driven morphing grid with precise gap changes (`98px` → `265px` below center, `98px` → `24px` above) and side image scaling (`450px` → `300px`).
- **Steps**: Draggable horizontal carousel with pointer velocity tracking and inertia, paired with an interactive custom "Drag" follower cursor.
- **Performance**: Animated benchmark bars filling up with easing and staggered number count-up.
- **Testimonials**: Interactive slider with touch swipe, mouse drag, arrow buttons, dot navigation, and active lavender card accent.
- **FAQ**: Accessible single-open accordion with smooth height expansion and text blur reveal.
- **Theme Toggle**: Fast, flash-free light/dark theme switcher stored in `localStorage` and synchronized across tabs.
- **Waitlist Form**: Reactive email validation regex with error feedback and submission state.
