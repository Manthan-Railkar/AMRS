'use client';

import React, { useEffect, useRef, useState } from 'react';

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const blobDarkRef = useRef<HTMLDivElement>(null);
  const blobVioletRef = useRef<HTMLDivElement>(null);
  const blobIndigoRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<string>('resnet18_cifar10_overfit.pt');
  const [architecture, setArchitecture] = useState<string>('resnet18_cifar');
  const [scenario, setScenario] = useState<string>('s1_overfit');
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready for holdout verification');
  const [caption, setCaption] = useState<string>(
    'Diagnose. Recover. Verify. Preserve what your model has learned.'
  );

  // Blob pointer drift animation (faithful port of main.js lines 70-129)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const hero = heroRef.current;
    const darkEl = blobDarkRef.current;
    const violetEl = blobVioletRef.current;
    const indigoEl = blobIndigoRef.current;
    if (!hero || !darkEl || !violetEl || !indigoEl) return;

    let W = hero.offsetWidth;
    let H = hero.offsetHeight;

    const state = {
      dark: { x: W * 0.58, y: H * 0.5 },
      violet: { x: W * 0.7, y: H * 0.72 },
      indigo: { x: W * 0.2, y: H * 0.55 },
    };

    const pointer = { x: 0, y: 0, active: false, last: 0 };
    let isVisible = true;
    let rafId: number;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const resizeObserver = new ResizeObserver(() => {
      if (!hero) return;
      W = hero.offsetWidth;
      H = hero.offsetHeight;
    });
    resizeObserver.observe(hero);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(hero);

    const onPointerMove = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      pointer.last = performance.now();
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    hero.addEventListener('pointermove', onPointerMove);
    hero.addEventListener('pointerleave', onPointerLeave);

    const tick = (t: number) => {
      if (isVisible) {
        const follow = pointer.active && t - pointer.last < 2500;
        const mix = follow ? 0.7 : 0;

        // Dark blob
        const darkTargetX = lerp(W * 0.56 + Math.sin(t * 0.00042) * W * 0.2, pointer.x, mix);
        const darkTargetY = lerp(H * 0.5 + Math.cos(t * 0.00033) * H * 0.16, pointer.y, mix);
        state.dark.x = lerp(state.dark.x, darkTargetX, 0.035);
        state.dark.y = lerp(state.dark.y, darkTargetY, 0.035);
        const darkRot = t * 0.006;
        const darkSx = 1 + 0.2 * Math.sin(t * 0.0007);
        const darkSy = 1 + 0.2 * Math.cos(t * 0.0006);
        darkEl.style.transform = `translate3d(${state.dark.x - darkEl.offsetWidth / 2}px, ${
          state.dark.y - darkEl.offsetHeight / 2
        }px, 0) rotate(${darkRot}deg) scale(${darkSx}, ${darkSy})`;

        // Violet blob
        const violetTargetX = lerp(W * 0.68 + Math.cos(t * 0.00031) * W * 0.18, pointer.x + W * 0.08, mix * 0.55);
        const violetTargetY = lerp(H * 0.7 + Math.sin(t * 0.00046) * H * 0.12, pointer.y + H * 0.14, mix * 0.55);
        state.violet.x = lerp(state.violet.x, violetTargetX, 0.0245);
        state.violet.y = lerp(state.violet.y, violetTargetY, 0.0245);
        const violetRot = -t * 0.004;
        const violetSx = 1 + 0.15 * Math.cos(t * 0.0005);
        const violetSy = 1 + 0.15 * Math.sin(t * 0.0008);
        violetEl.style.transform = `translate3d(${state.violet.x - violetEl.offsetWidth / 2}px, ${
          state.violet.y - violetEl.offsetHeight / 2
        }px, 0) rotate(${violetRot}deg) scale(${violetSx}, ${violetSy})`;

        // Indigo blob
        const indigoTargetX = lerp(W * 0.22 + Math.sin(t * 0.00025) * W * 0.14, pointer.x - W * 0.12, mix * 0.35);
        const indigoTargetY = lerp(H * 0.56 + Math.cos(t * 0.00029) * H * 0.1, pointer.y + H * 0.05, mix * 0.35);
        state.indigo.x = lerp(state.indigo.x, indigoTargetX, 0.0175);
        state.indigo.y = lerp(state.indigo.y, indigoTargetY, 0.0175);
        const indigoSx = 1 + 0.1 * Math.sin(t * 0.0004);
        indigoEl.style.transform = `translate3d(${state.indigo.x - indigoEl.offsetWidth / 2}px, ${
          state.indigo.y - indigoEl.offsetHeight / 2
        }px, 0) scale(${indigoSx}, 1)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
      setStatusMessage(`Model uploaded: ${file.name}`);
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setIsBusy(true);
    setStatusMessage('Inspecting PyTorch weights & architecture…');
    setCaption('Analyzing model performance across validation & holdout splits…');

    setTimeout(() => {
      setStatusMessage('Diagnosis: Overfitting detected (train-val gap: +14.2%)');

      setTimeout(() => {
        setStatusMessage('Evaluating cheapest recovery: Checkpoint Averaging + L2-SP…');

        setTimeout(() => {
          setIsBusy(false);
          setStatusMessage('Gate: ACCEPTED (+4.8% holdout accuracy, 0 regression)');
          setCaption('Diagnose. Recover. Verify. Preserve what your model has learned.');
        }, 1200);
      }, 1100);
    }, 1000);
  };

  return (
    <section ref={heroRef} className="hero" id="quick-start" aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden="true">
        <div ref={blobIndigoRef} className="blob blob--indigo" />
        <div ref={blobDarkRef} className="blob blob--dark" />
        <div ref={blobVioletRef} className="blob blob--violet" />
      </div>

      <div className="hero__col">
        <h1 className="hero__title" id="hero-title" data-in style={{ '--i': 2 } as React.CSSProperties}>
          Your AI Models Deserve a <em>Second Chance</em>.
        </h1>

        <p className="hero__subheading" data-in style={{ '--i': 3 } as React.CSSProperties}>
          Diagnose underperforming machine learning models, discover intelligent recovery strategies, and restore model performance without starting from scratch.
        </p>

        <div className="hero__actions" data-in style={{ '--i': 4 } as React.CSSProperties}>
          <a href="#quick-start" className="hero__btn-primary">
            Start Model Recovery
          </a>
          <a href="#features" className="hero__btn-secondary">
            Explore How It Works
          </a>
        </div>

        {/* Model Recovery Quick-Start Panel */}
        <form
          className="recovery-panel"
          onSubmit={handleAnalyze}
          data-in
          style={{ '--i': 5 } as React.CSSProperties}
          noValidate
        >
          {/* 1. Upload your trained PyTorch model */}
          <div className="recovery-panel__row">
            <div className="recovery-panel__label">
              <span>Upload your trained PyTorch model</span>
              <span className="recovery-panel__badge">weights_only=True</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pt,.pth"
              className="sr-only"
              onChange={handleFileChange}
              id="model-file-input"
            />
            <div
              className="recovery-upload"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload your trained PyTorch model"
            >
              <div className="recovery-upload__info">
                <svg aria-hidden="true">
                  <use href="#i-clip" />
                </svg>
                <span>{uploadedFile}</span>
              </div>
              <span className="recovery-upload__btn">Browse file</span>
            </div>
          </div>

          {/* 2. Select model architecture */}
          <div className="recovery-panel__row">
            <div className="recovery-panel__label">
              <span>Select model architecture</span>
              <span className="recovery-panel__badge">Registry</span>
            </div>
            <div className="recovery-pills" role="radiogroup" aria-label="Select model architecture">
              {[
                { id: 'resnet18_cifar', label: 'ResNet-18 (CIFAR)' },
                { id: 'small_cnn', label: 'Small CNN' },
                { id: 'mlp_small', label: 'MLP Small' },
                { id: 'custom', label: 'Custom Architecture' },
              ].map((arch) => (
                <button
                  key={arch.id}
                  type="button"
                  className={`recovery-pill ${architecture === arch.id ? 'is-active' : ''}`}
                  role="radio"
                  aria-checked={architecture === arch.id}
                  onClick={() => setArchitecture(arch.id)}
                >
                  {arch.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Choose recovery scenario */}
          <div className="recovery-panel__row">
            <div className="recovery-panel__label">
              <span>Choose recovery scenario</span>
              <span className="recovery-panel__badge">Benchmark Zoo</span>
            </div>
            <div className="recovery-pills" role="radiogroup" aria-label="Choose recovery scenario">
              {[
                { id: 's1_overfit', label: 'Overfitting (S1)' },
                { id: 's2_miscalibration', label: 'Miscalibration (S2)' },
                { id: 's3_bndrift', label: 'BN Drift (S3)' },
                { id: 's4_unstable', label: 'Unstable Training (S4)' },
                { id: 's5_degraded_head', label: 'Degraded Head (S5)' },
                { id: 'auto', label: 'Auto-Diagnose' },
              ].map((scen) => (
                <button
                  key={scen.id}
                  type="button"
                  className={`recovery-pill ${scenario === scen.id ? 'is-active' : ''}`}
                  role="radio"
                  aria-checked={scenario === scen.id}
                  onClick={() => setScenario(scen.id)}
                >
                  {scen.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Analyze model performance */}
          <div className="recovery-panel__row">
            <div className="recovery-panel__label">
              <span>Analyze model performance</span>
              <span className="recovery-panel__badge">Holdout Gate</span>
            </div>
            <div className="recovery-perf">
              <div className="recovery-perf__metrics">
                <span className="recovery-perf__stat">
                  <span>Verification:</span>
                  <strong>Paired Bootstrap (95% CI)</strong>
                </span>
                <span className="recovery-perf__stat">
                  <span>Retention Target:</span>
                  <strong>≥ 95% Knowledge</strong>
                </span>
                <span className="recovery-perf__stat">
                  <span>Cost Ceiling:</span>
                  <strong>&lt; 0.5× Full Retrain</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Panel footer with action button */}
          <div className="recovery-panel__foot">
            <div className="recovery-panel__status" aria-live="polite">
              {statusMessage}
            </div>
            <button
              type="submit"
              className="recovery-submit-btn"
              disabled={isBusy}
              aria-label="Analyze My Model"
            >
              <span>{isBusy ? 'Analyzing Model…' : 'Analyze My Model'}</span>
              <svg aria-hidden="true">
                <use href="#i-arrow-right" />
              </svg>
            </button>
          </div>
        </form>

        <p className="hero__caption" id="prompt-caption" data-in style={{ '--i': 6 } as React.CSSProperties}>
          {caption}
        </p>
      </div>

      <div className="hero__foot" data-in style={{ '--i': 7 } as React.CSSProperties}>
        <p>Diagnose. Recover. Verify. Preserve what your model has learned.</p>
        <a className="scroll-cue" href="#statement" aria-label="Scroll down">
          <svg aria-hidden="true">
            <use href="#i-arrow-down" />
          </svg>
        </a>
      </div>
    </section>
  );
}

export default Hero;
