export interface TestimonialStat {
  label: string;
  value: string;
}

export interface TestimonialItem {
  id: number;
  tag: string;
  company: string;
  quote: string;
  problem: string;
  recovery: string;
  author: string;
  role: string;
  avatar: string;
  fallbackAvatar: string;
  statsTitle: string;
  stats: TestimonialStat[];
}

export const testimonialsData: TestimonialItem[] = [
  {
    id: 1,
    tag: 'Scenario S1 — Reproducible Benchmark',
    company: 'Overfitting Recovery',
    quote:
      'Training and validation performance diverge as the model memorizes spurious training features. AMRS automatically initiates checkpoint averaging across stationary validation epochs and selective fine-tuning constrained by L2-SP regularization to preserve learned general representations.',
    problem: 'Training and validation performance diverge.',
    recovery: 'Checkpoint averaging or selective fine-tuning with L2-SP.',
    author: 'ResNet18 CIFAR',
    role: 'Scenario S1 Benchmark',
    avatar: '/assets/img/g03-wave.jpg',
    fallbackAvatar: '/assets/img/g03-wave.jpg',
    statsTitle: 'Experiment Details',
    stats: [
      { label: 'Scenario', value: 'S1' },
      { label: 'Model', value: 'ResNet18 CIFAR' },
      { label: 'Problem', value: 'Train/Val Divergence' },
      { label: 'Expected Recovery', value: 'Checkpoint Avg / L2-SP' },
    ],
  },
  {
    id: 2,
    tag: 'Scenario S2 — Reproducible Benchmark',
    company: 'Calibration Recovery',
    quote:
      'Model confidence is severely inflated while top-1 accuracy remains static, leading to uncalibrated overconfident probability outputs. AMRS isolates the post-hoc logit scaling factor via Temperature Scaling without altering learned model parameter rankings.',
    problem: 'Model confidence is inflated.',
    recovery: 'Temperature scaling.',
    author: 'Vision Classifier',
    role: 'Scenario S2 Benchmark',
    avatar: '/assets/img/g09-arch-glow.jpg',
    fallbackAvatar: '/assets/img/g09-arch-glow.jpg',
    statsTitle: 'Experiment Details',
    stats: [
      { label: 'Scenario', value: 'S2' },
      { label: 'Problem', value: 'Inflated Confidence' },
      { label: 'Method', value: 'Temperature Scaling' },
      { label: 'Expected Recovery', value: 'Temperature Scaling' },
    ],
  },
  {
    id: 3,
    tag: 'Scenario S4 — Reproducible Benchmark',
    company: 'Training Instability',
    quote:
      'Sudden loss spikes and degraded gradient updates destabilize the active model state. AMRS audits the checkpoint history to perform automated checkpoint reversion and parameter weight averaging, followed by strict holdout validation checks.',
    problem: 'Unstable loss and degraded checkpoints.',
    recovery: 'Checkpoint reversion or averaging.',
    author: 'PyTorch Vision Model',
    role: 'Scenario S4 Benchmark',
    avatar: '/assets/img/g07-swirl-road.jpg',
    fallbackAvatar: '/assets/img/g07-swirl-road.jpg',
    statsTitle: 'Experiment Details',
    stats: [
      { label: 'Scenario', value: 'S4' },
      { label: 'Problem', value: 'Unstable Loss Spikes' },
      { label: 'Lineage', value: 'Checkpoint History' },
      { label: 'Expected Recovery', value: 'Checkpoint Reversion / Avg' },
    ],
  },
];

export default testimonialsData;
