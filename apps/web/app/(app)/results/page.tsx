"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listRuns } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";

export default function ResultsIndexPage() {
  const router = useRouter();
  const { data: runs, isLoading, isError } = useQuery({
    queryKey: ["runs", "latest"],
    queryFn: () => listRuns({ limit: 1 }),
  });

  React.useEffect(() => {
    if (runs && runs.length > 0) {
      router.replace(`/runs/${runs[0].id}`);
    }
  }, [runs, router]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !runs || runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">No Recovery Results Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          You haven&apos;t executed any model recovery runs yet. Launch your first adaptive recovery run to view detailed diagnostic evidence and verification gate results.
        </p>
        <Link href="/runs/new">
          <Button className="gap-2">
            Start Recovery Run <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Redirecting to latest recovery results...
    </div>
  );
}

