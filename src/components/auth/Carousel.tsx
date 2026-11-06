"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import Dunes from "./Dunes";
import BlurText from "./BlurText";

const SLIDES = [
  { lines: ["Your Story,", "Beautifully Kept"], pan: -15 },
  { lines: ["Share the Light,", "Keep the Moment"], pan: 15 },
  { lines: ["Capturing Moments,", "Creating Memories"], pan: 0 },
];
const DURATION = 6; // seconds per slide

export default function Carousel() {
  const [index, setIndex] = useState(2); // opens on slide 2 ("Capturing Moments, Creating Memories") as in design screenshot
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

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[20px] bg-[#1a1030]">
      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0.8, scale: 1.04, x: SLIDES[index].pan }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <Dunes />
        </motion.div>
      </AnimatePresence>

      {/* Caption with BlurText */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[108px] sm:bottom-[118px] z-20 text-center text-[28px] sm:text-[34px] font-normal leading-[1.28] tracking-[-0.015em] text-white px-6">
        <div key={index}>
          {SLIDES[index].lines.map((l, i) => (
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
