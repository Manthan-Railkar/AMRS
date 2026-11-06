"use client";

import Image from "next/image";
import { useState } from "react";

export default function Dunes() {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden select-none pointer-events-none bg-[#191129]">
      {/* Fallback stylized dunes SVG gradient while image hydrates/loads */}
      <svg
        viewBox="0 0 636 783"
        preserveAspectRatio="xMidYMid slice"
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${imgLoaded ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      >
        <defs>
          <linearGradient id="dune-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d4cb3" />
            <stop offset="0.32" stopColor="#483896" />
            <stop offset="0.6" stopColor="#2c2060" />
            <stop offset="1" stopColor="#140c26" />
          </linearGradient>
          <linearGradient id="dune-lit" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#7a6778" />
            <stop offset="0.45" stopColor="#554760" />
            <stop offset="1" stopColor="#302446" />
          </linearGradient>
          <linearGradient id="dune-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#413550" />
            <stop offset="1" stopColor="#1f1532" />
          </linearGradient>
          <filter id="dune-soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="636" height="783" fill="url(#dune-sky)" />
        <g filter="url(#dune-soft)" opacity="0.6">
          <ellipse cx="215" cy="178" rx="95" ry="9" fill="#2d2170" />
          <ellipse cx="120" cy="212" rx="70" ry="7" fill="#281c62" />
          <ellipse cx="330" cy="192" rx="40" ry="5" fill="#352675" />
        </g>
        <path
          d="M0 330 C60 300 130 250 204 232 C262 222 330 250 382 264 C470 282 560 328 636 336 L636 783 L0 783 Z"
          fill="url(#dune-lit)"
        />
        <path
          d="M0 600 C120 560 260 470 340 442 C420 420 520 432 636 474 L636 783 L0 783 Z"
          fill="url(#dune-mid)"
        />
        <path
          d="M0 700 C150 650 330 604 470 566 C540 548 600 548 636 558 L636 783 L0 783 Z"
          fill="#1c132c"
        />
      </svg>

      {/* Photorealistic Mojave night wallpaper (identical to design screenshot) */}
      <Image
        src="/assets/img/dunes.jpg"
        alt="Desert dunes at night"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        onLoad={() => setImgLoaded(true)}
        className="object-cover object-center transition-transform duration-1000 ease-out"
      />

      {/* Subtle night atmosphere overlay matching design */}
      <div className="absolute inset-0 bg-[#281b4d]/15 mix-blend-color pointer-events-none" />

      {/* Bottom vignette gradient for contrast behind captions and indicators */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#140c24]/95 via-[#140c24]/30 to-transparent pointer-events-none" />
    </div>
  );
}

