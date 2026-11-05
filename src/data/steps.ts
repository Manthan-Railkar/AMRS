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
    title: '01 — Diagnose',
    description:
      'Analyze model performance, validation trends, generalization gaps and calibration errors to identify potential failure modes.',
    image: '/assets/img/step-describe.jpg',
    width: 220,
    height: 220,
  },
  {
    id: 2,
    title: '02 — Select',
    description:
      'Identify eligible recovery techniques and prioritize them according to estimated computational cost.',
    image: '/assets/img/step-generate.jpg',
    width: 220,
    height: 220,
  },
  {
    id: 3,
    title: '03 — Recover',
    description:
      'Apply targeted parameter adjustments to a copy of the original model while preserving its learned knowledge.',
    image: '/assets/img/step-refine.jpg',
    width: 220,
    height: 220,
  },
  {
    id: 4,
    title: '04 — Verify',
    description:
      'Evaluate the recovered candidate against predefined acceptance criteria. Accept improvements or roll back safely.',
    image: '/assets/img/step-ship.jpg',
    width: 155,
    height: 200,
  },
];

export default stepsData;
