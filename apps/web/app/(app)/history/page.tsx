import * as React from "react";
import { HistoryContent } from "@/components/history/history-content";

export default function HistoryPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading history…</div>}>
      <HistoryContent />
    </React.Suspense>
  );
}
