export interface LogoItem {
  id: string;
  name: string;
  href: string;
  iconId: string;
}

export const logosData: LogoItem[] = [
  { id: 'alt-shift', name: 'Alt+Shift', href: '#alt-shift', iconId: 'l-altshift' },
  { id: 'biosynthesis', name: 'Biosynthesis', href: '#biosynthesis', iconId: 'l-bio' },
  { id: 'command-r', name: 'Command+R', href: '#command-r', iconId: 'l-command' },
  { id: 'epicurious', name: 'Epicurious', href: '#epicurious', iconId: 'l-epic' },
  { id: 'focalpoint', name: 'FocalPoint', href: '#focalpoint', iconId: 'l-focal' },
  { id: 'galileo', name: 'Galileo', href: '#galileo', iconId: 'l-galileo' },
];

