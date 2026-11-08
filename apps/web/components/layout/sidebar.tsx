"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  TrendingUp,
  BarChart2,
  Clock,
  Bell,
  Settings,
  Megaphone,
  Search,
  SquarePen,
  ChevronLeft,
  ChevronsUpDown,
  MoreHorizontal,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useCurrentUser } from "@/hooks/use-user";
import { signOutAction } from "@/app/actions/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications, formatRelativeTime, addNotification } from "@/lib/notifications";

export interface NavItemConfig {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  badge?: number | string;
}

export const workspaceNavItems: NavItemConfig[] = [
  { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: Home },
  { id: "analytics", name: "Analytics", href: "/benchmarks", icon: TrendingUp },
  { id: "insights", name: "Insights", href: "/monitor", icon: BarChart2 },
  { id: "history", name: "History", href: "/history", icon: Clock },
];

export const generalNavItems: NavItemConfig[] = [
  { id: "notifications", name: "Notifications", href: "#notifications", icon: Bell },
  { id: "settings", name: "Settings", href: "#settings", icon: Settings },
  { id: "feedback", name: "Feedback", href: "/feedback", icon: Megaphone },
];

export const allNavItems = [...workspaceNavItems, ...generalNavItems];

export interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

interface IndicatorState {
  top: number;
  left: number;
  width: number;
  height: number;
  opacity: number;
}

export function Sidebar({
  className,
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  // Helper to extract clean initials from full name or email
  const userInitials = React.useMemo(() => {
    if (currentUser?.fullName) {
      const parts = currentUser.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      if (parts.length === 1 && parts[0].length > 0) {
        return parts[0].slice(0, 2).toUpperCase();
      }
    }
    if (currentUser?.email) {
      return currentUser.email.slice(0, 2).toUpperCase();
    }
    return "AM";
  }, [currentUser]);

  const displayName = currentUser?.fullName || (currentUser?.email ? currentUser.email.split("@")[0] : "Guest User");
  const displayEmail = currentUser?.email || "guest@amrs.local";

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("amrs_active_user_id");
      localStorage.removeItem("amrs_active_user_email");
      document.cookie = "amrs_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    await signOutAction();
    queryClient.clear();
    router.push("/get-started");
    router.refresh();
  };

  // Quick search modal state
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Notification dialog state
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  // Dynamic system notifications scoped to current profile
  const {
    notifications,
    unreadCount,
    markAllNotificationsRead,
    clearAllNotifications,
  } = useNotifications(currentUser?.id);

  // Profile popover state
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  // Refs for tracking DOM position of active nav items to animate the sliding pill
  const asideRef = React.useRef<HTMLElement>(null);
  const navContainerRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLElement>>(new Map());

  const [indicator, setIndicator] = React.useState<IndicatorState>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  const isRouteActive = React.useCallback(
    (href: string) => {
      if (href.startsWith("#")) return false;
      if (pathname === href) return true;
      if (href !== "/" && pathname?.startsWith(href + "/")) return true;
      return false;
    },
    [pathname]
  );

  // Measure and position the active highlight indicator
  const updateIndicator = React.useCallback(
    (targetHref?: string) => {
      if (!navContainerRef.current) return;

      const activeHref =
        targetHref ??
        allNavItems.find((item) => isRouteActive(item.href))?.href;

      if (!activeHref) {
        setIndicator((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      const activeEl = itemRefs.current.get(activeHref);
      if (!activeEl) {
        setIndicator((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      const containerRect = navContainerRef.current.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();

      setIndicator({
        top: elRect.top - containerRect.top + navContainerRef.current.scrollTop,
        left: elRect.left - containerRect.left,
        width: elRect.width,
        height: elRect.height,
        opacity: 1,
      });
    },
    [isRouteActive]
  );

  // Update highlight position smoothly on pathname or collapsed state change
  React.useLayoutEffect(() => {
    const frameId = requestAnimationFrame(() => {
      updateIndicator();
    });
    // Multi-stage timers ensuring settled coordinates throughout width transitions
    const t1 = setTimeout(updateIndicator, 50);
    const t2 = setTimeout(updateIndicator, 120);
    const t3 = setTimeout(updateIndicator, 220);
    const t4 = setTimeout(updateIndicator, 320);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [pathname, isCollapsed, updateIndicator]);

  // Observe container & aside resizes (e.g. sidebar width transition)
  React.useEffect(() => {
    const nav = navContainerRef.current;
    const aside = asideRef.current;
    if (!nav && !aside) return;

    const ro = new ResizeObserver(() => {
      updateIndicator();
    });

    if (nav) ro.observe(nav);
    if (aside) ro.observe(aside);

    return () => ro.disconnect();
  }, [updateIndicator]);

  // Transitionend listener on sidebar width transition
  React.useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.target === aside && (e.propertyName === "width" || e.propertyName === "max-width")) {
        updateIndicator();
      }
    };

    aside.addEventListener("transitionend", handleTransitionEnd);
    return () => aside.removeEventListener("transitionend", handleTransitionEnd);
  }, [updateIndicator]);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIndicator]);

  // Global keyboard shortcut for quick search (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavClick = (href: string) => {
    updateIndicator(href);
    onNavigate?.();
  };

  return (
    <>
      <aside
        ref={asideRef}
        aria-label="Sidebar navigation"
        className={cn(
          "relative flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border backdrop-blur-md transition-[width] duration-200 select-none",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* ─── Middle Section Collapse Button (Border Pin) ─────────────── */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-40 size-7",
              "rounded-full border border-sidebar-border bg-sidebar text-muted-foreground hover:text-sidebar-foreground",
              "shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200",
              "items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            )}
          >
            <ChevronLeft
              className={cn(
                "size-3.5 transition-transform duration-300",
                isCollapsed && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        )}

        {/* ─── Top Brand Header (AMRS Logo Image) ──────────────────────── */}
        <div
          className={cn(
            "flex h-15 items-center px-4 border-b border-sidebar-border/60",
            isCollapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => handleNavClick("/dashboard")}
            className="flex items-center gap-2.5 rounded-lg p-1 transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Image
              src="/amrs-logo.png"
              alt="AMRS Logo"
              width={140}
              height={35}
              priority
              className={cn(
                "object-contain shrink-0 transition-all",
                isCollapsed ? "h-6 w-auto max-w-10" : "h-7 w-auto max-w-36",
                "[html:not(.dark)_&]:invert [html:not(.dark)_&]:hue-rotate-180"
              )}
            />
          </Link>
        </div>

        {/* ─── Action Row (New run + Search) ───────────────────────────── */}
        <div className="p-3 pb-1 border-b border-sidebar-border/40">
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <Link
                href="/runs/new"
                onClick={() => handleNavClick("/runs/new")}
                className={cn(
                  "flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-sidebar-border/80 bg-card/80 hover:bg-card text-sidebar-foreground text-xs font-medium shadow-2xs transition-all",
                  "hover:border-sidebar-primary/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-none"
                )}
              >
                <SquarePen className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="truncate">New run</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search or jump to (Ctrl+K)"
                className={cn(
                  "size-9 flex items-center justify-center rounded-lg border border-sidebar-border/80 bg-card/80 hover:bg-card text-muted-foreground hover:text-sidebar-foreground shadow-2xs transition-all shrink-0",
                  "hover:border-sidebar-primary/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-none"
                )}
              >
                <Search className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <TooltipTrigger delay={150}>
                <Link
                  href="/runs/new"
                  onClick={() => handleNavClick("/runs/new")}
                  className={cn(
                    "size-9 flex items-center justify-center rounded-lg border border-sidebar-border/80 bg-card/80 hover:bg-card text-sidebar-foreground shadow-2xs transition-all",
                    "hover:border-sidebar-primary/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-none"
                  )}
                  aria-label="New run"
                >
                  <SquarePen className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
                <Tooltip placement="right">New run</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger delay={150}>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  aria-label="Search (Ctrl+K)"
                  className={cn(
                    "size-9 flex items-center justify-center rounded-lg border border-sidebar-border/80 bg-card/80 hover:bg-card text-muted-foreground hover:text-sidebar-foreground shadow-2xs transition-all",
                    "hover:border-sidebar-primary/40 focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-none"
                  )}
                >
                  <Search className="size-4" aria-hidden="true" />
                </button>
                <Tooltip placement="right">Search (Ctrl+K)</Tooltip>
              </TooltipTrigger>
            </div>
          )}
        </div>

        {/* ─── Scrollable Nav Area with Branch Tree Connectors ──────────── */}
        <div
          ref={navContainerRef}
          className="relative flex-1 overflow-y-auto px-2.5 py-2 space-y-4"
        >
          {/* Sliding Active Pill Highlight across entire sidebar */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute rounded-xl pointer-events-none z-0",
              "bg-sidebar-primary/12 border border-sidebar-primary/25 shadow-2xs",
              isReducedMotion
                ? "transition-none"
                : "transition-[top,left,width,height,opacity] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
            )}
            style={{
              top: `${indicator.top}px`,
              left: `${indicator.left}px`,
              width: `${indicator.width}px`,
              height: `${indicator.height}px`,
              opacity: indicator.opacity,
            }}
          />

          {/* Section: Team Workspace */}
          <div>
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span>Team Workspace</span>
                <button
                  type="button"
                  aria-label="Workspace options"
                  className="rounded p-0.5 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-muted-foreground transition-colors"
                >
                  <MoreHorizontal className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Nav list with Tree Trunk & Branch Connectors */}
            <nav
              aria-label="Team Workspace"
              className={cn("relative mt-1", !isCollapsed && "pl-1 space-y-1")}
            >
              {/* Vertical Tree Trunk Line */}
              {!isCollapsed && (
                <span
                  aria-hidden="true"
                  className="absolute left-4 top-2 bottom-5 w-px bg-sidebar-border/80 pointer-events-none"
                />
              )}

              {workspaceNavItems.map((item) => {
                const isActive = isRouteActive(item.href);
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    href={item.href}
                    ref={(el) => {
                      if (el) itemRefs.current.set(item.href, el);
                      else itemRefs.current.delete(item.href);
                    }}
                    onClick={() => handleNavClick(item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative z-10 flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-colors outline-none",
                      "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      !isCollapsed ? "pl-9 pr-3" : "justify-center px-0 size-10 mx-auto",
                      isActive
                        ? "text-sidebar-primary font-semibold"
                        : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                    )}
                  >
                    {/* Curved branch arm reaching from trunk to the item */}
                    {!isCollapsed && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-4 top-0 bottom-1/2 w-3.5 border-b border-sidebar-border/80 rounded-bl-md pointer-events-none transition-colors",
                          isActive && "border-sidebar-primary/60 border-b-2"
                        )}
                      />
                    )}

                    <Icon
                      className={cn(
                        "size-4.5 shrink-0 transition-colors",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                      aria-hidden="true"
                    />
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">{item.name}</span>
                        {item.badge != null && (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center text-[11px] font-bold px-1.5 py-0.2 min-w-5 h-5 rounded-full shadow-2xs",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "bg-sidebar-primary/85 text-sidebar-primary-foreground"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {isCollapsed && <span className="sr-only">{item.name}</span>}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <TooltipTrigger key={item.id} delay={150}>
                      {linkContent}
                      <Tooltip placement="right">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.badge != null && (
                            <span className="px-1.5 py-0.2 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </TooltipTrigger>
                  );
                }

                return <div key={item.id}>{linkContent}</div>;
              })}
            </nav>
          </div>

          {/* Section: General */}
          <div>
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
                General
              </div>
            )}

            <nav aria-label="General" className={cn("relative mt-1", !isCollapsed && "pl-1 space-y-1")}>
              {/* Vertical Tree Trunk Line for General Section */}
              {!isCollapsed && (
                <span
                  aria-hidden="true"
                  className="absolute left-4 top-2 bottom-5 w-px bg-sidebar-border/80 pointer-events-none"
                />
              )}

              {generalNavItems.map((item) => {
                const Icon = item.icon;
                const isLink = item.href.startsWith("/");
                const isActive = isLink ? isRouteActive(item.href) : false;

                const handleClick = (e: React.MouseEvent) => {
                  if (item.id === "notifications") {
                    e.preventDefault();
                    setIsNotificationsOpen(true);
                  } else if (item.id === "settings") {
                    e.preventDefault();
                    router.push("/dashboard");
                  }
                };

                const linkInner = (
                  <>
                    {/* Curved branch arm */}
                    {!isCollapsed && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-4 top-0 bottom-1/2 w-3.5 border-b border-sidebar-border/80 rounded-bl-md pointer-events-none transition-colors",
                          isActive && "border-sidebar-primary/60 border-b-2"
                        )}
                      />
                    )}

                    <Icon
                      className={cn(
                        "size-4.5 shrink-0 transition-colors",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                      aria-hidden="true"
                    />
                    {!isCollapsed && (
                      <>
                        <span
                          className={cn(
                            "truncate flex-1 text-left",
                            isActive ? "font-semibold text-sidebar-primary" : ""
                          )}
                        >
                          {item.name}
                        </span>
                        {((item.id === "notifications" ? (unreadCount > 0 ? unreadCount : null) : item.badge) != null) && (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center text-[11px] font-bold px-1.5 py-0.2 min-w-5 h-5 rounded-full shadow-2xs",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "bg-sidebar-primary text-sidebar-primary-foreground"
                            )}
                          >
                            {item.id === "notifications" ? unreadCount : item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {isCollapsed && <span className="sr-only">{item.name}</span>}
                  </>
                );

                const itemClassNames = cn(
                  "group relative z-10 w-full flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  !isCollapsed ? "pl-9 pr-3" : "justify-center px-0 size-10 mx-auto",
                  isActive
                    ? "text-sidebar-primary font-semibold"
                    : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                );

                const linkContent = isLink ? (
                  <Link
                    href={item.href}
                    ref={(el) => {
                      if (el) itemRefs.current.set(item.href, el);
                      else itemRefs.current.delete(item.href);
                    }}
                    onClick={() => handleNavClick(item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={itemClassNames}
                  >
                    {linkInner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleClick}
                    className={itemClassNames}
                  >
                    {linkInner}
                  </button>
                );

                if (isCollapsed) {
                  return (
                    <TooltipTrigger key={item.id} delay={150}>
                      {linkContent}
                      <Tooltip placement="right">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.badge != null && (
                            <span className="px-1.5 py-0.2 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </TooltipTrigger>
                  );
                }

                return <div key={item.id}>{linkContent}</div>;
              })}
            </nav>
          </div>
        </div>

        {/* ─── Profile Section in Left Bottom ──────────────────────────── */}
        <div className="p-2.5 border-t border-sidebar-border/60">
          {!isCollapsed ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                aria-label="User profile menu"
                className="w-full flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent/40 group outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring text-left"
              >
                <div className="relative shrink-0">
                  <div className="size-9 rounded-full bg-linear-to-tr from-sidebar-primary to-sidebar-primary/60 text-sidebar-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar"
                    aria-label="Online"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                    {displayEmail}
                  </p>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground group-hover:text-sidebar-foreground shrink-0" aria-hidden="true" />
              </button>

              {/* Profile Popover Menu */}
              {isProfileOpen && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-sidebar-border bg-popover text-popover-foreground p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="px-2 py-1.5 border-b border-border/60 mb-1">
                    <p className="text-xs font-semibold truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Active in Workspace
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        router.push("/dashboard");
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <span>Workspace Settings</span>
                      <Settings className="size-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        router.push("/runs/new");
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <span>Start Recovery Run</span>
                      <Sparkles className="size-3.5 text-primary" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors flex items-center justify-between"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <TooltipTrigger delay={150}>
                <button
                  type="button"
                  onClick={() => onToggleCollapse?.()}
                  className="relative p-0.5 rounded-full hover:ring-2 hover:ring-sidebar-ring transition-all outline-none"
                  aria-label="User Profile"
                >
                  <div className="size-8 rounded-full bg-linear-to-tr from-sidebar-primary to-sidebar-primary/60 text-sidebar-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1.5 ring-sidebar" />
                </button>
                <Tooltip placement="right">
                  <div className="text-xs font-semibold">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground">{displayEmail}</div>
                  <div className="text-[10px] text-emerald-500 font-medium mt-0.5">● Online</div>
                </Tooltip>
              </TooltipTrigger>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Quick Search Command Dialog (Ctrl+K) ───────────────────────── */}
      {isSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick search and navigation"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="size-4.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search runs, metrics, scenarios, or pages…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-2 max-h-72 overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Navigation
              </div>
              {[
                { name: "Dashboard", href: "/dashboard", desc: "Overview of model health and recoveries" },
                { name: "Run Recovery", href: "/runs/new", desc: "Launch an adaptive recovery run" },
                { name: "Benchmarks", href: "/benchmarks", desc: "Compare AMRS vs Retraining and Fine-Tuning" },
                { name: "Live Monitor", href: "/monitor", desc: "Real-time loss tracking and replay" },
                { name: "History", href: "/history", desc: "Browse past 31 benchmark runs" },
              ]
                .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((page) => (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(page.href);
                    }}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-accent transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {page.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{page.desc}</p>
                    </div>
                    <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between bg-muted/30">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Esc</kbd> to close</span>
              <span>AMRS Search</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Notifications Drawer / Modal ──────────────────────────────── */}
      {isNotificationsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="System notifications"
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsNotificationsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4.5 text-primary" />
                <h3 className="font-semibold text-sm">System Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead()}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close notifications"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="py-2 space-y-1.5 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No notifications recorded yet. Upload a model or run recovery to see live progress.
                </div>
              ) : (
                notifications.map((n) => {
                  const NIcon =
                    n.type === "upload" ? Upload :
                    n.type === "completed" || n.type === "verdict" ? CheckCircle2 :
                    n.type === "diagnosing" ? ShieldCheck :
                    n.type === "strategy" ? Sparkles :
                    n.type === "error" ? AlertTriangle : Bell;

                  const colorClass =
                    n.statusColor === "emerald" ? "text-emerald-500" :
                    n.statusColor === "rose" ? "text-rose-500" :
                    n.statusColor === "amber" ? "text-amber-500" : "text-primary";

                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.href) {
                          setIsNotificationsOpen(false);
                          router.push(n.href);
                        }
                      }}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-xl transition-colors cursor-pointer",
                        !n.read ? "bg-muted/60 hover:bg-muted font-medium" : "hover:bg-muted/30"
                      )}
                    >
                      <NIcon className={cn("size-4 shrink-0 mt-0.5", colorClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-foreground truncate">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(n.timestamp)}</span>
                        </div>
                        {n.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.description}</p>
                        )}
                      </div>
                      {!n.read && (
                        <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
