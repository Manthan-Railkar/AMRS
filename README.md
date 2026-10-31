# AMRS

AMRS automates the diagnosis and recovery of underperforming ML models by identifying failures, selecting adaptive recovery strategies, applying targeted updates, and verifying improvements with automatic rollback—reducing retraining costs while preserving learned knowledge.

---

## Next.js + Tailwind CSS + React Bits Hyperspeed

This project includes:
- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4)
- **3D Graphics**: [Three.js](https://threejs.org/) shaders
- **Components**: [React Bits](https://reactbits.dev/) `<Hyperspeed />` component
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Linting**: [ESLint](https://eslint.org/)

### Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Hyperspeed Component Usage

```tsx
import Hyperspeed from '@/components/Hyperspeed';

<div style={{ position: 'relative', width: '100%', height: 600 }}>
  <Hyperspeed
    curve="winding"
    curvature={1}
    speed={1}
    boost={3}
    fov={90}
    boostFov={130}
    lanes={3}
    roadWidth={10}
    medianWidth={2}
    density={40}
    trailLength={1}
    lightSize={1}
    poles={20}
    dust={100}
    glow={0.6}
    reflections={0.5}
    roadOpacity={0.1}
    steer={0.35}
    tailColors={['#d856bf', '#6750a2', '#c247ac']}
    headColors={['#03b3c3', '#0e5ea5', '#324555']}
    poleColors={['#03b3c3']}
    interactive
  />
</div>
```

### Project Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Builds the production application.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code issues.

### Directory Structure

```text
├── src/
│   ├── app/
│   │   ├── globals.css           # Tailwind CSS imports & theme styling
│   │   ├── layout.tsx            # Root application layout and font config
│   │   └── page.tsx              # Landing page featuring Hyperspeed
│   └── components/
│       ├── Hyperspeed/
│       │   ├── Hyperspeed.tsx    # Three.js 3D light-trail component
│       │   ├── Hyperspeed.css    # Full-bleed canvas styling
│       │   └── index.ts          # Module export
│       ├── HyperspeedShowcase.tsx# Interactive preset & boost controls
│       └── InteractiveDemo.tsx   # Client component with state & tabs
├── public/                       # Static assets
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```
