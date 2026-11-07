"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Bug,
  Zap,
  MessageSquare,
  Search,
  ChevronUp,
  Clock,
  Send,
  Check,
  RotateCcw,
  Flame,
  ShieldCheck,
  CheckCheck,
  SlidersHorizontal,
  Cpu,
  Layers,
  HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";
import {
  listFeedbacks,
  getFeedbackStats,
  submitFeedback,
  toggleVoteFeedback,
  type FeedbackItem,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackArea,
  type FeedbackSeverity,
  type CreateFeedbackInput,
} from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { ErrorState } from "@/components/status/error-state";
import { cn } from "@/lib/utils";

// ─── Status Metadata ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeCls: string }
> = {
  under_review: {
    label: "Under Review",
    icon: Clock,
    badgeCls: "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25",
  },
  planned: {
    label: "Planned",
    icon: Sparkles,
    badgeCls: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25",
  },
  in_progress: {
    label: "In Progress",
    icon: Zap,
    badgeCls: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25",
  },
  completed: {
    label: "Completed",
    icon: CheckCheck,
    badgeCls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25",
  },
};

// ─── Feedback Type Metadata ──────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  FeedbackType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    activeBorder: string;
  }
> = {
  feature: {
    label: "Feature Request",
    icon: Sparkles,
    description: "Propose new algorithms, connectors, or recovery pipelines",
    activeBorder: "border-purple-500 ring-1 ring-purple-500/30 bg-purple-500/5",
  },
  bug: {
    label: "Bug Report",
    icon: Bug,
    description: "Report unexpected diagnosis verdicts, crashes, or UI anomalies",
    activeBorder: "border-rose-500 ring-1 ring-rose-500/30 bg-rose-500/5",
  },
  improvement: {
    label: "Performance & UX",
    icon: Zap,
    description: "Suggest speed improvements, chart ergonomics, or navigation polish",
    activeBorder: "border-amber-500 ring-1 ring-amber-500/30 bg-amber-500/5",
  },
  general: {
    label: "General Feedback",
    icon: MessageSquare,
    description: "Share thoughts, praise, or overall experience with our team",
    activeBorder: "border-blue-500 ring-1 ring-blue-500/30 bg-blue-500/5",
  },
};

// ─── Area Labels ─────────────────────────────────────────────────────────────
const AREA_LABELS: Record<FeedbackArea, string> = {
  recovery_pipeline: "Recovery Strategies",
  drift_diagnostics: "Drift Diagnostics",
  benchmarks: "Benchmarks & Analytics",
  checkpoints: "Model Checkpoints",
  monitoring: "Real-time Monitoring",
  integrations: "Integrations & API",
  other: "General / Other",
};

// ─── Rating Options ──────────────────────────────────────────────────────────
const RATINGS = [
  { value: 1, emoji: "😡", label: "Frustrated" },
  { value: 2, emoji: "🙁", label: "Needs Work" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Satisfied" },
  { value: 5, emoji: "🚀", label: "Delighted!" },
];

export function FeedbackContent() {
  const queryClient = useQueryClient();

  // Navigation tab: "submit" | "roadmap"
  const [activeTab, setActiveTab] = React.useState<"submit" | "roadmap">("submit");

  // Form states
  const [selectedType, setSelectedType] = React.useState<FeedbackType>("feature");
  const [rating, setRating] = React.useState<number>(5);
  const [title, setTitle] = React.useState("");
  const [area, setArea] = React.useState<FeedbackArea>("recovery_pipeline");
  const [severity, setSeverity] = React.useState<FeedbackSeverity>("medium");
  const [description, setDescription] = React.useState("");
  const authorName = "Manthan Railkar";
  const authorEmail = "manthan@amrs.ai";
  const [includeContext, setIncludeContext] = React.useState(true);
  const [submittedTicket, setSubmittedTicket] = React.useState<FeedbackItem | null>(null);

  // Roadmap filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FeedbackStatus | "all">("all");
  const [typeFilter, setTypeFilter] = React.useState<FeedbackType | "all">("all");
  const [sortBy, setSortBy] = React.useState<"votes" | "recent">("votes");

  // ─── Queries ──────────────────────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ["feedback-stats"],
    queryFn: getFeedbackStats,
  });

  const listQuery = useQuery({
    queryKey: ["feedbacks", { status: statusFilter, type: typeFilter, search: searchQuery, sortBy }],
    queryFn: () =>
      listFeedbacks({
        status: statusFilter,
        type: typeFilter,
        search: searchQuery,
        sortBy,
      }),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: (input: CreateFeedbackInput) => submitFeedback(input),
    onSuccess: (data) => {
      setSubmittedTicket(data);
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
      toast.success("Feedback submitted successfully!", {
        description: `Ticket #${data.id} has been recorded and queued for engineering triage.`,
      });
    },
    onError: (err) => {
      toast.error("Submission failed", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: (id: string) => toggleVoteFeedback(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["feedbacks"] });
      const previous = queryClient.getQueryData<FeedbackItem[]>([
        "feedbacks",
        { status: statusFilter, type: typeFilter, search: searchQuery, sortBy },
      ]);

      if (previous) {
        queryClient.setQueryData<FeedbackItem[]>(
          ["feedbacks", { status: statusFilter, type: typeFilter, search: searchQuery, sortBy }],
          previous.map((item) => {
            if (item.id === id) {
              const hasVoted = Boolean(item.has_voted);
              return {
                ...item,
                votes: hasVoted ? Math.max(0, item.votes - 1) : item.votes + 1,
                has_voted: !hasVoted,
              };
            }
            return item;
          })
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["feedbacks", { status: statusFilter, type: typeFilter, search: searchQuery, sortBy }],
          context.previous
        );
      }
      toast.error("Could not record vote. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a title or summary for your feedback.");
      return;
    }
    if (description.trim().length < 15) {
      toast.error("Please add a little more detail in the description (at least 15 characters).");
      return;
    }

    submitMutation.mutate({
      title,
      description,
      type: selectedType,
      area,
      severity,
      rating,
      authorName,
      authorEmail,
      includeSystemContext: includeContext,
    });
  };

  const handleResetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedType("feature");
    setArea("recovery_pipeline");
    setSeverity("medium");
    setRating(5);
    setSubmittedTicket(null);
  };

  const insertTemplate = (templateTag: string) => {
    setDescription((prev) => (prev ? `${prev}\n\n${templateTag}:\n` : `${templateTag}:\n`));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* ─── Header & View Switcher ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Feedback & Roadmap
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/25 text-xs font-semibold">
              SaaS Beta Hub
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Help shape AMRS. Propose recovery strategies, report bugs, or vote on roadmap priorities.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div
          role="tablist"
          aria-label="Feedback views"
          className="inline-flex items-center p-1 rounded-xl bg-card border border-border shadow-2xs self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "submit"}
            onClick={() => setActiveTab("submit")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary",
              activeTab === "submit"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <Send className="size-3.5 sm:size-4" aria-hidden="true" />
            <span>Submit Feedback</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "roadmap"}
            onClick={() => setActiveTab("roadmap")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary",
              activeTab === "roadmap"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <Flame className="size-3.5 sm:size-4" aria-hidden="true" />
            <span>Community Roadmap</span>
            {statsQuery.data && (
              <span
                className={cn(
                  "ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full",
                  activeTab === "roadmap"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {statsQuery.data.totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Clean, Uncluttered Metric Strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-card/60 border border-border/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Requests</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {statsQuery.data ? statsQuery.data.totalCount : <Skeleton className="h-7 w-12" />}
            </p>
          </div>
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-card/60 border border-border/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">In Progress</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {statsQuery.data ? statsQuery.data.inProgressCount : <Skeleton className="h-7 w-12" />}
            </p>
          </div>
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Zap className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-card/60 border border-border/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Resolved</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {statsQuery.data ? statsQuery.data.completedCount : <Skeleton className="h-7 w-12" />}
            </p>
          </div>
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCheck className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-card/60 border border-border/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Satisfaction</p>
            <p className="text-xl sm:text-2xl font-bold text-primary mt-1">
              {statsQuery.data ? `${statsQuery.data.avgRating} / 5` : <Skeleton className="h-7 w-14" />}
            </p>
          </div>
          <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
            <HeartHandshake className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* ─── TAB 1: SUBMIT FEEDBACK FORM ────────────────────────────────────── */}
      {activeTab === "submit" && (
        <div className="w-full">
          {submittedTicket ? (
            /* Success Celebration Card */
            <Card className="max-w-2xl mx-auto border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 text-center space-y-5">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Check className="size-7" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30">
                  Ticket #{submittedTicket.id}
                </Badge>
                <h2 className="text-xl font-bold text-foreground">Thank You for Your Feedback!</h2>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
                  Your ticket has been logged in our engineering triage queue. Our team reviews all
                  submissions within 24-48 business hours.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border text-left max-w-lg mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{AREA_LABELS[submittedTicket.area]}</span>
                  <span className="capitalize font-medium">{submittedTicket.type} Request</span>
                </div>
                <h3 className="font-semibold text-sm text-foreground">{submittedTicket.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{submittedTicket.description}</p>
                {submittedTicket.admin_response && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/60 text-xs text-primary flex items-start gap-2">
                    <ShieldCheck className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-[11px]">{submittedTicket.admin_response.message}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleResetForm}>
                  <RotateCcw className="size-3.5 mr-1.5" aria-hidden="true" />
                  Submit Another
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveTab("roadmap");
                    setSubmittedTicket(null);
                  }}
                >
                  <Flame className="size-3.5 mr-1.5" aria-hidden="true" />
                  View on Roadmap
                </Button>
              </div>
            </Card>
          ) : (
            /* Refined, Spacious Form */
            <Card className="w-full border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5 px-6 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Tell Us What You Think</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                      Propose new recovery strategies, report bugs, or share UX ideas with engineering.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50 self-start sm:self-auto">
                    <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                    <span>Direct engineering line</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Feedback Category Cards */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Feedback Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(Object.keys(TYPE_CONFIG) as FeedbackType[]).map((typeKey) => {
                        const config = TYPE_CONFIG[typeKey];
                        const Icon = config.icon;
                        const isSelected = selectedType === typeKey;

                        return (
                          <button
                            key={typeKey}
                            type="button"
                            onClick={() => setSelectedType(typeKey)}
                            className={cn(
                              "flex flex-col p-3.5 rounded-xl border text-left transition-all cursor-pointer outline-none",
                              "focus-visible:ring-2 focus-visible:ring-primary",
                              isSelected
                                ? config.activeBorder
                                : "border-border/80 bg-card/60 hover:bg-card hover:border-border text-foreground"
                            )}
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <span
                                className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-transparent"
                                    : "bg-muted/70 text-muted-foreground border-border/60"
                                )}
                              >
                                <Icon className="size-3.5" aria-hidden="true" />
                              </span>
                              {isSelected && (
                                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-2.5" aria-hidden="true" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {config.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {config.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="feedback-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Title or Subject <span className="text-primary">*</span>
                      </label>
                      <span className="text-xs text-muted-foreground">{title.length}/100</span>
                    </div>
                    <Input
                      id="feedback-title"
                      value={title}
                      maxLength={100}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                      placeholder={
                        selectedType === "feature"
                          ? "e.g., Support for LoRA adapter fine-tuning on large vision-language models"
                          : selectedType === "bug"
                          ? "e.g., BatchNorm drift recalibration fails on out-of-distribution batches"
                          : "e.g., Make Pareto frontier charts interactive with residue zoom"
                      }
                      className="h-10 px-3 text-sm bg-card"
                      required
                    />
                  </div>

                  {/* Area & Severity Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Feature Area
                      </label>
                      <Select
                        selectedKey={area}
                        onSelectionChange={(key) => setArea(key as FeedbackArea)}
                      >
                        <SelectTrigger className="w-full h-10 text-xs bg-card">
                          <SelectValue placeholder="Select relevant area" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(AREA_LABELS) as FeedbackArea[]).map((areaKey) => (
                            <SelectItem key={areaKey} id={areaKey} textValue={AREA_LABELS[areaKey]}>
                              {AREA_LABELS[areaKey]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Severity / Impact
                      </label>
                      <Select
                        selectedKey={severity}
                        onSelectionChange={(key) => setSeverity(key as FeedbackSeverity)}
                      >
                        <SelectTrigger className="w-full h-10 text-xs bg-card">
                          <SelectValue placeholder="Select severity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem id="low" textValue="Low (Nice to have)">
                            Low (Nice to have)
                          </SelectItem>
                          <SelectItem id="medium" textValue="Medium (Workflow improvement)">
                            Medium (Workflow improvement)
                          </SelectItem>
                          <SelectItem id="high" textValue="High (Affects critical pipeline)">
                            High (Affects critical pipeline)
                          </SelectItem>
                          <SelectItem id="critical" textValue="Critical (System blocker)">
                            Critical (System blocker)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="feedback-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Description <span className="text-primary">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Insert:</span>
                        <button
                          type="button"
                          onClick={() => insertTemplate("[Use Case]")}
                          className="px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-[11px] transition-colors"
                        >
                          + Use Case
                        </button>
                        <button
                          type="button"
                          onClick={() => insertTemplate("[Steps to Reproduce]")}
                          className="px-2 py-0.5 rounded border border-border/80 bg-muted/40 hover:bg-muted text-[11px] transition-colors"
                        >
                          + Steps
                        </button>
                      </div>
                    </div>
                    <Textarea
                      id="feedback-desc"
                      rows={5}
                      value={description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDescription(e.target.value)
                      }
                      placeholder={
                        selectedType === "bug"
                          ? "Please describe the error, steps to trigger it, and any console or diagnosis logs..."
                          : "Describe your proposal, how it enhances model recovery workflows, and how you imagine it functioning..."
                      }
                      className="min-h-[120px] p-3 text-xs sm:text-sm bg-card"
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Minimum 15 characters • Supports Markdown</span>
                      <span>{description.length} chars</span>
                    </div>
                  </div>

                  {/* Overall Satisfaction & Submitter Strip */}
                  <div className="pt-2 border-t border-border/60 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Your Rating:</span>
                        <div className="flex items-center gap-1">
                          {RATINGS.map((item) => {
                            const isSelected = rating === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                title={item.label}
                                onClick={() => setRating(item.value)}
                                className={cn(
                                  "text-lg p-1.5 rounded-lg transition-all outline-none",
                                  isSelected
                                    ? "scale-115 bg-primary/10 ring-1 ring-primary/40 shadow-2xs"
                                    : "opacity-45 hover:opacity-100 hover:scale-110"
                                )}
                              >
                                <span aria-hidden="true">{item.emoji}</span>
                                <span className="sr-only">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Diagnostic Context Checkbox */}
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeContext}
                          onChange={(e) => setIncludeContext(e.target.checked)}
                          className="size-3.5 rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Attach session diagnostic telemetry</span>
                      </label>
                    </div>

                    {/* Author & Submit Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px]">
                          {authorName.charAt(0)}
                        </div>
                        <span>Submitting as <strong className="text-foreground font-medium">{authorName}</strong> ({authorEmail})</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetForm}
                          isDisabled={submitMutation.isPending}
                        >
                          Clear
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          isDisabled={submitMutation.isPending}
                          className="min-w-[140px]"
                        >
                          {submitMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <span className="size-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                              <span>Submitting…</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Send className="size-3.5" aria-hidden="true" />
                              <span>Send Feedback</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB 2: SAAS ROADMAP & COMMUNITY FEEDBACK BOARD ─────────────────── */}
      {activeTab === "roadmap" && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <Card className="p-3.5 sm:p-4 bg-card/60 border-border/80 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  placeholder="Search feedback tickets, proposals, or authors..."
                  className="pl-9 h-9.5 text-xs sm:text-sm bg-card"
                />
              </div>

              {/* Status filter pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "all", label: "All Status" },
                    { id: "planned", label: "Planned" },
                    { id: "in_progress", label: "In Progress" },
                    { id: "under_review", label: "Under Review" },
                    { id: "completed", label: "Completed" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors outline-none",
                      "focus-visible:ring-2 focus-visible:ring-primary",
                      statusFilter === s.id
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Sort By */}
              <div className="w-full sm:w-40">
                <Select
                  selectedKey={sortBy}
                  onSelectionChange={(key) => setSortBy(key as "votes" | "recent")}
                >
                  <SelectTrigger className="w-full h-9.5 text-xs bg-card">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id="votes" textValue="Most Upvoted">
                      Most Upvoted
                    </SelectItem>
                    <SelectItem id="recent" textValue="Newest First">
                      Newest First
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category / Type Filter Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1 mr-1.5">
                <SlidersHorizontal className="size-3" aria-hidden="true" />
                Type:
              </span>
              {(
                [
                  { id: "all", label: "All" },
                  { id: "feature", label: "Features", icon: Sparkles },
                  { id: "bug", label: "Bugs", icon: Bug },
                  { id: "improvement", label: "Performance", icon: Zap },
                  { id: "general", label: "General", icon: MessageSquare },
                ] as const
              ).map((t) => {
                const Icon = "icon" in t ? t.icon : null;
                const isSelected = typeFilter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeFilter(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-colors",
                      isSelected
                        ? "bg-secondary text-secondary-foreground border-primary/50 font-semibold"
                        : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="size-2.5" aria-hidden="true" />}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Cards List / Loading / Empty / Error States */}
          {listQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : listQuery.isError ? (
            <ErrorState
              title="Unable to load roadmap items"
              description="Could not connect to the feedback registry. Please try again."
              onRetry={() => listQuery.refetch()}
            />
          ) : listQuery.data && listQuery.data.length === 0 ? (
            <EmptyState
              title="No feedback found"
              description="No tickets match your active search or filter criteria. Try resetting filters."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Reset All Filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-3.5">
              {listQuery.data?.map((item) => {
                const statusMeta = STATUS_CONFIG[item.status];
                const StatusIcon = statusMeta.icon;
                const typeMeta = TYPE_CONFIG[item.type];
                const TypeIcon = typeMeta.icon;
                const hasVoted = Boolean(item.has_voted);

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "p-4 sm:p-5 transition-all border-border/80 hover:border-primary/40 bg-card/80 shadow-2xs",
                      hasVoted && "border-primary/25"
                    )}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Interactive Upvote Box */}
                      <button
                        type="button"
                        aria-label={`Upvote ticket #${item.id}, currently ${item.votes} votes`}
                        onClick={() => voteMutation.mutate(item.id)}
                        disabled={voteMutation.isPending}
                        className={cn(
                          "flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer outline-none shrink-0",
                          "focus-visible:ring-2 focus-visible:ring-primary",
                          hasVoted
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-foreground border-border"
                        )}
                      >
                        <ChevronUp
                          className={cn("size-3.5 transition-transform", hasVoted && "-translate-y-0.5")}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-bold leading-none mt-0.5">{item.votes}</span>
                      </button>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Badges strip */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            #{item.id}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                              statusMeta.badgeCls
                            )}
                          >
                            <StatusIcon className="size-3 shrink-0" aria-hidden="true" />
                            <span>{statusMeta.label}</span>
                          </span>

                          {/* Type Badge */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                            <TypeIcon className="size-3 shrink-0 text-primary" aria-hidden="true" />
                            <span>{typeMeta.label}</span>
                          </span>

                          {/* Area Badge */}
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            • {AREA_LABELS[item.area]}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* Telemetry context pill if included */}
                        {item.system_context && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/60 text-[11px] font-mono text-muted-foreground">
                            <Cpu className="size-3 text-primary shrink-0" aria-hidden="true" />
                            <span className="truncate max-w-lg">{item.system_context}</span>
                          </div>
                        )}

                        {/* Engineering Admin Response (if present) */}
                        {item.admin_response && (
                          <div className="mt-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium text-primary">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="size-3.5" aria-hidden="true" />
                                <span>
                                  {item.admin_response.author} ({item.admin_response.role})
                                </span>
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(item.admin_response.responded_at).toLocaleDateString(
                                  undefined,
                                  { month: "short", day: "numeric" }
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-foreground/90 leading-relaxed pl-5">
                              {item.admin_response.message}
                            </p>
                          </div>
                        )}

                        {/* Author metadata footer */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="size-4.5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[9px]">
                              {item.author.name.charAt(0)}
                            </div>
                            <span>{item.author.name}</span>
                          </div>
                          <span>
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
