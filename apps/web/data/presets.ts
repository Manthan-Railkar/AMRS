export interface PresetItem {
  id: string;
  index: string;
  title: string;
  description: string;
  image: string;
  width: number;
  height: number;
  href: string;
}

export const presetsData: PresetItem[] = [
  {
    id: 'checkpoint-averaging',
    index: '01',
    title: 'Checkpoint Reversion & Averaging',
    description: 'Recover from unstable training using previous checkpoints and weight averaging.',
    image: '/assets/img/preset-startup.jpg',
    width: 271,
    height: 339,
    href: '#features',
  },
  {
    id: 'weight-interpolation',
    index: '02',
    title: 'Weight Interpolation',
    description: 'Combine model parameter states to explore improved solutions.',
    image: '/assets/img/preset-ecommerce.jpg',
    width: 271,
    height: 339,
    href: '#features',
  },
  {
    id: 'batchnorm-recalibration',
    index: '03',
    title: 'BatchNorm Recalibration',
    description: 'Recalibrate normalization statistics to address distribution shifts.',
    image: '/assets/img/preset-saas.jpg',
    width: 271,
    height: 339,
    href: '#features',
  },
  {
    id: 'selective-finetuning',
    index: '04',
    title: 'Selective Fine-Tuning',
    description: 'Adjust selected model parameters without unnecessarily modifying the entire network.',
    image: '/assets/img/g03-wave.jpg',
    width: 271,
    height: 339,
    href: '#features',
  },
  {
    id: 'l2-sp-regularization',
    index: '05',
    title: 'L2-SP Regularization',
    description: 'Constrain parameter changes to preserve useful pretrained knowledge.',
    image: '/assets/img/g08-arch-road.jpg',
    width: 271,
    height: 339,
    href: '#features',
  },
  {
    id: 'temperature-scaling',
    index: '06',
    title: 'Temperature Scaling',
    description: "Improve prediction calibration without changing the model's predicted class ranking.",
    image: '/assets/img/g09-arch-glow.jpg',
    width: 271,
    height: 339,
    href: '#features',
  },
];

export default presetsData;
