"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiStatusPill } from "@/components/layout/api-status-pill";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  onOpenMobileMenu?: () => void;
  className?: string;
}

export function Topbar({ onOpenMobileMenu, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/60 bg-card/70 px-4 backdrop-blur-md transition-colors sm:px-6",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon-sm"
            onPress={onOpenMobileMenu}
            aria-label="Open mobile navigation menu"
            className="md:hidden text-foreground"
          >
            <Menu className="size-5" aria-hidden="true" />
            <span className="sr-only">Open mobile navigation menu</span>
          </Button>
        )}
        <div className="flex items-center gap-2 md:hidden font-semibold text-sm">
          <span>AMRS</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ApiStatusPill />
        <ThemeToggle />
      </div>
    </header>
  );
}
