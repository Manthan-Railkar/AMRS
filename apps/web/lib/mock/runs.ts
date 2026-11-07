import type { Run } from "@/lib/api/types";

export const mockAcceptedRun: Run = {
  id: "run-amrs-001",
  scenario_id: "S1",
  architecture: "ResNet-50",
  status: "succeeded",
  stage_label: "Completed: recovery candidate accepted",
  progress: 100,
  created_at: "2026-11-07T10:00:00.000Z",
  finished_at: "2026-11-07T10:03:45.000Z",
  verdict: "accepted",
  diagnosis: [
    {
      label: "overfitting",
      confidence: 0.94,
      evidence: [
        "Train loss continued declining to 0.18 while val loss climbed to 0.98 (+0.80 gap)",
        "Generalization divergence observed starting at epoch 18",
        "Validation accuracy dropped by 5.4% from peak checkpoint at epoch 14",
      ],
    },
  ],
  candidates: [
    {
      strategy: "checkpoint_reversion",
      cost_units: 1.5,
      delta_primary: 0.038,
      ci_low: 0.024,
      ci_high: 0.052,
      retention: 0.965,
      gate_decision: "accepted",
      gate_reasons: [
        "Delta primary accuracy +0.038 exceeds required +0.020",
        "Retention 0.965 meets required 0.950",
        "Cheapest passing recovery strategy accepted (1.5 CU)",
      ],
    },
    {
      strategy: "selective_finetune_l2sp",
      cost_units: 6.8,
      delta_primary: 0.041,
      ci_low: 0.028,
      ci_high: 0.054,
      retention: 0.978,
      gate_decision: "skipped",
      gate_reasons: [
        "Skipped: cheaper viable candidate (checkpoint_reversion at 1.5 CU) already accepted",
        "Candidate cost of 6.8 CU exceeds accepted candidate cost of 1.5 CU",
      ],
    },
    {
      strategy: "weight_interpolation",
      cost_units: 3.2,
      delta_primary: 0.012,
      ci_low: -0.004,
      ci_high: 0.028,
      retention: 0.932,
      gate_decision: "rejected",
      gate_reasons: [
        "Retention 0.932 below required 0.950",
        "Confidence interval lower bound -0.004 falls below minimum +0.005",
      ],
    },
  ],
  original_metrics: {
    accuracy: 0.778,
    ece: 0.134,
    nll: 0.892,
  },
  accepted_metrics: {
    accuracy: 0.816,
    ece: 0.058,
    nll: 0.54,
  },
  compute_units: 4.7,
  artifacts: [
    { name: "reverted_checkpoint_epoch14.pt", size_bytes: 102450800 },
    { name: "candidate_eval_matrix.json", size_bytes: 12480 },
    { name: "gate_verification_summary.pdf", size_bytes: 348200 },
  ],
  error: null,
  cancel_requested: false,
};

export const mockRolledBackRun: Run = {
  id: "run-amrs-002",
  scenario_id: "S4",
  architecture: "RoBERTa-Base",
  status: "succeeded",
  stage_label: "Completed: all candidates failed gates, rolled back",
  progress: 100,
  created_at: "2026-11-07T11:15:00.000Z",
  finished_at: "2026-11-07T11:21:12.000Z",
  verdict: "rolled_back",
  diagnosis: [
    {
      label: "unstable_training",
      confidence: 0.91,
      evidence: [
        "Sudden gradient norm explosion (14.8x baseline) at epoch 14",
        "Validation loss oscillation amplitude > 0.85 across consecutive epochs",
        "Severe representation divergence in penultimate layer",
      ],
    },
  ],
  candidates: [
    {
      strategy: "weight_interpolation",
      cost_units: 2.4,
      delta_primary: -0.015,
      ci_low: -0.032,
      ci_high: 0.002,
      retention: 0.91,
      gate_decision: "rejected",
      gate_reasons: [
        "Retention 0.91 below required 0.95",
        "Delta primary accuracy -0.015 below required +0.010",
      ],
    },
    {
      strategy: "last_layer_retraining",
      cost_units: 4.8,
      delta_primary: 0.004,
      ci_low: -0.011,
      ci_high: 0.019,
      retention: 0.885,
      gate_decision: "rejected",
      gate_reasons: [
        "Retention 0.885 below required 0.95",
        "Confidence interval spans zero (-0.011 to 0.019)",
      ],
    },
    {
      strategy: "selective_finetune_l2sp",
      cost_units: 7.2,
      delta_primary: -0.008,
      ci_low: -0.024,
      ci_high: 0.008,
      retention: 0.923,
      gate_decision: "rejected",
      gate_reasons: [
        "Retention 0.923 below required 0.95",
        "Validation loss divergence threshold exceeded (NLL 0.785 > 0.650)",
      ],
    },
  ],
  original_metrics: {
    accuracy: 0.742,
    ece: 0.188,
    nll: 0.945,
  },
  accepted_metrics: null,
  compute_units: 14.4,
  artifacts: [
    { name: "rollback_checkpoint_state.pt", size_bytes: 498210300 },
    { name: "candidate_failure_analysis.json", size_bytes: 18450 },
    { name: "gate_rejection_audit.log", size_bytes: 9240 },
  ],
  error: null,
  cancel_requested: false,
};

export const mockHealthyRun: Run = {
  id: "run-amrs-003",
  scenario_id: "S6",
  architecture: "VisionTransformer-B/16",
  status: "succeeded",
  stage_label: "Completed: model verified healthy, no action needed",
  progress: 100,
  created_at: "2026-11-07T12:30:00.000Z",
  finished_at: "2026-11-07T12:31:08.000Z",
  verdict: "healthy_no_action",
  diagnosis: [
    {
      label: "healthy",
      confidence: 0.99,
      evidence: [
        "Validation loss monotonically converges at 0.285",
        "Expected Calibration Error (ECE 0.028) well below target ceiling (0.050)",
        "Zero gradient anomalies or representation drift detected across 40 epochs",
      ],
    },
  ],
  candidates: [],
  original_metrics: {
    accuracy: 0.924,
    ece: 0.028,
    nll: 0.285,
  },
  accepted_metrics: {
    accuracy: 0.924,
    ece: 0.028,
    nll: 0.285,
  },
  compute_units: 0.2,
  artifacts: [
    { name: "health_verification_audit.json", size_bytes: 4120 },
    { name: "diagnostic_telemetry.csv", size_bytes: 15890 },
  ],
  error: null,
  cancel_requested: false,
};

export const mockRuns: Run[] = [
  mockAcceptedRun,
  mockRolledBackRun,
  mockHealthyRun,
];
