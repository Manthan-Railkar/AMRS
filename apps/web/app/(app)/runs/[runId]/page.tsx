import * as React from "react";
import { Suspense } from "react";
import { RunDetailContent } from "@/components/runs/run-detail-content";

interface RunDetailPageProps {
  params: Promise<{ runId: string }>;
}

async function RunDetailWrapper({ params }: RunDetailPageProps) {
  const { runId } = await params;
  return <RunDetailContent runId={runId} />;
}

export default function RunDetailPage({ params }: RunDetailPageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading run details…</div>}>
      <RunDetailWrapper params={params} />
    </Suspense>
  );
}
