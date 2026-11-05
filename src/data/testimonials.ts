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
    tag: 'Scenario S1 · Reproducible Experiment',
    company: 'Overfitting Recovery',
    problem: 'Training and validation performance diverge.',
    recovery: 'Checkpoint averaging or selective fine-tuning with L2-SP.',
    quote:
      'AMRS arrests model degradation by identifying the divergence point in the training trajectory, combining proximal stationary checkpoints and selectively freezing earlier representation layers.',
    author: 'ResNet18 CIFAR',
    role: 'Target Architecture',
    avatar: '/assets/img/g03-wave.jpg',
    fallbackAvatar: '/assets/img/g03-wave.jpg',
    statsTitle: 'Experiment Specifications',
    stats: [
      { label: 'Scenario ID', value: 'S1' },
      { label: 'Architecture', value: 'ResNet18' },
      { label: 'Failure Mode', value: 'Divergent Loss' },
      { label: 'Recovery Strategy', value: 'Checkpoint Avg / L2-SP' },
    ],
  },
  {
    id: 2,
    tag: 'Scenario S2 · Reproducible Experiment',
    company: 'Calibration Recovery',
    problem: 'Model confidence is inflated.',
    recovery: 'Temperature scaling.',
    quote:
      'Optimizes temperature scaling over validation logits to recalibrate predicted softmax probabilities, drastically reducing Expected Calibration Error without degrading classification accuracy.',
    author: 'Vision Classifier',
    role: 'Target Architecture',
    avatar: '/assets/img/g09-arch-glow.jpg',
    fallbackAvatar: '/assets/img/g09-arch-glow.jpg',
    statsTitle: 'Experiment Specifications',
    stats: [
      { label: 'Scenario ID', value: 'S2' },
      { label: 'Architecture', value: 'Vision CNN' },
      { label: 'Failure Mode', value: 'Overconfidence' },
      { label: 'Recovery Strategy', value: 'Temperature Scaling' },
    ],
  },
  {
    id: 3,
    tag: 'Scenario S4 · Reproducible Experiment',
    company: 'Training Instability',
    problem: 'Unstable loss and degraded checkpoints.',
    recovery: 'Checkpoint reversion or averaging.',
    quote:
      'Audits parameter divergence after unexpected gradient shocks, restoring verified stable weights and averaging adjacent checkpoints with automated holdout verification.',
    author: 'PyTorch Vision Model',
    role: 'Target Architecture',
    avatar: '/assets/img/g07-swirl-road.jpg',
    fallbackAvatar: '/assets/img/g07-swirl-road.jpg',
    statsTitle: 'Experiment Specifications',
    stats: [
      { label: 'Scenario ID', value: 'S4' },
      { label: 'Architecture', value: 'Deep Vision' },
      { label: 'Failure Mode', value: 'Loss Spike Shock' },
      { label: 'Recovery Strategy', value: 'Checkpoint Reversion' },
    ],
  },
];

export default testimonialsData;
