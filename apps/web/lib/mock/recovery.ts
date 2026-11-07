/**
 * Fixed mock data for the recovery pages.
 * No Math.random() or Date.now() — all timestamps are fixed ISO strings.
 */
import type { HistoryRun, BenchmarkExt, MonitorThresholds, ConfigPreview } from "@/lib/schemas/recovery";

// ─── 31 history runs (19 accepted, 7 rolled_back, 5 healthy_no_action) ───────
// Architectures: mlp_small, small_cnn, resnet18_cifar
// Scenarios: S1-S6
// IDs match the runIds used in src/lib/mock/dashboard.ts (run-amrs-001..024) + 7 more

export const mockHistoryRuns: HistoryRun[] = [
  // ── run-amrs-001  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-001",
    model_name: "cifar10_v1",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.778,
    accuracy_after: 0.816,
    compute_units: 4.7,
    created_at: "2026-11-07T10:00:00.000Z",
  },
  // ── run-amrs-002  S4 rolled_back ────────────────────────────────────────────
  {
    id: "run-amrs-002",
    model_name: "text_cls_v2",
    architecture: "mlp_small",
    scenario_id: "S4",
    diagnosis_label: "unstable_training",
    verdict: "rolled_back",
    accuracy_before: 0.742,
    accuracy_after: null,
    compute_units: 14.4,
    created_at: "2026-11-07T11:15:00.000Z",
  },
  // ── run-amrs-003  S6 healthy ────────────────────────────────────────────────
  {
    id: "run-amrs-003",
    model_name: "digit_cnn_v3",
    architecture: "small_cnn",
    scenario_id: "S6",
    diagnosis_label: "healthy",
    verdict: "healthy_no_action",
    accuracy_before: 0.924,
    accuracy_after: 0.924,
    compute_units: 0.2,
    created_at: "2026-11-07T12:30:00.000Z",
  },
  // ── run-amrs-004  S2 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-004",
    model_name: "cifar10_v2",
    architecture: "resnet18_cifar",
    scenario_id: "S2",
    diagnosis_label: "miscalibration",
    verdict: "accepted",
    accuracy_before: 0.862,
    accuracy_after: 0.865,
    compute_units: 1.5,
    created_at: "2026-11-06T09:20:00.000Z",
  },
  // ── run-amrs-005  S3 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-005",
    model_name: "feature_mlp_v1",
    architecture: "mlp_small",
    scenario_id: "S3",
    diagnosis_label: "bn_drift",
    verdict: "accepted",
    accuracy_before: 0.751,
    accuracy_after: 0.812,
    compute_units: 2.1,
    created_at: "2026-11-06T14:05:00.000Z",
  },
  // ── run-amrs-006  S5 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-006",
    model_name: "leaf_cnn_v1",
    architecture: "small_cnn",
    scenario_id: "S5",
    diagnosis_label: "degraded_head",
    verdict: "accepted",
    accuracy_before: 0.698,
    accuracy_after: 0.842,
    compute_units: 4.5,
    created_at: "2026-11-05T16:45:00.000Z",
  },
  // ── run-amrs-007  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-007",
    model_name: "cifar10_v3",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.801,
    accuracy_after: 0.834,
    compute_units: 3.9,
    created_at: "2026-11-05T08:10:00.000Z",
  },
  // ── run-amrs-008  S4 rolled_back ────────────────────────────────────────────
  {
    id: "run-amrs-008",
    model_name: "mlp_tabular_v2",
    architecture: "mlp_small",
    scenario_id: "S4",
    diagnosis_label: "unstable_training",
    verdict: "rolled_back",
    accuracy_before: 0.715,
    accuracy_after: null,
    compute_units: 13.8,
    created_at: "2026-11-04T13:30:00.000Z",
  },
  // ── run-amrs-009  S6 healthy ────────────────────────────────────────────────
  {
    id: "run-amrs-009",
    model_name: "mnist_cnn_v1",
    architecture: "small_cnn",
    scenario_id: "S6",
    diagnosis_label: "healthy",
    verdict: "healthy_no_action",
    accuracy_before: 0.991,
    accuracy_after: 0.991,
    compute_units: 0.1,
    created_at: "2026-11-04T10:00:00.000Z",
  },
  // ── run-amrs-010  S2 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-010",
    model_name: "cifar100_v1",
    architecture: "resnet18_cifar",
    scenario_id: "S2",
    diagnosis_label: "miscalibration",
    verdict: "accepted",
    accuracy_before: 0.784,
    accuracy_after: 0.788,
    compute_units: 1.2,
    created_at: "2026-11-03T17:20:00.000Z",
  },
  // ── run-amrs-011  S3 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-011",
    model_name: "feature_mlp_v2",
    architecture: "mlp_small",
    scenario_id: "S3",
    diagnosis_label: "bn_drift",
    verdict: "accepted",
    accuracy_before: 0.733,
    accuracy_after: 0.791,
    compute_units: 2.3,
    created_at: "2026-11-03T11:00:00.000Z",
  },
  // ── run-amrs-012  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-012",
    model_name: "cifar10_aug_v1",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.812,
    accuracy_after: 0.849,
    compute_units: 4.2,
    created_at: "2026-11-02T14:40:00.000Z",
  },
  // ── run-amrs-013  S4 rolled_back ────────────────────────────────────────────
  {
    id: "run-amrs-013",
    model_name: "small_cnn_v4",
    architecture: "small_cnn",
    scenario_id: "S4",
    diagnosis_label: "unstable_training",
    verdict: "rolled_back",
    accuracy_before: 0.681,
    accuracy_after: null,
    compute_units: 12.6,
    created_at: "2026-11-02T09:15:00.000Z",
  },
  // ── run-amrs-014  S2 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-014",
    model_name: "mlp_cls_v3",
    architecture: "mlp_small",
    scenario_id: "S2",
    diagnosis_label: "miscalibration",
    verdict: "accepted",
    accuracy_before: 0.843,
    accuracy_after: 0.846,
    compute_units: 1.0,
    created_at: "2026-11-01T16:00:00.000Z",
  },
  // ── run-amrs-015  S5 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-015",
    model_name: "resnet_cifar_v2",
    architecture: "resnet18_cifar",
    scenario_id: "S5",
    diagnosis_label: "degraded_head",
    verdict: "accepted",
    accuracy_before: 0.712,
    accuracy_after: 0.851,
    compute_units: 4.5,
    created_at: "2026-10-31T12:30:00.000Z",
  },
  // ── run-amrs-016  S6 healthy ────────────────────────────────────────────────
  {
    id: "run-amrs-016",
    model_name: "cnn_flowers_v1",
    architecture: "small_cnn",
    scenario_id: "S6",
    diagnosis_label: "healthy",
    verdict: "healthy_no_action",
    accuracy_before: 0.942,
    accuracy_after: 0.942,
    compute_units: 0.2,
    created_at: "2026-10-30T10:50:00.000Z",
  },
  // ── run-amrs-017  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-017",
    model_name: "cifar10_v4",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.793,
    accuracy_after: 0.828,
    compute_units: 3.8,
    created_at: "2026-10-29T15:20:00.000Z",
  },
  // ── run-amrs-018  S4 rolled_back ────────────────────────────────────────────
  {
    id: "run-amrs-018",
    model_name: "mlp_tabular_v3",
    architecture: "mlp_small",
    scenario_id: "S4",
    diagnosis_label: "unstable_training",
    verdict: "rolled_back",
    accuracy_before: 0.698,
    accuracy_after: null,
    compute_units: 15.1,
    created_at: "2026-10-28T08:45:00.000Z",
  },
  // ── run-amrs-019  S3 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-019",
    model_name: "feature_cnn_v2",
    architecture: "small_cnn",
    scenario_id: "S3",
    diagnosis_label: "bn_drift",
    verdict: "accepted",
    accuracy_before: 0.762,
    accuracy_after: 0.818,
    compute_units: 2.0,
    created_at: "2026-10-27T14:00:00.000Z",
  },
  // ── run-amrs-020  S2 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-020",
    model_name: "resnet_tiny_v1",
    architecture: "resnet18_cifar",
    scenario_id: "S2",
    diagnosis_label: "miscalibration",
    verdict: "accepted",
    accuracy_before: 0.869,
    accuracy_after: 0.872,
    compute_units: 1.4,
    created_at: "2026-10-26T11:30:00.000Z",
  },
  // ── run-amrs-021  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-021",
    model_name: "cifar10_aug_v2",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.821,
    accuracy_after: 0.856,
    compute_units: 4.0,
    created_at: "2026-10-25T09:15:00.000Z",
  },
  // ── run-amrs-022  S4 rolled_back ────────────────────────────────────────────
  {
    id: "run-amrs-022",
    model_name: "small_cnn_v5",
    architecture: "small_cnn",
    scenario_id: "S4",
    diagnosis_label: "unstable_training",
    verdict: "rolled_back",
    accuracy_before: 0.705,
    accuracy_after: null,
    compute_units: 13.2,
    created_at: "2026-10-24T16:40:00.000Z",
  },
  // ── run-amrs-023  S6 healthy ────────────────────────────────────────────────
  {
    id: "run-amrs-023",
    model_name: "mlp_cls_v4",
    architecture: "mlp_small",
    scenario_id: "S6",
    diagnosis_label: "healthy",
    verdict: "healthy_no_action",
    accuracy_before: 0.908,
    accuracy_after: 0.908,
    compute_units: 0.1,
    created_at: "2026-10-23T13:00:00.000Z",
  },
  // ── run-amrs-024  S5 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-024",
    model_name: "leaf_cnn_v2",
    architecture: "small_cnn",
    scenario_id: "S5",
    diagnosis_label: "degraded_head",
    verdict: "accepted",
    accuracy_before: 0.721,
    accuracy_after: 0.859,
    compute_units: 4.5,
    created_at: "2026-10-22T10:20:00.000Z",
  },
  // ── run-amrs-025  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-025",
    model_name: "cifar10_v5",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.769,
    accuracy_after: 0.808,
    compute_units: 4.1,
    created_at: "2026-10-21T09:00:00.000Z",
  },
  // ── run-amrs-026  S2 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-026",
    model_name: "mlp_cls_v5",
    architecture: "mlp_small",
    scenario_id: "S2",
    diagnosis_label: "miscalibration",
    verdict: "accepted",
    accuracy_before: 0.831,
    accuracy_after: 0.835,
    compute_units: 0.9,
    created_at: "2026-10-20T14:30:00.000Z",
  },
  // ── run-amrs-027  S3 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-027",
    model_name: "feature_cnn_v3",
    architecture: "small_cnn",
    scenario_id: "S3",
    diagnosis_label: "bn_drift",
    verdict: "accepted",
    accuracy_before: 0.748,
    accuracy_after: 0.801,
    compute_units: 2.2,
    created_at: "2026-10-19T11:15:00.000Z",
  },
  // ── run-amrs-028  S4 rolled_back ────────────────────────────────────────────
  {
    id: "run-amrs-028",
    model_name: "small_cnn_v6",
    architecture: "small_cnn",
    scenario_id: "S4",
    diagnosis_label: "unstable_training",
    verdict: "rolled_back",
    accuracy_before: 0.693,
    accuracy_after: null,
    compute_units: 14.0,
    created_at: "2026-10-18T08:00:00.000Z",
  },
  // ── run-amrs-029  S5 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-029",
    model_name: "resnet_cifar_v3",
    architecture: "resnet18_cifar",
    scenario_id: "S5",
    diagnosis_label: "degraded_head",
    verdict: "accepted",
    accuracy_before: 0.708,
    accuracy_after: 0.844,
    compute_units: 4.6,
    created_at: "2026-10-17T15:45:00.000Z",
  },
  // ── run-amrs-030  S1 accepted ───────────────────────────────────────────────
  {
    id: "run-amrs-030",
    model_name: "cifar10_aug_v3",
    architecture: "resnet18_cifar",
    scenario_id: "S1",
    diagnosis_label: "overfitting",
    verdict: "accepted",
    accuracy_before: 0.796,
    accuracy_after: 0.831,
    compute_units: 3.7,
    created_at: "2026-10-16T12:00:00.000Z",
  },
  // ── run-amrs-031  S6 healthy ────────────────────────────────────────────────
  {
    id: "run-amrs-031",
    model_name: "mnist_mlp_v2",
    architecture: "mlp_small",
    scenario_id: "S6",
    diagnosis_label: "healthy",
    verdict: "healthy_no_action",
    accuracy_before: 0.976,
    accuracy_after: 0.976,
    compute_units: 0.1,
    created_at: "2026-10-15T09:30:00.000Z",
  },
];

// ─── Config previews per scenario ────────────────────────────────────────────

export const mockConfigPreviews: Record<string, ConfigPreview> = {
  S1: {
    scenarioId: "S1",
    split: { train: 0.70, val: 0.15, holdout: 0.15 },
    acceptance_policy: { min_accuracy_gain: 0.02, max_ece: 0.08, min_retention: 0.95 },
    compute_budget_cu: 20,
    strategy_order: [
      { strategy: "checkpoint_reversion",    label: "Checkpoint Reversion",    cost_units: 1.5 },
      { strategy: "temperature_scaling",     label: "Temperature Scaling",     cost_units: 0.8 },
      { strategy: "bn_recalibration",        label: "BN Recalibration",        cost_units: 1.2 },
      { strategy: "last_layer_retraining",   label: "Last-Layer Retraining",   cost_units: 4.5 },
      { strategy: "selective_finetune_l2sp", label: "Selective Fine-Tune + L2-SP", cost_units: 7.5 },
      { strategy: "weight_interpolation",    label: "Weight Interpolation",    cost_units: 3.2 },
    ],
  },
  S2: {
    scenarioId: "S2",
    split: { train: 0.70, val: 0.15, holdout: 0.15 },
    acceptance_policy: { min_accuracy_gain: 0.005, max_ece: 0.05, min_retention: 0.95 },
    compute_budget_cu: 15,
    strategy_order: [
      { strategy: "temperature_scaling",     label: "Temperature Scaling",     cost_units: 0.8 },
      { strategy: "bn_recalibration",        label: "BN Recalibration",        cost_units: 1.2 },
      { strategy: "weight_interpolation",    label: "Weight Interpolation",    cost_units: 3.2 },
      { strategy: "last_layer_retraining",   label: "Last-Layer Retraining",   cost_units: 4.5 },
      { strategy: "selective_finetune_l2sp", label: "Selective Fine-Tune + L2-SP", cost_units: 7.5 },
      { strategy: "checkpoint_reversion",    label: "Checkpoint Reversion",    cost_units: 1.5 },
    ],
  },
  S3: {
    scenarioId: "S3",
    split: { train: 0.65, val: 0.15, holdout: 0.20 },
    acceptance_policy: { min_accuracy_gain: 0.02, max_ece: 0.07, min_retention: 0.95 },
    compute_budget_cu: 20,
    strategy_order: [
      { strategy: "bn_recalibration",        label: "BN Recalibration",        cost_units: 1.2 },
      { strategy: "temperature_scaling",     label: "Temperature Scaling",     cost_units: 0.8 },
      { strategy: "weight_interpolation",    label: "Weight Interpolation",    cost_units: 3.2 },
      { strategy: "last_layer_retraining",   label: "Last-Layer Retraining",   cost_units: 4.5 },
      { strategy: "selective_finetune_l2sp", label: "Selective Fine-Tune + L2-SP", cost_units: 7.5 },
      { strategy: "checkpoint_reversion",    label: "Checkpoint Reversion",    cost_units: 1.5 },
    ],
  },
  S4: {
    scenarioId: "S4",
    split: { train: 0.70, val: 0.15, holdout: 0.15 },
    acceptance_policy: { min_accuracy_gain: 0.01, max_ece: 0.10, min_retention: 0.95 },
    compute_budget_cu: 25,
    strategy_order: [
      { strategy: "weight_interpolation",    label: "Weight Interpolation",    cost_units: 3.2 },
      { strategy: "temperature_scaling",     label: "Temperature Scaling",     cost_units: 0.8 },
      { strategy: "bn_recalibration",        label: "BN Recalibration",        cost_units: 1.2 },
      { strategy: "last_layer_retraining",   label: "Last-Layer Retraining",   cost_units: 4.5 },
      { strategy: "selective_finetune_l2sp", label: "Selective Fine-Tune + L2-SP", cost_units: 7.5 },
      { strategy: "checkpoint_reversion",    label: "Checkpoint Reversion",    cost_units: 1.5 },
    ],
  },
  S5: {
    scenarioId: "S5",
    split: { train: 0.70, val: 0.15, holdout: 0.15 },
    acceptance_policy: { min_accuracy_gain: 0.02, max_ece: 0.08, min_retention: 0.95 },
    compute_budget_cu: 20,
    strategy_order: [
      { strategy: "last_layer_retraining",   label: "Last-Layer Retraining",   cost_units: 4.5 },
      { strategy: "temperature_scaling",     label: "Temperature Scaling",     cost_units: 0.8 },
      { strategy: "bn_recalibration",        label: "BN Recalibration",        cost_units: 1.2 },
      { strategy: "selective_finetune_l2sp", label: "Selective Fine-Tune + L2-SP", cost_units: 7.5 },
      { strategy: "checkpoint_reversion",    label: "Checkpoint Reversion",    cost_units: 1.5 },
      { strategy: "weight_interpolation",    label: "Weight Interpolation",    cost_units: 3.2 },
    ],
  },
  S6: {
    scenarioId: "S6",
    split: { train: 0.70, val: 0.15, holdout: 0.15 },
    acceptance_policy: { min_accuracy_gain: 0.02, max_ece: 0.08, min_retention: 0.95 },
    compute_budget_cu: 10,
    strategy_order: [
      { strategy: "temperature_scaling",     label: "Temperature Scaling",     cost_units: 0.8 },
      { strategy: "bn_recalibration",        label: "BN Recalibration",        cost_units: 1.2 },
      { strategy: "checkpoint_reversion",    label: "Checkpoint Reversion",    cost_units: 1.5 },
      { strategy: "weight_interpolation",    label: "Weight Interpolation",    cost_units: 3.2 },
      { strategy: "last_layer_retraining",   label: "Last-Layer Retraining",   cost_units: 4.5 },
      { strategy: "selective_finetune_l2sp", label: "Selective Fine-Tune + L2-SP", cost_units: 7.5 },
    ],
  },
};

// ─── Extended benchmark data with retention ───────────────────────────────────

export const mockBenchmarkExts: BenchmarkExt[] = [
  {
    scenario_id: "S1",
    kpi: {
      compute_saved_rate: 0.952,  // vs full retrain 100 CU; AMRS uses ~4.8 CU
      avg_accuracy_gain: 0.042,
      avg_ece_reduction: 0.47,
      gate_rejection_rate: 0.38,
    },
    methods: [
      { method: "AMRS",                  accuracy_mean: 0.854, accuracy_std: 0.006, ece_mean: 0.042, ece_std: 0.004, compute_units_mean: 4.8,  wall_time_s_mean: 42.5,  retention_mean: 0.971, seeds: 5 },
      { method: "Early Stopping",        accuracy_mean: 0.812, accuracy_std: 0.012, ece_mean: 0.089, ece_std: 0.008, compute_units_mean: 18.0, wall_time_s_mean: 165.0, retention_mean: 0.942, seeds: 5 },
      { method: "Regularized Fine-Tuning", accuracy_mean: 0.838, accuracy_std: 0.009, ece_mean: 0.062, ece_std: 0.007, compute_units_mean: 32.5, wall_time_s_mean: 310.0, retention_mean: 0.958, seeds: 5 },
      { method: "Full Retraining",       accuracy_mean: 0.858, accuracy_std: 0.005, ece_mean: 0.048, ece_std: 0.005, compute_units_mean: 100.0, wall_time_s_mean: 980.0, retention_mean: 1.000, seeds: 5 },
    ],
  },
  {
    scenario_id: "S2",
    kpi: {
      compute_saved_rate: 0.985,
      avg_accuracy_gain: 0.012,
      avg_ece_reduction: 0.83,
      gate_rejection_rate: 0.22,
    },
    methods: [
      { method: "AMRS",                  accuracy_mean: 0.862, accuracy_std: 0.004, ece_mean: 0.024, ece_std: 0.003, compute_units_mean: 1.5,  wall_time_s_mean: 14.2,  retention_mean: 0.994, seeds: 5 },
      { method: "Early Stopping",        accuracy_mean: 0.825, accuracy_std: 0.011, ece_mean: 0.115, ece_std: 0.012, compute_units_mean: 22.0, wall_time_s_mean: 205.0, retention_mean: 0.938, seeds: 5 },
      { method: "Regularized Fine-Tuning", accuracy_mean: 0.849, accuracy_std: 0.008, ece_mean: 0.078, ece_std: 0.009, compute_units_mean: 38.0, wall_time_s_mean: 345.0, retention_mean: 0.961, seeds: 5 },
      { method: "Full Retraining",       accuracy_mean: 0.865, accuracy_std: 0.005, ece_mean: 0.052, ece_std: 0.006, compute_units_mean: 100.0, wall_time_s_mean: 995.0, retention_mean: 1.000, seeds: 5 },
    ],
  },
  {
    scenario_id: "S3",
    kpi: {
      compute_saved_rate: 0.979,
      avg_accuracy_gain: 0.045,
      avg_ece_reduction: 0.54,
      gate_rejection_rate: 0.30,
    },
    methods: [
      { method: "AMRS",                  accuracy_mean: 0.812, accuracy_std: 0.005, ece_mean: 0.045, ece_std: 0.004, compute_units_mean: 2.1,  wall_time_s_mean: 19.8,  retention_mean: 0.988, seeds: 5 },
      { method: "Early Stopping",        accuracy_mean: 0.768, accuracy_std: 0.013, ece_mean: 0.102, ece_std: 0.011, compute_units_mean: 20.0, wall_time_s_mean: 185.0, retention_mean: 0.935, seeds: 5 },
      { method: "Regularized Fine-Tuning", accuracy_mean: 0.795, accuracy_std: 0.009, ece_mean: 0.071, ece_std: 0.008, compute_units_mean: 34.0, wall_time_s_mean: 320.0, retention_mean: 0.952, seeds: 5 },
      { method: "Full Retraining",       accuracy_mean: 0.831, accuracy_std: 0.005, ece_mean: 0.052, ece_std: 0.005, compute_units_mean: 100.0, wall_time_s_mean: 975.0, retention_mean: 1.000, seeds: 5 },
    ],
  },
  {
    scenario_id: "S4",
    kpi: {
      compute_saved_rate: 0.856,
      avg_accuracy_gain: 0.000,  // rolled back — no net gain
      avg_ece_reduction: 0.00,
      gate_rejection_rate: 0.78,
    },
    methods: [
      { method: "AMRS",                  accuracy_mean: 0.742, accuracy_std: 0.012, ece_mean: 0.188, ece_std: 0.015, compute_units_mean: 14.4, wall_time_s_mean: 128.0, retention_mean: 0.910, seeds: 5 },
      { method: "Early Stopping",        accuracy_mean: 0.709, accuracy_std: 0.021, ece_mean: 0.238, ece_std: 0.022, compute_units_mean: 24.0, wall_time_s_mean: 215.0, retention_mean: 0.882, seeds: 5 },
      { method: "Regularized Fine-Tuning", accuracy_mean: 0.728, accuracy_std: 0.016, ece_mean: 0.212, ece_std: 0.018, compute_units_mean: 40.0, wall_time_s_mean: 380.0, retention_mean: 0.901, seeds: 5 },
      { method: "Full Retraining",       accuracy_mean: 0.773, accuracy_std: 0.009, ece_mean: 0.168, ece_std: 0.012, compute_units_mean: 100.0, wall_time_s_mean: 988.0, retention_mean: 1.000, seeds: 5 },
    ],
  },
  {
    scenario_id: "S5",
    kpi: {
      compute_saved_rate: 0.955,
      avg_accuracy_gain: 0.058,
      avg_ece_reduction: 0.69,
      gate_rejection_rate: 0.25,
    },
    methods: [
      { method: "AMRS",                  accuracy_mean: 0.851, accuracy_std: 0.007, ece_mean: 0.048, ece_std: 0.005, compute_units_mean: 4.5,  wall_time_s_mean: 40.1,  retention_mean: 0.976, seeds: 5 },
      { method: "Early Stopping",        accuracy_mean: 0.798, accuracy_std: 0.015, ece_mean: 0.108, ece_std: 0.013, compute_units_mean: 21.0, wall_time_s_mean: 192.0, retention_mean: 0.941, seeds: 5 },
      { method: "Regularized Fine-Tuning", accuracy_mean: 0.824, accuracy_std: 0.011, ece_mean: 0.078, ece_std: 0.009, compute_units_mean: 36.0, wall_time_s_mean: 342.0, retention_mean: 0.958, seeds: 5 },
      { method: "Full Retraining",       accuracy_mean: 0.858, accuracy_std: 0.006, ece_mean: 0.052, ece_std: 0.005, compute_units_mean: 100.0, wall_time_s_mean: 982.0, retention_mean: 1.000, seeds: 5 },
    ],
  },
];

// ─── Monitor thresholds ───────────────────────────────────────────────────────

export const mockMonitorThresholds: MonitorThresholds = {
  patience: 5,
  smoothing_window: 3,
  cooldown_epochs: 4,
  gap_threshold: 0.80,
};
