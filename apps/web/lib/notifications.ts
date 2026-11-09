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
  userId?: string;
}

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function getNotificationStorageKey(userId?: string | null): string {
  if (userId) return `amrs_notifications_${userId}`;
  if (typeof window !== "undefined") {
    const active = localStorage.getItem("amrs_active_user_id");
    if (active) return `amrs_notifications_${active}`;
  }
  return "amrs_notifications_guest";
}

function getStoredNotifications(userId?: string | null): SystemNotification[] {
  if (typeof window === "undefined") return [];
  const key = getNotificationStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: SystemNotification[], userId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = getNotificationStorageKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
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
 * Add a new dynamic notification scoped to the current or specified user
 */
export function addNotification(
  item: Omit<SystemNotification, "id" | "timestamp" | "read"> & {
    id?: string;
    timestamp?: number;
    userId?: string | null;
  }
): SystemNotification {
  const targetUserId = item.userId;
  const current = getStoredNotifications(targetUserId);
  const newItem: SystemNotification = {
    id: item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.title,
    description: item.description,
    timestamp: item.timestamp || Date.now(),
    type: item.type,
    runId: item.runId,
    href: item.href,
    read: false,
    statusColor:
      item.statusColor ||
      (item.type === "completed" || item.type === "upload"
        ? "emerald"
        : item.type === "error"
          ? "rose"
          : item.type === "strategy"
            ? "amber"
            : "primary"),
    userId: targetUserId || undefined,
  };

  // Avoid identical duplicate within 5 seconds
  const isDuplicate = current.some(
    (n) => n.title === newItem.title && Math.abs(n.timestamp - newItem.timestamp) < 5000
  );

  if (!isDuplicate) {
    const updated = [newItem, ...current];
    saveNotifications(updated, targetUserId);
  }

  return newItem;
}

/**
 * Mark all notifications as read for current/specified user
 */
export function markAllNotificationsRead(userId?: string | null): void {
  const current = getStoredNotifications(userId);
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated, userId);
}

/**
 * Clear all notifications for current/specified user
 */
export function clearAllNotifications(userId?: string | null): void {
  saveNotifications([], userId);
}

/**
 * React hook to access dynamic notifications and unread count scoped to the active profile
 */
export function useNotifications(userId?: string | null) {
  const [notifications, setNotifications] = React.useState<SystemNotification[]>([]);

  React.useEffect(() => {
    setNotifications(getStoredNotifications(userId));

    // Sync permanent history from backend/Supabase into profile notifications
    if (userId) {
      fetch(`/api/runs?user_id=${encodeURIComponent(userId)}&limit=10`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.runs) && data.runs.length > 0) {
            const currentItems = getStoredNotifications(userId);
            let hasChanges = false;
            const updated = [...currentItems];

            for (const r of data.runs) {
              const runNotifId = `notif-run-${r.id}`;
              const exists = updated.some((n) => n.id === runNotifId || n.runId === r.id);
              if (!exists) {
                hasChanges = true;
                const verdictText =
                  r.verdict === "accepted"
                    ? "Recovery Succeeded"
                    : r.verdict === "healthy_no_action"
                      ? "Healthy (No action needed)"
                      : r.verdict === "rolled_back"
                        ? "Rolled back to safe weights"
                        : "Execution finished";
                const arch = r.arch || "Model";
                updated.push({
                  id: runNotifId,
                  title: `${arch}: ${verdictText}`,
                  description: `Run ${r.id.slice(0, 8)} finalized with verdict '${r.verdict || r.status}'.`,
                  timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                  type: r.verdict === "accepted" ? "completed" : r.verdict === "error" ? "error" : "strategy",
                  runId: r.id,
                  href: `/runs/${r.id}`,
                  read: true,
                  statusColor: r.verdict === "accepted" ? "emerald" : r.verdict === "error" ? "rose" : "amber",
                  userId: userId,
                });
              }
            }

            if (hasChanges) {
              updated.sort((a, b) => b.timestamp - a.timestamp);
              saveNotifications(updated, userId);
              setNotifications(updated);
            }
          }
        })
        .catch(() => {
          // Ignore network errors in background notification sync
        });
    }

    const key = getNotificationStorageKey(userId);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        setNotifications(getStoredNotifications(userId));
      }
    };

    const onLocalChange = () => {
      setNotifications(getStoredNotifications(userId));
    };

    listeners.push(onLocalChange);
    window.addEventListener("storage", onStorage);

    return () => {
      listeners = listeners.filter((l) => l !== onLocalChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    addNotification: (item: Parameters<typeof addNotification>[0]) =>
      addNotification({ ...item, userId: item.userId ?? userId ?? undefined }),
    markAllNotificationsRead: () => markAllNotificationsRead(userId),
    clearAllNotifications: () => clearAllNotifications(userId),
  };
}
