"use client";

import * as React from "react";

export type NotificationType =
  | "upload"
  | "run_queued"
  | "diagnosing"
  | "strategy"
  | "verdict"
  | "completed"
  | "error";

export interface SystemNotification {
  id: string;
  title: string;
  description?: string;
  timestamp: number;
  type: NotificationType;
  runId?: string;
  href?: string;
  read: boolean;
  statusColor?: string; // e.g. "emerald", "primary", "amber", "rose"
}

const STORAGE_KEY = "amrs_system_notifications_v1";

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getStoredNotifications(): SystemNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: SystemNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // Ignore storage quota
  }
  emitChange();
}

/**
 * Format relative time (e.g., "Just now", "2m ago", "1h ago", "2d ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Add a new dynamic notification
 */
export function addNotification(item: Omit<SystemNotification, "id" | "timestamp" | "read"> & { id?: string; timestamp?: number }): SystemNotification {
  const current = getStoredNotifications();
  const newItem: SystemNotification = {
    id: item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.title,
    description: item.description,
    timestamp: item.timestamp || Date.now(),
    type: item.type,
    runId: item.runId,
    href: item.href,
    read: false,
    statusColor: item.statusColor || (
      item.type === "completed" || item.type === "upload" ? "emerald" :
      item.type === "error" ? "rose" :
      item.type === "strategy" ? "amber" : "primary"
    ),
  };

  // Avoid identical duplicate within 5 seconds
  const isDuplicate = current.some(
    (n) => n.title === newItem.title && Math.abs(n.timestamp - newItem.timestamp) < 5000
  );

  if (!isDuplicate) {
    const updated = [newItem, ...current];
    saveNotifications(updated);
  }

  return newItem;
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  saveNotifications([]);
}

/**
 * React hook to access dynamic notifications and unread count
 */
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<SystemNotification[]>([]);

  React.useEffect(() => {
    setNotifications(getStoredNotifications());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setNotifications(getStoredNotifications());
      }
    };

    const onLocalChange = () => {
      setNotifications(getStoredNotifications());
    };

    listeners.push(onLocalChange);
    window.addEventListener("storage", onStorage);

    return () => {
      listeners = listeners.filter((l) => l !== onLocalChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    addNotification,
    markAllNotificationsRead,
    clearAllNotifications,
  };
}

