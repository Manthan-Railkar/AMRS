"use client";

import { useState } from "react";

export function InteractiveDemo() {
  const [count, setCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"features" | "tech" | "quickstart">("features");

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-zinc-950/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Interactive Component Demo
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showcasing React client state and Tailwind CSS styling
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab("features")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "features"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Features
          </button>
          <button
            onClick={() => setActiveTab("tech")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "tech"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Tech Stack
          </button>
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "quickstart"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Quickstart
          </button>
        </div>
      </div>

      <div className="pt-6">
        {activeTab === "features" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/40">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm mb-3">
                ⚡
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Next.js App Router
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Built with React Server Components, nested routing, and fast Turbopack bundler.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/40">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm mb-3">
                🎨
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Tailwind CSS v4
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Zero-configuration modern utility-first styling with automatic dark-mode support.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/40">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
                🛡️
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                TypeScript & ESLint
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Strict type safety, modern linting, and developer tooling ready out of the box.
              </p>
            </div>
          </div>
        )}

        {activeTab === "tech" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Framework</span>
              <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-200/60 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                Next.js (App Router)
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Styling</span>
              <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-200/60 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                Tailwind CSS v4
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Language</span>
              <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-200/60 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                TypeScript
              </span>
            </div>
          </div>
        )}

        {activeTab === "quickstart" && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Run the development server:</p>
            <div className="rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100 flex items-center justify-between">
              <span>npm run dev</span>
              <span className="text-zinc-500 text-[10px]"># starts http://localhost:3000</span>
            </div>
          </div>
        )}

        {/* Counter Widget */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Interactive State Test
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Current count: <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{count}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCount((c) => c - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
            >
              -1
            </button>
            <button
              onClick={() => setCount(0)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
            >
              Reset
            </button>
            <button
              onClick={() => setCount((c) => c + 1)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition shadow-sm"
            >
              +1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
