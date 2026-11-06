export interface BarItem {
  label: string;
  value: number;
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
      { label: 'Kraft', value: 94.2, isKraft: true },
      { label: 'Figma AI', value: 71.8 },
      { label: 'Canva Magic', value: 68.4 },
      { label: 'Framer AI', value: 58.7 },
    ],
  },
  {
    title: 'Quality',
    delay: '90ms',
    bars: [
      { label: 'Kraft', value: 96.8, isKraft: true },
      { label: 'Figma AI', value: 89.2 },
      { label: 'Canva Magic', value: 82.1 },
      { label: 'Framer AI', value: 79.4 },
    ],
  },
  {
    title: 'Consistency',
    delay: '180ms',
    bars: [
      { label: 'Kraft', value: 98.1, isKraft: true },
      { label: 'Figma AI', value: 81.3 },
      { label: 'Framer AI', value: 76.9 },
      { label: 'Canva Magic', value: 72.4 },
    ],
  },
];

