"use client";

import type * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  retryLabel?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  retryLabel = "Try again",
  action,
  children,
  className,
}: ErrorStateProps) {
  const errorMessage =
    description ??
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An error occurred while loading this view. Please try again or contact support.");

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center sm:p-12",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
        {errorMessage}
      </p>
      {children && <div className="mt-4">{children}</div>}
      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onPress={onRetry}
              className="gap-2 font-medium"
              aria-label={retryLabel}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>{retryLabel}</span>
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
