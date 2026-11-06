export interface PlanItem {
  id: string;
  name: string;
  description: string;
  price: string;
  period?: string;
  subnote?: string;
  badge?: string;
  iconId: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: 'dark' | 'accent';
  href: string;
}

export const plansData: PlanItem[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals and side projects',
    price: '$29',
    period: '/mo',
    iconId: 'i-rocket',
    features: [
      '50 design generations/month',
      'Basic brand kit',
      'PNG & SVG exports',
      'Email support',
      '1 workspace',
    ],
    ctaLabel: 'Get started',
    ctaVariant: 'dark',
    href: '#waitlist',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Best for startups and growing teams',
    price: '$99',
    period: '/mo',
    subnote: 'Cancel or pause any time',
    badge: 'Most popular',
    iconId: 'i-sparkle',
    features: [
      'Unlimited design generations',
      'Advanced brand consistency',
      'All export formats + Figma',
      'Priority support & delivery',
      '5 team members',
      'API access',
    ],
    ctaLabel: 'Upgrade plan',
    ctaVariant: 'accent',
    href: '#waitlist',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large teams and organizations',
    price: 'Custom',
    iconId: 'i-building',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Custom model training',
      'Dedicated account manager',
      'SSO & advanced security',
      'SLA & on-prem options',
    ],
    ctaLabel: 'Contact sales',
    ctaVariant: 'dark',
    href: '#waitlist',
  },
];

