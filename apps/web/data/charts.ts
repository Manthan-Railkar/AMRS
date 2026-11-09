export interface BarItem {
  label: string;
  value: number;
  isAmrs?: boolean;
  isKraft?: boolean;
}

export interface ChartCategory {
  title: string;
  delay?: string;
  bars: BarItem[];
}

export const performanceData: ChartCategory[] = [
  {
    title: 'Speed',
    bars: [
      { label: 'AMRS', value: 94.2, isAmrs: true, isKraft: true },
      { label: 'Early Stop', value: 71.8 },
      { label: 'Fine-Tuning', value: 58.4 },
      { label: 'Full Retrain', value: 24.6 },
    ],
  },
  {
    title: 'Accuracy',
    delay: '90ms',
    bars: [
      { label: 'AMRS', value: 96.8, isAmrs: true, isKraft: true },
      { label: 'Full Retrain', value: 89.2 },
      { label: 'Fine-Tuning', value: 82.1 },
      { label: 'Early Stop', value: 76.4 },
    ],
  },
  {
    title: 'Retention',
    delay: '180ms',
    bars: [
      { label: 'AMRS', value: 98.1, isAmrs: true, isKraft: true },
      { label: 'Early Stop', value: 81.3 },
      { label: 'Fine-Tuning', value: 76.9 },
      { label: 'Full Retrain', value: 71.2 },
    ],
  },
];
