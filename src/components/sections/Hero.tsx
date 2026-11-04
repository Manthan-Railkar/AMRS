'use client';

import React, { useEffect, useRef, useState } from 'react';

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const blobDarkRef = useRef<HTMLDivElement>(null);
  const blobVioletRef = useRef<HTMLDivElement>(null);
  const blobIndigoRef = useRef<HTMLDivElement>(null);

  const [promptValue, setPromptValue] = useState('');
  const [caption, setCaption] = useState('Kraft can make mistakes, but learns from them.');
  const [isBusy, setIsBusy] = useState(false);
  const [reasoningActive, setReasoningActive] = useState(false);
  const [createDesignActive, setCreateDesignActive] = useState(false);
  const [wireframeActive, setWireframeActive] = useState(false);

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
        darkEl.style.transform = `translate3d(${state.dark.x - darkEl.offsetWidth / 2}px, ${state.dark.y - darkEl.offsetHeight / 2
          }px, 0) rotate(${darkRot}deg) scale(${darkSx}, ${darkSy})`;

        // Violet blob
        const violetTargetX = lerp(W * 0.68 + Math.cos(t * 0.00031) * W * 0.18, pointer.x + W * 0.08, mix * 0.55);
        const violetTargetY = lerp(H * 0.7 + Math.sin(t * 0.00046) * H * 0.12, pointer.y + H * 0.14, mix * 0.55);
        state.violet.x = lerp(state.violet.x, violetTargetX, 0.0245);
        state.violet.y = lerp(state.violet.y, violetTargetY, 0.0245);
        const violetRot = -t * 0.004;
        const violetSx = 1 + 0.15 * Math.cos(t * 0.0005);
        const violetSy = 1 + 0.15 * Math.sin(t * 0.0008);
        violetEl.style.transform = `translate3d(${state.violet.x - violetEl.offsetWidth / 2}px, ${state.violet.y - violetEl.offsetHeight / 2
          }px, 0) rotate(${violetRot}deg) scale(${violetSx}, ${violetSy})`;

        // Indigo blob
        const indigoTargetX = lerp(W * 0.22 + Math.sin(t * 0.00025) * W * 0.14, pointer.x - W * 0.12, mix * 0.35);
        const indigoTargetY = lerp(H * 0.56 + Math.cos(t * 0.00029) * H * 0.1, pointer.y + H * 0.05, mix * 0.35);
        state.indigo.x = lerp(state.indigo.x, indigoTargetX, 0.0175);
        state.indigo.y = lerp(state.indigo.y, indigoTargetY, 0.0175);
        const indigoSx = 1 + 0.1 * Math.sin(t * 0.0004);
        indigoEl.style.transform = `translate3d(${state.indigo.x - indigoEl.offsetWidth / 2}px, ${state.indigo.y - indigoEl.offsetHeight / 2
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptValue.trim() || isBusy) return;

    setIsBusy(true);
    setCaption('Kraft is thinking…');

    setTimeout(() => {
      setPromptValue('');
      setIsBusy(false);
      setCaption('Demo only — this prompt box is not connected to a model.');

      setTimeout(() => {
        setCaption('Kraft can make mistakes, but learns from them.');
      }, 2600);
    }, 1400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <section ref={heroRef} className="hero" aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden="true">
        <div ref={blobIndigoRef} className="blob blob--indigo" />
        <div ref={blobDarkRef} className="blob blob--dark" />
        <div ref={blobVioletRef} className="blob blob--violet" />
      </div>

      <div className="hero__col">
        <h1 className="hero__title" id="hero-title" data-in style={{ '--i': 2 } as React.CSSProperties}>
          Design with AI —<br />
          the <em>future</em> of creativity
        </h1>

        <form
          className={`prompt ${isBusy ? 'is-busy' : ''}`}
          id="prompt-form"
          onSubmit={handleSubmit}
          data-in
          style={{ '--i': 4 } as React.CSSProperties}
          noValidate
        >
          <label className="sr-only" htmlFor="prompt">
            Describe what you want to design
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={2}
            placeholder="Ask Kraft anything..."
            autoComplete="off"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="prompt__bar">
            <div className="prompt__left">
              <button className="icon-btn" type="button" aria-label="Attach file">
                <svg aria-hidden="true">
                  <use href="#i-clip" />
                </svg>
              </button>

              <button
                className="icon-btn chip-reason"
                type="button"
                aria-pressed={reasoningActive}
                onClick={() => setReasoningActive(!reasoningActive)}
              >
                <svg aria-hidden="true">
                  <use href="#i-bulb" />
                </svg>
                <span className="chip-reason__label">Reasoning</span>
              </button>

              <button
                className="pill"
                type="button"
                aria-pressed={createDesignActive}
                onClick={() => setCreateDesignActive(!createDesignActive)}
              >
                <svg aria-hidden="true">
                  <use href="#i-pen" />
                </svg>
                Create Design
              </button>

              <button
                className="pill"
                type="button"
                aria-pressed={wireframeActive}
                onClick={() => setWireframeActive(!wireframeActive)}
              >
                <svg aria-hidden="true">
                  <use href="#i-layout" />
                </svg>
                Wireframe
              </button>
            </div>

            <div className="prompt__right">
              <button className="icon-btn" type="button" aria-label="Voice input">
                <svg aria-hidden="true">
                  <use href="#i-mic" />
                </svg>
              </button>
              <button
                className="send-btn"
                type="submit"
                aria-label="Send"
                disabled={!promptValue.trim() || isBusy}
              >
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
        <p>Kraft uses advanced AI to transform your ideas into stunning designs. Just describe what you need.</p>
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