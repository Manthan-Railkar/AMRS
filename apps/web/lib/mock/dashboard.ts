import type { DashboardStats, UploadedModel } from "@/lib/schemas/dashboard";

// ─── Runs-over-time (last 8 weeks) ─────────────────────────────────────────
// Totals: accepted=19, rolledBack=7, healthy=5  →  sum=31

const runsOverTime: DashboardStats["runsOverTime"] = [
  { week: "Sep 13", accepted: 1, rolledBack: 0, healthy: 0, amrsCompute: 2.1,  fullRetrainCompute: 7.5  },
  { week: "Sep 20", accepted: 2, rolledBack: 1, healthy: 1, amrsCompute: 5.4,  fullRetrainCompute: 19.3 },
  { week: "Sep 27", accepted: 2, rolledBack: 1, healthy: 0, amrsCompute: 4.8,  fullRetrainCompute: 17.4 },
  { week: "Oct 04", accepted: 3, rolledBack: 1, healthy: 1, amrsCompute: 7.2,  fullRetrainCompute: 25.8 },
  { week: "Oct 11", accepted: 2, rolledBack: 1, healthy: 0, amrsCompute: 4.2,  fullRetrainCompute: 15.0 },
  { week: "Oct 18", accepted: 3, rolledBack: 1, healthy: 1, amrsCompute: 6.9,  fullRetrainCompute: 24.7 },
  { week: "Oct 25", accepted: 3, rolledBack: 1, healthy: 1, amrsCompute: 7.5,  fullRetrainCompute: 26.8 },
  { week: "Nov 01", accepted: 3, rolledBack: 1, healthy: 1, amrsCompute: 7.1,  fullRetrainCompute: 25.4 },
];

// ─── Diagnosis breakdown ───────────────────────────────────────────────────
// overfitting must be most common at 12; total must be >= 31 (each run may
// carry exactly one primary diagnosis; some runs produce multiple candidates)

const diagnosisCounts: DashboardStats["diagnosisCounts"] = [
  { label: "overfitting",       count: 12 },
  { label: "miscalibration",    count:  7 },
  { label: "bn_drift",          count:  5 },
  { label: "unstable_training", count:  4 },
  { label: "degraded_head",     count:  3 },
  { label: "healthy",           count:  5 },
];

// ─── Strategy stats ────────────────────────────────────────────────────────

const strategyStats: DashboardStats["strategyStats"] = [
  { strategy: "temperature_scaling",      attempts: 9,  accepted: 8, successRate: 0.89 },
  { strategy: "bn_recalibration",         attempts: 7,  accepted: 6, successRate: 0.86 },
  { strategy: "last_layer_retraining",    attempts: 11, accepted: 6, successRate: 0.55 },
  { strategy: "selective_finetune_l2sp",  attempts: 10, accepted: 5, successRate: 0.50 },
  { strategy: "checkpoint_reversion",     attempts: 8,  accepted: 5, successRate: 0.63 },
  { strategy: "weight_interpolation",     attempts: 9,  accepted: 2, successRate: 0.22 },
];

// ─── Aggregate KPI stats ───────────────────────────────────────────────────

export const mockDashboardStats: DashboardStats = {
  modelsUploaded: 24,
  modelsUploadedDeltaWeek: 5,
  recoveryRuns: 31,
  acceptedCount: 19,
  acceptedRate: 0.613,   // 19/31 ≈ 61%
  rolledBackCount: 7,
  rolledBackRate: 0.226, // 7/31  ≈ 23%
  healthyCount: 5,
  healthyRate: 0.161,    // 5/31  ≈ 16%
  avgAccuracyGainPp: 3.8,
  avgEceReductionRate: 0.41,
  computeSavedRate: 0.72,
  runsOverTime,
  diagnosisCounts,
  strategyStats,
};

// ─── Uploaded models (~24 rows) ────────────────────────────────────────────

export const mockUploadedModels: UploadedModel[] = [
  {
    id: "um-001", runId: "run-amrs-001",
    name: "cifar10_v1",         architecture: "resnet18_cifar", scenarioId: "S1",
    diagnosisLabel: "overfitting",        verdict: "accepted",
    accuracyBefore: 0.778, accuracyAfter: 0.816,
    uploadedAt: "2026-11-07T10:00:00.000Z",
  },
  {
    id: "um-002", runId: "run-amrs-002",
    name: "text_cls_v2",        architecture: "mlp_small",      scenarioId: "S4",
    diagnosisLabel: "unstable_training",  verdict: "rolled_back",
    accuracyBefore: 0.742, accuracyAfter: null,
    uploadedAt: "2026-11-07T11:15:00.000Z",
  },
  {
    id: "um-003", runId: "run-amrs-003",
    name: "digit_cnn_v3",       architecture: "small_cnn",      scenarioId: "S6",
    diagnosisLabel: "healthy",            verdict: "healthy_no_action",
    accuracyBefore: 0.924, accuracyAfter: 0.924,
    uploadedAt: "2026-11-07T12:30:00.000Z",
  },
  {
    id: "um-004", runId: "run-amrs-004",
    name: "cifar10_v2",         architecture: "resnet18_cifar", scenarioId: "S2",
    diagnosisLabel: "miscalibration",     verdict: "accepted",
    accuracyBefore: 0.862, accuracyAfter: 0.865,
    uploadedAt: "2026-11-06T09:20:00.000Z",
  },
  {
    id: "um-005", runId: "run-amrs-005",
    name: "feature_mlp_v1",     architecture: "mlp_small",      scenarioId: "S3",
    diagnosisLabel: "bn_drift",           verdict: "accepted",
    accuracyBefore: 0.751, accuracyAfter: 0.812,
    uploadedAt: "2026-11-06T14:05:00.000Z",
  },
  {
    id: "um-006", runId: "run-amrs-006",
    name: "leaf_cnn_v1",        architecture: "small_cnn",      scenarioId: "S5",
    diagnosisLabel: "degraded_head",      verdict: "accepted",
    accuracyBefore: 0.698, accuracyAfter: 0.842,
    uploadedAt: "2026-11-05T16:45:00.000Z",
  },
  {
    id: "um-007", runId: "run-amrs-007",
    name: "cifar10_v3",         architecture: "resnet18_cifar", scenarioId: "S1",
    diagnosisLabel: "overfitting",        verdict: "accepted",
    accuracyBefore: 0.801, accuracyAfter: 0.834,
    uploadedAt: "2026-11-05T08:10:00.000Z",
  },
  {
    id: "um-008", runId: "run-amrs-008",
    name: "mlp_tabular_v2",     architecture: "mlp_small",      scenarioId: "S4",
    diagnosisLabel: "unstable_training",  verdict: "rolled_back",
    accuracyBefore: 0.715, accuracyAfter: null,
    uploadedAt: "2026-11-04T13:30:00.000Z",
  },
  {
    id: "um-009", runId: "run-amrs-009",
    name: "mnist_cnn_v1",       architecture: "small_cnn",      scenarioId: "S6",
    diagnosisLabel: "healthy",            verdict: "healthy_no_action",
    accuracyBefore: 0.991, accuracyAfter: 0.991,
    uploadedAt: "2026-11-04T10:00:00.000Z",
  },
  {
    id: "um-010", runId: "run-amrs-010",
    name: "cifar100_v1",        architecture: "resnet18_cifar", scenarioId: "S2",
    diagnosisLabel: "miscalibration",     verdict: "accepted",
    accuracyBefore: 0.784, accuracyAfter: 0.788,
    uploadedAt: "2026-11-03T17:20:00.000Z",
  },
  {
    id: "um-011", runId: "run-amrs-011",
    name: "feature_mlp_v2",     architecture: "mlp_small",      scenarioId: "S3",
    diagnosisLabel: "bn_drift",           verdict: "accepted",
    accuracyBefore: 0.733, accuracyAfter: 0.791,
    uploadedAt: "2026-11-03T11:00:00.000Z",
  },
  {
    id: "um-012", runId: "run-amrs-012",
    name: "cifar10_aug_v1",     architecture: "resnet18_cifar", scenarioId: "S1",
    diagnosisLabel: "overfitting",        verdict: "accepted",
    accuracyBefore: 0.812, accuracyAfter: 0.849,
    uploadedAt: "2026-11-02T14:40:00.000Z",
  },
  {
    id: "um-013", runId: "run-amrs-013",
    name: "small_cnn_v4",       architecture: "small_cnn",      scenarioId: "S4",
    diagnosisLabel: "unstable_training",  verdict: "rolled_back",
    accuracyBefore: 0.681, accuracyAfter: null,
    uploadedAt: "2026-11-02T09:15:00.000Z",
  },
  {
    id: "um-014", runId: "run-amrs-014",
    name: "mlp_cls_v3",         architecture: "mlp_small",      scenarioId: "S2",
    diagnosisLabel: "miscalibration",     verdict: "accepted",
    accuracyBefore: 0.843, accuracyAfter: 0.846,
    uploadedAt: "2026-11-01T16:00:00.000Z",
  },
  {
    id: "um-015", runId: "run-amrs-015",
    name: "resnet_cifar_v2",    architecture: "resnet18_cifar", scenarioId: "S5",
    diagnosisLabel: "degraded_head",      verdict: "accepted",
    accuracyBefore: 0.712, accuracyAfter: 0.851,
    uploadedAt: "2026-10-31T12:30:00.000Z",
  },
  {
    id: "um-016", runId: "run-amrs-016",
    name: "cnn_flowers_v1",     architecture: "small_cnn",      scenarioId: "S6",
    diagnosisLabel: "healthy",            verdict: "healthy_no_action",
    accuracyBefore: 0.942, accuracyAfter: 0.942,
    uploadedAt: "2026-10-30T10:50:00.000Z",
  },
  {
    id: "um-017", runId: "run-amrs-017",
    name: "cifar10_v4",         architecture: "resnet18_cifar", scenarioId: "S1",
    diagnosisLabel: "overfitting",        verdict: "accepted",
    accuracyBefore: 0.793, accuracyAfter: 0.828,
    uploadedAt: "2026-10-29T15:20:00.000Z",
  },
  {
    id: "um-018", runId: "run-amrs-018",
    name: "mlp_tabular_v3",     architecture: "mlp_small",      scenarioId: "S4",
    diagnosisLabel: "unstable_training",  verdict: "rolled_back",
    accuracyBefore: 0.698, accuracyAfter: null,
    uploadedAt: "2026-10-28T08:45:00.000Z",
  },
  {
    id: "um-019", runId: "run-amrs-019",
    name: "feature_cnn_v2",     architecture: "small_cnn",      scenarioId: "S3",
    diagnosisLabel: "bn_drift",           verdict: "accepted",
    accuracyBefore: 0.762, accuracyAfter: 0.818,
    uploadedAt: "2026-10-27T14:00:00.000Z",
  },
  {
    id: "um-020", runId: "run-amrs-020",
    name: "resnet_tiny_v1",     architecture: "resnet18_cifar", scenarioId: "S2",
    diagnosisLabel: "miscalibration",     verdict: "accepted",
    accuracyBefore: 0.869, accuracyAfter: 0.872,
    uploadedAt: "2026-10-26T11:30:00.000Z",
  },
  {
    id: "um-021", runId: "run-amrs-021",
    name: "cifar10_aug_v2",     architecture: "resnet18_cifar", scenarioId: "S1",
    diagnosisLabel: "overfitting",        verdict: "accepted",
    accuracyBefore: 0.821, accuracyAfter: 0.856,
    uploadedAt: "2026-10-25T09:15:00.000Z",
  },
  {
    id: "um-022", runId: "run-amrs-022",
    name: "small_cnn_v5",       architecture: "small_cnn",      scenarioId: "S4",
    diagnosisLabel: "unstable_training",  verdict: "rolled_back",
    accuracyBefore: 0.705, accuracyAfter: null,
    uploadedAt: "2026-10-24T16:40:00.000Z",
  },
  {
    id: "um-023", runId: "run-amrs-023",
    name: "mlp_cls_v4",         architecture: "mlp_small",      scenarioId: "S6",
    diagnosisLabel: "healthy",            verdict: "healthy_no_action",
    accuracyBefore: 0.908, accuracyAfter: 0.908,
    uploadedAt: "2026-10-23T13:00:00.000Z",
  },
  {
    id: "um-024", runId: "run-amrs-024",
    name: "leaf_cnn_v2",        architecture: "small_cnn",      scenarioId: "S5",
    diagnosisLabel: "degraded_head",      verdict: "accepted",
    accuracyBefore: 0.721, accuracyAfter: 0.859,
    uploadedAt: "2026-10-22T10:20:00.000Z",
  },
];
