import type * as React from "react";
import { FolderOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No data found",
  description = "There are no records matching your current selection.",
  icon: Icon = FolderOpen,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center sm:p-12",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
