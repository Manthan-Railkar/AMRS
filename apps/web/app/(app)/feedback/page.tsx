import * as React from "react";
import type { Metadata } from "next";
import { FeedbackContent } from "@/components/feedback/feedback-content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Feedback & Product Roadmap — AMRS",
  description:
    "Submit product feedback, feature requests, and bug reports directly to the AMRS engineering triage team, or explore the public roadmap.",
};

function FeedbackSkeleton() {
  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <React.Suspense fallback={<FeedbackSkeleton />}>
      <FeedbackContent />
    </React.Suspense>
  );
}

