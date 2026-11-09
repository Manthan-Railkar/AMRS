'use client';

import React, { useEffect, useRef, useState } from 'react';

const PLACEHOLDER_PHRASES = [
  "Describe your model's performance issue or upload a trained model...",
  "ResNet-18 accuracy degraded by 14% after distribution shift...",
  "BatchNorm running statistics drifting across validation batches...",
  "Validation loss diverging after epoch 40 due to learning rate...",
  "Classifier outputs overconfident with high calibration error (ECE)...",
  "Upload a PyTorch model (.pt) to auto-diagnose and restore performance...",
];

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const blobDarkRef = useRef<HTMLDivElement>(null);
  const blobVioletRef = useRef<HTMLDivElement>(null);
  const blobIndigoRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [promptValue, setPromptValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>(['Diagnose', 'Recover']);
  const [caption, setCaption] = useState(
    'Supports PyTorch models · Intelligent diagnosis · Verified recovery'
  );

  const [placeholderText, setPlaceholderText] = useState(PLACEHOLDER_PHRASES[0]);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect for typewriter placeholder
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typewriter animation cycle across model diagnostic prompts
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let phraseIndex = 0;
    let charIndex = PLACEHOLDER_PHRASES[0].length;
    let isDeleting = true;
    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      const currentPhrase = PLACEHOLDER_PHRASES[phraseIndex];

      if (isDeleting) {
        charIndex -= 1;
        setPlaceholderText(currentPhrase.substring(0, charIndex));

        if (charIndex <= 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % PLACEHOLDER_PHRASES.length;
          timeoutId = setTimeout(tick, 450);
          return;
        }
        timeoutId = setTimeout(tick, 25);
      } else {
        charIndex += 1;
        setPlaceholderText(currentPhrase.substring(0, charIndex));

        if (charIndex >= currentPhrase.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, 2400);
          return;
        }
        timeoutId = setTimeout(tick, 45);
      }
    };

    // Initial delay before starting deletion of the first placeholder
    timeoutId = setTimeout(tick, 2800);

    return () => clearTimeout(timeoutId);
  }, []);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
      setCaption(`Uploaded ${file.name} · Ready for diagnosis`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setIsBusy(true);
    setCaption('AMRS is diagnosing model failure mode…');

    setTimeout(() => {
      setCaption('Testing candidate strategies: Checkpoint Averaging + L2-SP…');

      setTimeout(() => {
        setIsBusy(false);
        setPromptValue('');
        setCaption('Holdout verification passed: +4.8% accuracy gain (0 regression)');

        setTimeout(() => {
          setCaption('Supports PyTorch models · Intelligent diagnosis · Verified recovery');
        }, 3200);
      }, 1600);
    }, 1400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <section ref={heroRef} className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden="true">
        <div ref={blobIndigoRef} className="blob blob--indigo" />
        <div ref={blobDarkRef} className="blob blob--dark" />
        <div ref={blobVioletRef} className="blob blob--violet" />
      </div>

      <div className="hero__col">
        <h1 className="hero__title" id="hero-title" data-in style={{ '--i': 2 } as React.CSSProperties}>
          Your AI Models Deserve a<br />
          <em>Second Chance.</em>
        </h1>

        <div className="hero__actions" data-in style={{ '--i': 3 } as React.CSSProperties}>
          <a href="#prompt-form" className="hero__btn-primary">
            Start Recovering →
          </a>
          <a href="#features" className="hero__btn-secondary">
            Explore AMRS
          </a>
        </div>

        <form
          className={`prompt ${isBusy ? 'is-busy' : ''}`}
          id="prompt-form"
          onSubmit={handleSubmit}
          data-in
          style={{ '--i': 4 } as React.CSSProperties}
          noValidate
        >
          <label className="sr-only" htmlFor="prompt">
            Describe your model&apos;s performance issue or upload a trained model...
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={2}
            placeholder={`${placeholderText}${cursorVisible ? '|' : ' '}`}
            autoComplete="off"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <input
            type="file"
            ref={fileInputRef}
            accept=".pt,.pth"
            className="sr-only"
            onChange={handleFileChange}
            id="hero-file-upload"
          />

          <div className="prompt__bar">
            <div className="prompt__left">
              <button
                className="pill"
                type="button"
                aria-label="Upload Model"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg aria-hidden="true">
                  <use href="#i-clip" />
                </svg>
                <span>{uploadedFile ? uploadedFile : 'Upload Model'}</span>
              </button>

              <button
                className="pill"
                type="button"
                aria-pressed={activeTags.includes('Diagnose')}
                onClick={() => toggleTag('Diagnose')}
              >
                <svg aria-hidden="true">
                  <use href="#i-bulb" />
                </svg>
                <span>Diagnose</span>
              </button>

              <button
                className="pill"
                type="button"
                aria-pressed={activeTags.includes('Recover')}
                onClick={() => toggleTag('Recover')}
              >
                <svg aria-hidden="true">
                  <use href="#i-pen" />
                </svg>
                <span>Recover</span>
              </button>

              <button
                className="pill"
                type="button"
                aria-pressed={activeTags.includes('Optimize')}
                onClick={() => toggleTag('Optimize')}
              >
                <svg aria-hidden="true">
                  <use href="#i-sparkle" />
                </svg>
                <span>Optimize</span>
              </button>

              <button
                className="pill"
                type="button"
                aria-pressed={activeTags.includes('Verify')}
                onClick={() => toggleTag('Verify')}
              >
                <svg aria-hidden="true">
                  <use href="#i-check" />
                </svg>
                <span>Verify</span>
              </button>
            </div>

            <div className="prompt__right">
              <button
                className="action-btn"
                type="submit"
                aria-label="Analyze Model"
                disabled={isBusy}
              >
                <span>Analyze Model</span>
                <svg aria-hidden="true">
                  <use href="#i-arrow-right" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        <p className="hero__caption" id="prompt-caption" data-in style={{ '--i': 5 } as React.CSSProperties}>
          {caption}
        </p>
      </div>

      <div className="hero__foot" data-in style={{ '--i': 6 } as React.CSSProperties}>
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
