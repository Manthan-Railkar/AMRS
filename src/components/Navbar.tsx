"use client";

import React, { useState } from "react";
import Link from "next/link";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 w-full border-b border-zinc-800/60 bg-[#030712]/75 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* AMRS Logo SVG */}
            <div className="relative flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 shrink-0 transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_2px_12px_rgba(56,189,248,0.45)]"
              >
                <defs>
                  <linearGradient id="amrs-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="amrs-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                {/* Modern folded ribbon 'A' glyph */}
                <path
                  d="M13.2 4.2C14.4 2.3 17.6 2.3 18.8 4.2L28.3 19.8C29.6 21.9 28.1 24.6 25.6 24.6H20.4L16 17.2L11.6 24.6H6.4C3.9 24.6 2.4 21.9 3.7 19.8L13.2 4.2Z"
                  fill="url(#amrs-grad-1)"
                  fillOpacity="0.88"
                />
                <path
                  d="M16 8.5L22.2 19.2H9.8L16 8.5ZM16 12.8L13.2 17.6H18.8L16 12.8Z"
                  fill="url(#amrs-grad-2)"
                />
              </svg>
            </div>

            {/* AMRS text */}
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-sky-300 transition-colors">
              AMRS
            </span>
          </Link>

          {/* Vertical separator */}
          <div className="h-6 w-[1px] bg-zinc-700/80 mx-1 hidden sm:block" />

          {/* Subtitle */}
          <div className="hidden sm:flex flex-col text-[10px] sm:text-[11px] leading-[1.15] text-zinc-400 font-normal select-none">
            <span>Adaptive Model</span>
            <span>Recovery System</span>
          </div>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300">
          {/* Platform dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setPlatformOpen(true)}
            onMouseLeave={() => setPlatformOpen(false)}
          >
            <button className="flex items-center gap-1.5 hover:text-white transition-colors py-2 cursor-pointer">
              <span>Platform</span>
              <svg
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  platformOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {platformOpen && (
              <div className="absolute top-full left-0 w-60 rounded-xl border border-zinc-800/90 bg-[#090d1a]/95 backdrop-blur-xl p-2 shadow-2xl shadow-black/90 animate-in fade-in slide-in-from-top-2 duration-150">
                <Link
                  href="#diagnosis"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                >
                  <div className="font-semibold text-zinc-100">Failure Diagnosis</div>
                  <div className="text-[11px] text-zinc-400">Pinpoint model degradation patterns</div>
                </Link>
                <Link
                  href="#recovery"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                >
                  <div className="font-semibold text-zinc-100">Adaptive Recovery</div>
                  <div className="text-[11px] text-zinc-400">Autonomous strategy orchestration</div>
                </Link>
                <Link
                  href="#rollback"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                >
                  <div className="font-semibold text-zinc-100">Auto Verification & Rollback</div>
                  <div className="text-[11px] text-zinc-400">Zero performance risk in production</div>
                </Link>
              </div>
            )}
          </div>

          {/* Solutions dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setSolutionsOpen(true)}
            onMouseLeave={() => setSolutionsOpen(false)}
          >
            <button className="flex items-center gap-1.5 hover:text-white transition-colors py-2 cursor-pointer">
              <span>Solutions</span>
              <svg
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  solutionsOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {solutionsOpen && (
              <div className="absolute top-full left-0 w-56 rounded-xl border border-zinc-800/90 bg-[#090d1a]/95 backdrop-blur-xl p-2 shadow-2xl shadow-black/90 animate-in fade-in slide-in-from-top-2 duration-150">
                <Link
                  href="#enterprise"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                >
                  Enterprise LLMs & GenAI
                </Link>
                <Link
                  href="#edge"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                >
                  Edge & Real-time Classifiers
                </Link>
                <Link
                  href="#mlops"
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                >
                  MLOps Pipeline Integration
                </Link>
              </div>
            )}
          </div>

          <Link href="#documentation" className="hover:text-white transition-colors">
            Documentation
          </Link>

          <Link href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Sign In Button */}
          <button className="px-5 py-1.5 rounded-full border border-zinc-700/80 hover:border-zinc-500 bg-transparent text-sm font-medium text-zinc-200 hover:text-white hover:bg-zinc-800/30 transition-all cursor-pointer">
            Sign In
          </button>

          {/* Get Started Button */}
          <button className="group px-5 py-1.5 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <span>Get Started</span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-zinc-800/80 bg-[#030712]/95 backdrop-blur-2xl px-5 py-4 space-y-3">
          <Link
            href="#platform"
            className="block py-2 text-sm font-medium text-zinc-200 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Platform
          </Link>
          <Link
            href="#solutions"
            className="block py-2 text-sm font-medium text-zinc-200 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Solutions
          </Link>
          <Link
            href="#documentation"
            className="block py-2 text-sm font-medium text-zinc-200 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Documentation
          </Link>
          <Link
            href="#pricing"
            className="block py-2 text-sm font-medium text-zinc-200 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </Link>
          <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
            <button className="w-full py-2 rounded-full border border-zinc-700/80 text-sm font-medium text-zinc-200">
              Sign In
            </button>
            <button className="w-full py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-md">
              <span>Get Started</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
