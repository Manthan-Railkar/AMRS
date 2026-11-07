"use client";

import * as React from "react";
import {
  ModalOverlay as ModalOverlayPrimitive,
  Modal as ModalPrimitive,
  Dialog as DialogPrimitive,
} from "react-aria-components";
import { X } from "lucide-react";
import Image from "next/image";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Mobile Drawer Navigation */}
      <ModalOverlayPrimitive
        isOpen={isMobileDrawerOpen}
        onOpenChange={setIsMobileDrawerOpen}
        isDismissable
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden",
          "data-entering:animate-in data-entering:fade-in-0",
          "data-exiting:animate-out data-exiting:fade-out-0"
        )}
      >
        <ModalPrimitive
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-sidebar border-r border-sidebar-border shadow-xl outline-none",
            "data-entering:animate-in data-entering:slide-in-from-left",
            "data-exiting:animate-out data-exiting:slide-out-to-left"
          )}
        >
          <DialogPrimitive
            role="dialog"
            aria-label="Mobile Navigation"
            className="flex h-full flex-col outline-none"
          >
            <div className="flex h-15 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/amrs-logo.png"
                  alt="AMRS Logo"
                  width={130}
                  height={32}
                  priority
                  className="h-7 w-auto object-contain [html:not(.dark)_&]:invert [html:not(.dark)_&]:hue-rotate-180"
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onPress={() => setIsMobileDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="text-muted-foreground hover:text-sidebar-foreground"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Close navigation drawer</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <React.Suspense
                fallback={
                  <div className="p-4 text-sm text-muted-foreground">
                    Loading navigation...
                  </div>
                }
              >
                <Sidebar
                  className="w-full border-r-0 h-full bg-transparent"
                  isCollapsed={false}
                  onNavigate={() => setIsMobileDrawerOpen(false)}
                />
              </React.Suspense>
            </div>
          </DialogPrimitive>
        </ModalPrimitive>
      </ModalOverlayPrimitive>

      {/* Main Layout Container */}
      <div className="flex flex-1 min-h-screen">
        {/* Desktop Collapsible Sidebar */}
        <React.Suspense
          fallback={
            <div
              className={cn(
                "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen",
                isCollapsed ? "w-16" : "w-64"
              )}
            />
          }
        >
          <Sidebar
            className="hidden md:flex sticky top-0 h-screen shrink-0"
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          />
        </React.Suspense>

        {/* Content Area with Topbar and Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar onOpenMobileMenu={() => setIsMobileDrawerOpen(true)} />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-6 lg:p-8 outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
