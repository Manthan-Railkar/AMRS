export type FeedbackType = "feature" | "bug" | "improvement" | "general";
export type FeedbackStatus = "under_review" | "planned" | "in_progress" | "completed";
export type FeedbackArea =
  | "recovery_pipeline"
  | "drift_diagnostics"
  | "benchmarks"
  | "checkpoints"
  | "monitoring"
  | "integrations"
  | "other";
export type FeedbackSeverity = "low" | "medium" | "high" | "critical";

export interface FeedbackAuthor {
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface AdminResponse {
  message: string;
  responded_at: string;
  author: string;
  role: string;
}

export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  type: FeedbackType;
  area: FeedbackArea;
  severity: FeedbackSeverity;
  rating?: number; // 1-5
  status: FeedbackStatus;
  votes: number;
  has_voted?: boolean;
  author: FeedbackAuthor;
  created_at: string;
  admin_response?: AdminResponse;
  system_context?: string;
}

export const mockFeedbacks: FeedbackItem[] = [
  {
    id: "FB-101",
    title: "Support for LoRA & PEFT checkpoint adapters during selective fine-tuning",
    description:
      "When recovering overfitted vision-language models, full-rank fine-tuning consumes excessive GPU memory. Having direct support for Low-Rank Adaptation (LoRA) or prefix tuning would allow 4x lower VRAM consumption and faster recovery iterations.",
    type: "feature",
    area: "recovery_pipeline",
    severity: "high",
    rating: 5,
    status: "planned",
    votes: 94,
    has_voted: true,
    author: {
      name: "Dr. Elena Rostova",
      email: "elena.rostova@deepmind-labs.org",
      role: "Principal ML Systems Engineer",
    },
    created_at: "2026-11-04T14:22:00Z",
    admin_response: {
      message:
        "We have prioritized this for the upcoming v0.2.0 recovery engine milestone. We will support LoRA adapters with configurable rank (r=4..64) and selective freezing for transformer architectures.",
      responded_at: "2026-11-05T09:15:00Z",
      author: "AMRS Core Team",
      role: "Platform Architecture",
    },
    system_context: "AMRS v0.1.0-beta • PyTorch 2.4.0 • CUDA 12.4 • H100 SXM5",
  },
  {
    id: "FB-102",
    title: "Automated export of Recovery Audit Reports in SARIF and PDF format",
    description:
      "Enterprise governance and safety audits require compliance documentation after automated recovery runs. Please allow single-click export of recovery verification logs, ECE calibration tables, and weight rollback rationale.",
    type: "feature",
    area: "benchmarks",
    severity: "medium",
    rating: 4,
    status: "in_progress",
    votes: 78,
    has_voted: false,
    author: {
      name: "Marcus Vance",
      email: "m.vance@safeml-compliance.com",
      role: "Head of AI Governance",
    },
    created_at: "2026-11-03T11:05:00Z",
    admin_response: {
      message:
        "Feature is currently under active development. PDF audit reports with signed verification hashes are scheduled to enter preview next week.",
      responded_at: "2026-11-04T16:30:00Z",
      author: "Sarah Lin",
      role: "Senior Product Manager",
    },
    system_context: "AMRS Enterprise Edition • Multi-tenant Workspace",
  },
  {
    id: "FB-103",
    title: "BatchNorm recalibration running stats divergence warning on out-of-distribution batches",
    description:
      "When running Scenario S3 (BN Drift) on heavy domain shifts, running variance sometimes spikes without an explicit alert badge in the inspector. An inline divergence warning badge would help triage edge cases faster.",
    type: "improvement",
    area: "drift_diagnostics",
    severity: "medium",
    rating: 4,
    status: "under_review",
    votes: 52,
    has_voted: false,
    author: {
      name: "Carlos Gomez",
      email: "carlos.g@autonomousvision.io",
      role: "Computer Vision Researcher",
    },
    created_at: "2026-11-06T08:45:00Z",
    admin_response: {
      message:
        "Great catch! We are evaluating adding a statistical threshold check (Mahalanobis distance > 3.0 sigma) directly to the BatchNorm drift card.",
      responded_at: "2026-11-06T13:10:00Z",
      author: "David Kim",
      role: "Diagnostics Lead",
    },
    system_context: "AMRS v0.1.0-beta • ResNet-50 • DomainNet Real-to-Clipart",
  },
  {
    id: "FB-104",
    title: "Direct integration with Weights & Biases (W&B) and MLflow run logging",
    description:
      "We track all training experiments in W&B. It would be fantastic if AMRS recovery runs could automatically log checkpoints, before/after Pareto frontier points, and candidate validation metrics to our existing W&B project.",
    type: "feature",
    area: "integrations",
    severity: "high",
    rating: 5,
    status: "planned",
    votes: 112,
    has_voted: true,
    author: {
      name: "Aisha Patel",
      email: "aisha@mlops-scale.net",
      role: "MLOps Lead Architect",
    },
    created_at: "2026-11-01T17:30:00Z",
    admin_response: {
      message:
        "Official W&B and MLflow export connectors are spec'd out and slated for integration in Q1. Webhooks support will also be included.",
      responded_at: "2026-11-02T10:00:00Z",
      author: "AMRS Integrations Team",
      role: "Ecosystem Engineering",
    },
    system_context: "W&B Enterprise Server v0.17 • Python SDK 0.22",
  },
  {
    id: "FB-105",
    title: "Dark mode contrast on ROC curve thresholds chart needs calibration",
    description:
      "In deep violet dark theme, the secondary threshold guideline on the ROC curves chart was slightly low contrast against the card background on certain OLED displays.",
    type: "bug",
    area: "monitoring",
    severity: "low",
    rating: 3,
    status: "completed",
    votes: 36,
    has_voted: false,
    author: {
      name: "Siddharth Nair",
      email: "sid@visioncore.ai",
      role: "Frontend & Visualization Eng",
    },
    created_at: "2026-10-28T19:15:00Z",
    admin_response: {
      message:
        "Resolved in build 16.4.2! Contrast ratio now exceeds 6.2:1 with explicit high-contrast strokes and dual tooltip markers.",
      responded_at: "2026-10-30T14:40:00Z",
      author: "UI Engineering Team",
      role: "Design Systems",
    },
    system_context: "Safari 18.0 • macOS Sonoma • Display P3",
  },
  {
    id: "FB-106",
    title: "Support for multi-GPU SWA (Stochastic Weight Averaging) distributed sync",
    description:
      "When running SWA recovery on massive vision transformers (ViT-L/16), we need PyTorch DDP / FSDP all-reduce synchronization across nodes during snapshot collection.",
    type: "feature",
    area: "recovery_pipeline",
    severity: "critical",
    rating: 5,
    status: "in_progress",
    votes: 85,
    has_voted: true,
    author: {
      name: "Liam O'Connor",
      email: "liam@distributedscale.org",
      role: "Distributed Training Specialist",
    },
    created_at: "2026-11-02T22:10:00Z",
    admin_response: {
      message:
        "NCCL-based gradient and parameter synchronization for multi-GPU SWA is currently undergoing stress testing across 8x H100 clusters.",
      responded_at: "2026-11-03T18:20:00Z",
      author: "AMRS Core Team",
      role: "Platform Architecture",
    },
    system_context: "Slurm cluster • 8x H100 NVLink • InfiniBand 400Gbps",
  },
  {
    id: "FB-107",
    title: "Add confidence interval bands on ECE (Expected Calibration Error) graphs",
    description:
      "Providing Wilson score or bootstrap confidence intervals around the reliability curve bins would make post-hoc temperature scaling verdicts much easier to defend in clinical validation.",
    type: "improvement",
    area: "drift_diagnostics",
    severity: "medium",
    rating: 4,
    status: "under_review",
    votes: 41,
    has_voted: false,
    author: {
      name: "Rachel Green",
      email: "rachel.green@biomed-ai.com",
      role: "Clinical ML Researcher",
    },
    created_at: "2026-11-05T15:40:00Z",
    system_context: "AMRS Medical Suite • 10-bin Reliability Diagrams",
  },
  {
    id: "FB-108",
    title: "Checkpoint upload drag-and-drop should accept .safetensors files natively",
    description:
      "Many modern HuggingFace and diffusion models store weights as .safetensors rather than .pt / .pth / .ckpt. It would save a lot of conversion hassle if AMRS accepted safetensors directly.",
    type: "feature",
    area: "checkpoints",
    severity: "high",
    rating: 5,
    status: "completed",
    votes: 119,
    has_voted: true,
    author: {
      name: "Felix Moreau",
      email: "felix.m@generativeml.fr",
      role: "Lead Foundation Model Eng",
    },
    created_at: "2026-10-25T13:00:00Z",
    admin_response: {
      message:
        "Shipped in the latest release! The checkpoint dropzone now accepts .safetensors alongside PyTorch state dictionaries.",
      responded_at: "2026-10-27T11:25:00Z",
      author: "AMRS Core Team",
      role: "Platform Architecture",
    },
    system_context: "HuggingFace Hub • Safetensors v0.4.3",
  },
];

