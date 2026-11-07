import type { Scenario, ScenarioId } from "@/lib/api/types";

export const mockScenarios: Scenario[] = [
  {
    id: "S1",
    name: "Overfit",
    failure_mode: "Generalization gap divergence: validation loss increases while training loss continues decreasing",
    description: "Model overfits training distribution due to excessive capacity or insufficient regularization during extended training epochs.",
    expected_recovery: "Checkpoint reversion to pre-divergence epoch or selective fine-tuning with L2-SP constraint.",
  },
  {
    id: "S2",
    name: "Miscalibrated",
    failure_mode: "Confidence-accuracy misalignment: elevated Expected Calibration Error (ECE) despite high top-1 accuracy",
    description: "Model exhibits overconfidence on ambiguous and out-of-distribution inputs, producing poorly calibrated posterior probabilities.",
    expected_recovery: "Post-hoc temperature scaling on validation set logits to recalibrate confidence scores without altering top-1 ranking.",
  },
  {
    id: "S3",
    name: "BN Drift",
    failure_mode: "Internal covariate shift: running batch normalization statistics diverge from test distribution",
    description: "Batch normalization running mean and variance statistics drift away from the target evaluation domain distribution.",
    expected_recovery: "Batch normalization recalibration across target samples with frozen model feature weights.",
  },
  {
    id: "S4",
    name: "Unstable Training",
    failure_mode: "Gradient instability: severe loss spikes and oscillatory validation accuracy across consecutive epochs",
    description: "Suboptimal learning rate schedule or optimizer momentum causes parameter oscillation and catastrophic gradient spikes.",
    expected_recovery: "Weight interpolation (Stochastic Weight Averaging / Polyak averaging) across stable trajectory checkpoints.",
  },
  {
    id: "S5",
    name: "Degraded Head",
    failure_mode: "Classification head corruption: final linear projection collapses while backbone representations remain intact",
    description: "Final classification layers undergo catastrophic forgetting or representation collapse under late-stage fine-tuning.",
    expected_recovery: "Last layer retraining on a balanced validation slice while keeping the backbone feature extractor frozen.",
  },
  {
    id: "S6",
    name: "Healthy Control",
    failure_mode: "None: nominal training trajectory with stable convergence across all primary metrics",
    description: "Baseline control model maintaining monotonic loss reduction, balanced calibration, and stable feature representations.",
    expected_recovery: "No recovery action required; preserve current deployment weights.",
  },
];

export const mockScenarioMap: Record<ScenarioId, Scenario> = {
  S1: mockScenarios[0],
  S2: mockScenarios[1],
  S3: mockScenarios[2],
  S4: mockScenarios[3],
  S5: mockScenarios[4],
  S6: mockScenarios[5],
};
