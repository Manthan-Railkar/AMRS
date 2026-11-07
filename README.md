# AMRS — Adaptive Model Recovery System

[![CI](https://github.com/Manthan-Railkar/AMRS/actions/workflows/ci.yml/badge.svg)](https://github.com/Manthan-Railkar/AMRS/actions/workflows/ci.yml)

> **Intelligent Failure Diagnosis & Targeted Parameter Recovery for Machine Learning Models**

AMRS (Adaptive Model Recovery System) is an intelligent framework designed to diagnose degraded or underperforming machine learning models and execute targeted recovery techniques instead of defaulting to expensive and compute-intensive full retraining.

---

## Overview

When machine learning models encounter issues during or after training—such as validation divergence, loss spikes, or probability miscalibration—practitioners often resort to retraining from scratch. AMRS offers a principled alternative:

1. **Diagnose**: Pinpoints specific failure modes (overfitting, gradient shocks, calibration drift, covariate shift) using training telemetry, validation loss curves, and generalization metrics.
2. **Select**: Prioritizes targeted recovery strategies based on model architecture, prerequisite checks, and computational budget.
3. **Recover**: Applies localized parameter adjustments, weight interpolation, or statistical recalibration to a copy of the model while preserving learned features.
4. **Verify & Safeguard**: Evaluates the recovery candidate against strict acceptance criteria on a holdout verification set. Candidates that do not meet verification thresholds trigger an automatic rollback.

---

## Core Recovery Strategies

AMRS implements 6 targeted recovery mechanisms:

| Strategy | Description | Typical Use Case |
| :--- | :--- | :--- |
| **01 Checkpoint Reversion & Averaging** | Restores verified stable checkpoints and averages adjacent stationary states. | Training loss divergence, gradient shocks, non-convergent epochs. |
| **02 Weight Interpolation** | Blends parameter weights between compatible checkpoints along the optimization trajectory. | Exploring flatter minima and escaping sharp loss basins without retraining. |
| **03 BatchNorm Recalibration** | Recalculates running mean and variance statistics over updated input distributions without altering weights. | Mild covariate shift or degraded normalization metrics. |
| **04 Selective Fine-Tuning** | Selectively unfreezes and updates specific task-specific layers while freezing feature extractors. | Domain drift and performance degradation in higher-level representation layers. |
| **05 L2-SP Regularization** | Constrains parameter drift relative to reference weights ($L_2$-SP penalty) during fine-tuning. | Catastrophic forgetting mitigation and overfitting prevention. |
| **06 Temperature Scaling** | Optimizes a single scalar temperature parameter over logits via post-hoc validation. | Overconfident predictions and high Expected Calibration Error (ECE). |

---

## 4-Step Recovery Lifecycle

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  01. DIAGNOSE   │  ──▶  │   02. SELECT    │  ──▶  │   03. RECOVER   │  ──▶  │   04. VERIFY    │
│                 │       │                 │       │                 │       │                 │
│ Telemetry & Loss│       │ Strategy Tiering│       │ Non-Destructive │       │ Holdout Eval &  │
│ Curve Analysis  │       │ Cost Assessment │       │ Parameter Patch │       │ Rollback Safety │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **01 — Diagnose**: Analyzes model performance, validation loss trends, generalization gaps, and calibration errors to isolate the root cause.
2. **02 — Select**: Filters eligible recovery strategies, evaluating computational cost and architectural compatibility (e.g. PyTorch ResNet18, CNN, MLP).
3. **03 — Recover**: Modifies parameters on an isolated model fork, preserving representation knowledge.
4. **04 — Verify**: Tests against empirical holdout criteria. Promotes the candidate if verified, or reverts cleanly to the prior stable state.

---

## Reproducible Benchmark Scenarios

The AMRS showcase highlights verified empirical experiments across common failure archetypes:

- **Scenario S1 · Overfitting Recovery**:
  - *Architecture*: ResNet18 (CIFAR)
  - *Failure Mode*: Divergent validation loss & widening generalization gap.
  - *Recovery*: Checkpoint averaging and selective fine-tuning with $L_2$-SP regularization.
  - *Outcome*: Generalization restored without full retraining.
- **Scenario S2 · Calibration Recovery**:
  - *Architecture*: Vision Classifier
  - *Failure Mode*: Overconfident softmax probabilities with high ECE.
  - *Recovery*: Post-hoc temperature scaling.
  - *Outcome*: ECE minimized while strictly preserving top-1 accuracy.
- **Scenario S4 · Training Instability**:
  - *Architecture*: Deep Vision (PyTorch)
  - *Failure Mode*: Gradient shock and sudden loss explosion.
  - *Recovery*: Pre-shock checkpoint reversion and proximal weight averaging.
  - *Outcome*: Weight stability restored with holdout validation passing.

---

## Stack & Architecture

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with CSS variables, fluid responsive typography, and dark/light theme support
- **Animation & Physics**:
  - [GSAP](https://greensock.com/) + ScrollTrigger for scroll-driven word blur scrubs and morphing visual matrices
  - [Lenis](https://github.com/darkroomengineering/lenis) for smooth inertia scrolling synced with GSAP
  - [Framer Motion](https://www.framer.com/motion/) for interactive UI components and state transitions
- **Interactive Features**:
  - Dynamic interactive model diagnosis input with checkpoint upload simulations (`.pt`, `.pth`)
  - Drift physics with pointer tracking for ambient background canvas elements
  - Horizontal inertia drag carousel for workflow visualization with custom follower cursor
  - Scroll-clamped sticky travel animation for FAQ documentation
  - Multi-touch and drag-enabled experiment carousel with verification outcome badges
  - Flash-free persistent theme switching with `localStorage` sync

---

## Project Structure

```
amrs/
├── public/
│   └── assets/
│       ├── icons/              # Favicon and vector SVG icons
│       └── img/                # Gallery visual assets, strategy imagery, and architecture cards
├── src/
│   ├── app/
│   │   ├── globals.css         # Tailwind v4 configuration, theme tokens, and custom animation utilities
│   │   ├── layout.tsx          # Root layout, Inter font setup, theme initialization script
│   │   └── page.tsx            # Composition of all AMRS landing sections
│   ├── components/
│   │   ├── DragCursor.tsx      # Pointer-following drag cursor indicator
│   │   ├── SmoothScroll.tsx    # Lenis smooth-scroll provider synced with GSAP ScrollTrigger
│   │   ├── SvgSprite.tsx       # SVG vector sprite repository
│   │   ├── ThemeToggle.tsx     # Light/dark mode toggle button
│   │   └── sections/
│   │       ├── Nav.tsx         # Responsive navigation bar with mobile drawer
│   │       ├── Hero.tsx        # Hero with interactive diagnosis console and physics background
│   │       ├── Statement.tsx   # Word-split scroll-scrub typography effect
│   │       ├── Gallery.tsx     # Dynamic 4-row scroll-driven matrix
│   │       ├── Logos.tsx       # Tech stack badges (PyTorch, Python, FastAPI, Next.js, etc.)
│   │       ├── Steps.tsx       # 4-step recovery lifecycle horizontal track
│   │       ├── Presets.tsx     # 6 core model recovery strategies
│   │       ├── Performance.tsx # Comparative benchmark metrics & animated counters
│   │       ├── Testimonials.tsx# Reproducible experiment showcases (S1, S2, S4)
│   │       ├── Faq.tsx         # Scroll-pinned FAQ accordion with AMRS architectural details
│   │       └── Footer.tsx      # Platform links, repository info, and status indicators
│   └── data/
│       ├── charts.ts           # Performance benchmark categories & metrics
│       ├── faq.ts              # AMRS technical questions & answers
│       ├── footer.ts           # Footer navigation schema
│       ├── gallery.ts          # Matrix assets and aspect dimensions
│       ├── logos.ts            # Supported technology ecosystem entries
│       ├── presets.ts          # 6 recovery strategy definitions
│       ├── steps.ts            # 4-step recovery workflow descriptions
│       └── testimonials.ts     # Experiment scenario details (S1, S2, S4)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20+
- npm, pnpm, or yarn

### Installation

```bash
git clone https://github.com/Manthan-Railkar/AMRS.git
cd AMRS
npm install
```

### Development Server

Start the local development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Linting & Build

Run ESLint checks:

```bash
npm run lint
```

Build the production bundle:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
