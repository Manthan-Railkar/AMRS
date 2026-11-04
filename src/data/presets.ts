4export interface PresetItem {
  id: string;
  title: string;
  image: string;
  width: number;
  height: number;
  href: string;
}

export const presetsData: PresetItem[] = [
  {
    id: 'startup',
    title: 'Startup Launch Kit',
    image: '/assets/img/preset-startup.jpg',
    width: 271,
    height: 339,
    href: '#',
  },
  {
    id: 'ecommerce',
    title: 'E-commerce Suite',
    image: '/assets/img/preset-ecommerce.jpg',
    width: 271,
    height: 339,
    href: '#',
  },
  {
    id: 'saas',
    title: 'SaaS Dashboard',
    image: '/assets/img/preset-saas.jpg',
    width: 271,
    height: 339,
    href: '#',
  },
];
