import type { Benchmark } from "@/lib/api/types";

export const mockS1Benchmark: Benchmark = {
  scenario_id: "S1",
  methods: [
    {
      method: "AMRS",
      accuracy_mean: 0.854,
      accuracy_std: 0.006,
      ece_mean: 0.042,
      ece_std: 0.004,
      compute_units_mean: 4.8,
      wall_time_s_mean: 42.5,
      seeds: 5,
    },
    {
      method: "Early Stopping",
      accuracy_mean: 0.812,
      accuracy_std: 0.012,
      ece_mean: 0.089,
      ece_std: 0.008,
      compute_units_mean: 18.0,
      wall_time_s_mean: 165.0,
      seeds: 5,
    },
    {
      method: "Regularized Fine-Tuning",
      accuracy_mean: 0.838,
      accuracy_std: 0.009,
      ece_mean: 0.062,
      ece_std: 0.007,
      compute_units_mean: 32.5,
      wall_time_s_mean: 310.0,
      seeds: 5,
    },
    {
      method: "Full Retraining",
      accuracy_mean: 0.858,
      accuracy_std: 0.005,
      ece_mean: 0.048,
      ece_std: 0.005,
      compute_units_mean: 100.0,
      wall_time_s_mean: 980.0,
      seeds: 5,
    },
  ],
};

export const mockS2Benchmark: Benchmark = {
  scenario_id: "S2",
  methods: [
    {
      method: "AMRS",
      accuracy_mean: 0.862,
      accuracy_std: 0.004,
      ece_mean: 0.024,
      ece_std: 0.003,
      compute_units_mean: 1.5,
      wall_time_s_mean: 14.2,
      seeds: 5,
    },
    {
      method: "Early Stopping",
      accuracy_mean: 0.825,
      accuracy_std: 0.011,
      ece_mean: 0.115,
      ece_std: 0.012,
      compute_units_mean: 22.0,
      wall_time_s_mean: 205.0,
      seeds: 5,
    },
    {
      method: "Regularized Fine-Tuning",
      accuracy_mean: 0.849,
      accuracy_std: 0.008,
      ece_mean: 0.078,
      ece_std: 0.009,
      compute_units_mean: 38.0,
      wall_time_s_mean: 345.0,
      seeds: 5,
    },
    {
      method: "Full Retraining",
      accuracy_mean: 0.865,
      accuracy_std: 0.005,
      ece_mean: 0.052,
      ece_std: 0.006,
      compute_units_mean: 100.0,
      wall_time_s_mean: 995.0,
      seeds: 5,
    },
  ],
};

export const mockBenchmarks: Benchmark[] = [
  mockS1Benchmark,
  mockS2Benchmark,
];
