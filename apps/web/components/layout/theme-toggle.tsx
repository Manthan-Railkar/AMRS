"use client"

import { useTheme } from "next-themes"
import * as React from "react"
import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Returns true only after hydration, avoiding SSR/client mismatch. */
function useHasMounted() {
  return useSyncExternalStore(
    // subscribe: no-op — the store never changes after hydration
    () => () => {},
    // client snapshot: mounted
    () => true,
    // server snapshot: not mounted
    () => false,
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useHasMounted()
  const isTogglingRef = React.useRef(false)

  if (!mounted) {
    // Render a same-size invisible placeholder to prevent layout shift
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className="opacity-0 pointer-events-none"
      >
        <Sun className="size-4" aria-hidden="true" />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  const toggleTheme = () => {
    // Prevent duplicate triggers if both press and click events fire
    if (isTogglingRef.current) return
    isTogglingRef.current = true
    setTimeout(() => {
      isTogglingRef.current = false
    }, 150)

    const nextTheme = isDark ? "light" : "dark"

    setTheme(nextTheme)
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme)
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark")
        document.documentElement.classList.remove("light")
      } else {
        document.documentElement.classList.remove("dark")
        document.documentElement.classList.add("light")
      }
    }
    try {
      localStorage.setItem("theme", nextTheme)
      localStorage.setItem("kraft-theme", nextTheme)
    } catch {}
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onPress={toggleTheme}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 hover:text-amber-300 transition-colors" aria-hidden="true" />
      ) : (
        <Moon className="size-4 text-slate-700 hover:text-slate-900 transition-colors" aria-hidden="true" />
      )}
      <span className="sr-only">
        {isDark ? "Switch to light theme" : "Switch to dark theme"}
      </span>
    </Button>
  )
}
