'use client';

import { useState } from 'react';
import Hyperspeed, { HyperspeedCurve } from './Hyperspeed';

interface Preset {
  name: string;
  curve: HyperspeedCurve;
  curvature: number;
  speed: number;
  boost: number;
  tailColors: string[];
  headColors: string[];
  poleColors: string[];
}

const PRESETS: Preset[] = [
  {
    name: 'Cyberpunk Neon',
    curve: 'winding',
    curvature: 1,
    speed: 1.2,
    boost: 3.5,
    tailColors: ['#d856bf', '#6750a2', '#c247ac'],
    headColors: ['#03b3c3', '#0e5ea5', '#324555'],
    poleColors: ['#03b3c3']
  },
  {
    name: 'Midnight Rush',
    curve: 'racing',
    curvature: 1.2,
    speed: 1.5,
    boost: 4,
    tailColors: ['#ff2a5f', '#ff5e00', '#d80032'],
    headColors: ['#00f0ff', '#0077ff', '#7000ff'],
    poleColors: ['#ff007f']
  },
  {
    name: 'Solar Flare',
    curve: 'hills',
    curvature: 0.8,
    speed: 1.1,
    boost: 3,
    tailColors: ['#ffb703', '#fb8500', '#ff0054'],
    headColors: ['#8ecae6', '#219ebc', '#023047'],
    poleColors: ['#ffb703']
  },
  {
    name: 'Matrix Speed',
    curve: 'straight',
    curvature: 0,
    speed: 1.4,
    boost: 4.5,
    tailColors: ['#00ff66', '#00cc44', '#10b981'],
    headColors: ['#059669', '#34d399', '#047857'],
    poleColors: ['#00ff66']
  }
];

export function HyperspeedShowcase() {
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [selectedCurve, setSelectedCurve] = useState<HyperspeedCurve>('winding');
  const [isBoostingManual, setIsBoostingManual] = useState(false);
  const [isUserHoldingBoost, setIsUserHoldingBoost] = useState(false);

  const preset = PRESETS[activePresetIndex];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Visual Canvas Container */}
      <div className="relative w-full h-[520px] sm:h-[620px] rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-950 shadow-2xl">
        <Hyperspeed
          curve={selectedCurve}
          curvature={preset.curvature}
          speed={preset.speed}
          boost={preset.boost}
          fov={90}
          boostFov={130}
          lanes={3}
          roadWidth={10}
          medianWidth={2}
          density={40}
          trailLength={1}
          lightSize={1}
          poles={20}
          poleHeight={1}
          dust={100}
          glow={0.6}
          reflections={0.5}
          roadOpacity={0.15}
          steer={0.35}
          tailColors={preset.tailColors}
          headColors={preset.headColors}
          poleColors={preset.poleColors}
          interactive={true}
          boosting={isBoostingManual}
          onBoostStart={() => setIsUserHoldingBoost(true)}
          onBoostEnd={() => setIsUserHoldingBoost(false)}
        />

        {/* Overlay Overlay Pill & Header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 p-6 flex items-start justify-between z-10">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60 backdrop-blur-md text-xs font-semibold text-zinc-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBoostingManual || isUserHoldingBoost
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
              {isBoostingManual || isUserHoldingBoost ? 'WARP BOOST ACTIVE' : 'HYPERSPEED CRUISING'}
            </span>
            <span className="text-xs text-zinc-400 pl-1 drop-shadow">
              Preset: <strong className="text-white">{preset.name}</strong> • Curve: <strong className="text-white">{selectedCurve}</strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-zinc-900/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <span>🖱️ Click & hold canvas or move mouse to steer</span>
          </div>
        </div>

        {/* Bottom Interactive Trigger Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-auto z-10">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p, index) => (
              <button
                key={p.name}
                onClick={() => {
                  setActivePresetIndex(index);
                  setSelectedCurve(p.curve);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition-all ${
                  activePresetIndex === index
                    ? 'bg-white text-zinc-950 shadow-md scale-105'
                    : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 border border-zinc-700/50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onMouseDown={() => setIsBoostingManual(true)}
              onMouseUp={() => setIsBoostingManual(false)}
              onTouchStart={() => setIsBoostingManual(true)}
              onTouchEnd={() => setIsBoostingManual(false)}
              className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all shadow-lg select-none ${
                isBoostingManual
                  ? 'bg-amber-400 text-zinc-950 scale-95 shadow-amber-500/50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
              }`}
            >
              {isBoostingManual ? '🚀 Boosting!' : 'Hold To Boost'}
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar for Road Curves */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Road Curve:
          </span>
          <div className="flex flex-wrap gap-1">
            {(['straight', 'gentle', 'winding', 'hills', 'racing', 'deep'] as HyperspeedCurve[]).map(
              (curveName) => (
                <button
                  key={curveName}
                  onClick={() => setSelectedCurve(curveName)}
                  className={`px-3 py-1 text-xs rounded-md capitalize font-medium transition ${
                    selectedCurve === curveName
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {curveName}
                </button>
              )
            )}
          </div>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          React Bits • Hyperspeed component
        </div>
      </div>
    </div>
  );
}
