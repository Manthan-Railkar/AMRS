import { delay } from "./client";
import {
  mockFeedbacks,
  type FeedbackItem,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackArea,
  type FeedbackSeverity,
} from "@/lib/mock/feedback";

export * from "@/lib/mock/feedback";

export interface ListFeedbacksParams {
  type?: FeedbackType | "all";
  status?: FeedbackStatus | "all";
  area?: FeedbackArea | "all";
  search?: string;
  sortBy?: "votes" | "recent";
}

export interface CreateFeedbackInput {
  title: string;
  description: string;
  type: FeedbackType;
  area: FeedbackArea;
  severity: FeedbackSeverity;
  rating?: number;
  authorName?: string;
  authorEmail?: string;
  includeSystemContext?: boolean;
}

export interface FeedbackStats {
  totalCount: number;
  plannedCount: number;
  inProgressCount: number;
  completedCount: number;
  totalVotes: number;
  avgRating: number;
}

// In-memory persistent store during session
const feedbackStore = new Map<string, FeedbackItem>();
for (const item of mockFeedbacks) {
  feedbackStore.set(item.id, structuredClone(item));
}

let ticketCounter = 109;

/**
 * Retrieve aggregated statistics for feedback submissions and roadmap items.
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  await delay(120);

  const items = Array.from(feedbackStore.values());
  const totalCount = items.length;
  const plannedCount = items.filter((f) => f.status === "planned").length;
  const inProgressCount = items.filter((f) => f.status === "in_progress").length;
  const completedCount = items.filter((f) => f.status === "completed").length;
  const totalVotes = items.reduce((acc, curr) => acc + curr.votes, 0);

  const ratings = items.map((f) => f.rating).filter((r): r is number => typeof r === "number");
  const avgRating =
    ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 4.8;

  return {
    totalCount,
    plannedCount,
    inProgressCount,
    completedCount,
    totalVotes,
    avgRating,
  };
}

/**
 * List feedback items matching optional filters and search query.
 */
export async function listFeedbacks(params: ListFeedbacksParams = {}): Promise<FeedbackItem[]> {
  await delay(160);

  let items = Array.from(feedbackStore.values());

  if (params.type && params.type !== "all") {
    items = items.filter((item) => item.type === params.type);
  }

  if (params.status && params.status !== "all") {
    items = items.filter((item) => item.status === params.status);
  }

  if (params.area && params.area !== "all") {
    items = items.filter((item) => item.area === params.area);
  }

  if (params.search?.trim()) {
    const q = params.search.toLowerCase().trim();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.author.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }

  if (params.sortBy === "recent") {
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    // Default to most upvoted
    items.sort((a, b) => b.votes - a.votes);
  }

  return structuredClone(items);
}

/**
 * Submit a new feedback or feature request ticket.
 */
export async function submitFeedback(input: CreateFeedbackInput): Promise<FeedbackItem> {
  await delay(320);

  const newId = `FB-${ticketCounter++}`;
  const now = new Date().toISOString();

  const newItem: FeedbackItem = {
    id: newId,
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    area: input.area,
    severity: input.severity,
    rating: input.rating ?? 5,
    status: "under_review",
    votes: 1,
    has_voted: true,
    author: {
      name: input.authorName?.trim() || "Manthan Railkar",
      email: input.authorEmail?.trim() || "manthan@amrs.ai",
      role: "ML Platform Engineer",
    },
    created_at: now,
    admin_response: {
      message:
        "Thank you for submitting! Our engineering triage group has received this item and is currently evaluating it against our upcoming roadmap.",
      responded_at: now,
      author: "AMRS Auto-Triage",
      role: "Feedback Systems",
    },
    system_context: input.includeSystemContext
      ? "AMRS v0.1.0-beta • Next.js 16 (Turbopack) • PyTorch 2.4 Engine • Client Environment Active"
      : undefined,
  };

  feedbackStore.set(newId, newItem);
  return structuredClone(newItem);
}

/**
 * Toggle upvote for a feedback item.
 */
export async function toggleVoteFeedback(
  id: string
): Promise<{ id: string; votes: number; has_voted: boolean }> {
  await delay(100);

  const item = feedbackStore.get(id);
  if (!item) {
    throw new Error(`Feedback with id ${id} not found.`);
  }

  const hasVoted = Boolean(item.has_voted);
  if (hasVoted) {
    item.votes = Math.max(0, item.votes - 1);
    item.has_voted = false;
  } else {
    item.votes += 1;
    item.has_voted = true;
  }

  feedbackStore.set(id, item);
  return {
    id,
    votes: item.votes,
    has_voted: item.has_voted,
  };
}

