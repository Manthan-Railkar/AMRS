"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import BlurText from "./BlurText";

export interface SlideItem {
  lines: [string, string];
  image: string;
  alt: string;
  gradient: string;
}

const SLIDES: SlideItem[] = [
  {
    lines: ["Intelligent Diagnosis,", "Targeted Parameter Repair"],
    image: "/assets/img/stock-neural-1.jpg",
    alt: "AI Neural Network Synapses and Failure Diagnosis",
    gradient:
      "radial-gradient(circle at 50% 40%, rgba(59, 130, 246, 0.18) 0%, rgba(13, 9, 26, 0.35) 60%, rgba(13, 9, 26, 0.92) 100%)",
  },
  {
    lines: ["Self-Healing AI,", "Zero Retraining Downtime"],
    image: "/assets/img/stock-neural-2.jpg",
    alt: "Synaptic Energy Flow and Adaptive Weight Recovery",
    gradient:
      "radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.22) 0%, rgba(13, 9, 26, 0.35) 60%, rgba(13, 9, 26, 0.92) 100%)",
  },
  {
    lines: ["Empirical Verification,", "Safe Automatic Rollbacks"],
    image: "/assets/img/stock-neural-3.jpg",
    alt: "Deep Tech Model Architecture and Cyber Infrastructure",
    gradient:
      "radial-gradient(circle at 50% 40%, rgba(45, 212, 191, 0.16) 0%, rgba(13, 9, 26, 0.4) 60%, rgba(13, 9, 26, 0.92) 100%)",
  },
];

const DURATION = 5.5; // seconds per slide

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);

  useEffect(() => {
    const el = fills.current[index];
    if (!el) return;
    gsap.set(fills.current, { scaleX: 0 });
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(el, { scaleX: 1 });
      return;
    }
    const tween = gsap.fromTo(
      el,
      { scaleX: 0 },
      { scaleX: 1, duration: DURATION, ease: "none", onComplete: next }
    );
    return () => {
      tween.kill();
    };
  }, [index, next]);

  const currentSlide = SLIDES[index];

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[20px] bg-[#0c0818]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Slide Visual Background - Immersive High-Res Stock Photography */}
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src={currentSlide.image}
              alt={currentSlide.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center filter brightness-[0.88] contrast-[1.08] saturate-[1.12]"
            />
            {/* Subtle atmospheric vignette / color wash matching slide tone */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-multiply"
              style={{ background: currentSlide.gradient }}
            />
            {/* Dark gradient for text & indicator readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0818] via-[#0c0818]/50 to-[#0c0818]/25 pointer-events-none" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Caption with BlurText */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[108px] sm:bottom-[118px] z-20 text-center text-[26px] sm:text-[32px] font-normal leading-[1.28] tracking-[-0.015em] text-white px-6">
        <div key={index}>
          {currentSlide.lines.map((l, i) => (
            <BlurText key={l} text={l} delay={0.05 + i * 0.1} />
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div className="absolute inset-x-0 bottom-[36px] sm:bottom-[42px] z-20 flex items-center justify-center gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className="relative h-[3.5px] overflow-hidden rounded-full transition-all duration-300 cursor-pointer focus:outline-none"
            style={{
              width: i === index ? 48 : 34,
              backgroundColor: "rgba(255, 255, 255, 0.32)",
            }}
          >
            <span
              ref={(n) => {
                fills.current[i] = n;
              }}
              className="absolute inset-0 origin-left rounded-full bg-white"
              style={{ transform: i === index ? "scaleX(1)" : "scaleX(0)" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
