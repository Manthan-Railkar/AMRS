export interface StepItem {
  id: number;
  title: string;
  description: string;
  image: string;
  width: number;
  height: number;
}

export const stepsData: StepItem[] = [
  {
    id: 1,
    title: 'Describe',
    description: 'Tell Kraft what you need. A logo, a landing page, an entire brand—just say it.',
    image: '/assets/img/step-describe.jpg',
    width: 220,
    height: 220,
  },
  {
    id: 2,
    title: 'Generate',
    description: 'Watch as Kraft creates multiple design options, each one production-ready.',
    image: '/assets/img/step-generate.jpg',
    width: 220,
    height: 220,
  },
  {
    id: 3,
    title: 'Refine',
    description: 'Tweak colors, fonts, adjust layouts—Kraft understands natural language edits.',
    image: '/assets/img/step-refine.jpg',
    width: 220,
    height: 220,
  },
  {
    id: 4,
    title: 'Ship',
    description: 'Export to Figma, download assets, or push directly to your codebase. Done.',
    image: '/assets/img/step-ship.jpg',
    width: 155,
    height: 200,
  },
];

