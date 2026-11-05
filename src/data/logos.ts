export interface LogoItem {
  id: string;
  name: string;
  href: string;
  iconId: string;
  color?: string;
}

export const logosData: LogoItem[] = [
  { id: 'python', name: 'Python', href: 'https://www.python.org', iconId: 'l-python', color: '#3776ab' },
  { id: 'pytorch', name: 'PyTorch', href: 'https://pytorch.org', iconId: 'l-pytorch', color: '#ee4c2c' },
  { id: 'fastapi', name: 'FastAPI', href: 'https://fastapi.tiangolo.com', iconId: 'l-fastapi', color: '#009688' },
  { id: 'nextjs', name: 'Next.js', href: 'https://nextjs.org', iconId: 'l-nextjs', color: '#ffffff' },
  { id: 'typescript', name: 'TypeScript', href: 'https://www.typescriptlang.org', iconId: 'l-typescript', color: '#3178c6' },
  { id: 'tailwindcss', name: 'Tailwind CSS', href: 'https://tailwindcss.com', iconId: 'l-tailwindcss', color: '#38bdf8' },
  { id: 'numpy', name: 'NumPy', href: 'https://numpy.org', iconId: 'l-numpy', color: '#4dabcf' },
  { id: 'scikitlearn', name: 'Scikit-learn', href: 'https://scikit-learn.org', iconId: 'l-scikitlearn', color: '#f89939' },
  { id: 'plotly', name: 'Plotly', href: 'https://plotly.com', iconId: 'l-plotly', color: '#3f4f75' },
];

export default logosData;
