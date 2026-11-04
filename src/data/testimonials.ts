export interface TestimonialStat {
  label: string;
  value: string;
}

export interface TestimonialItem {
  id: number;
  tag: string;
  company: string;
  quote: string;
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
    tag: 'Design Agency',
    company: 'Stellar Creative',
    quote:
      "We've completely transformed our workflow with Kraft. What used to take our team days now happens in hours. The AI understands our brand guidelines perfectly and produces designs that clients love on the first revision.",
    author: 'Sarah Chen',
    role: 'Creative Director',
    avatar:
      'https://images.unsplash.com/photo-1574108233269-86d1199d28de?q=80&w=774&auto=format&fit=crop',
    fallbackAvatar: '/assets/img/avatar-sarah.jpg',
    statsTitle: 'How they use Kraft',
    stats: [
      { label: 'Design Output', value: '10x faster' },
      { label: 'Client Revisions', value: '-80%' },
      { label: 'Team Size', value: '12 designers' },
    ],
  },
  {
    id: 2,
    tag: 'Tech Startup',
    company: 'Quantum Labs',
    quote:
      'As a startup without a dedicated design team, Kraft has been a game-changer. We ship beautiful marketing materials, pitch decks, and product interfaces without hiring a single designer. The ROI is incredible.',
    author: 'Marcus Rodriguez',
    role: 'Co-founder & CEO',
    avatar:
      'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?q=80&w=1740&auto=format&fit=crop',
    fallbackAvatar: '/assets/img/avatar-sarah.jpg',
    statsTitle: 'How they use Kraft',
    stats: [
      { label: 'Design Cost Savings', value: '$150k/year' },
      { label: 'Time to Launch', value: '2 weeks' },
      { label: 'Assets Created', value: '500+' },
    ],
  },
  {
    id: 3,
    tag: 'Enterprise',
    company: 'GlobalTech Inc',
    quote:
      "Rolling out Kraft across our marketing team was seamless. The brand consistency features ensure every piece of content—from social posts to annual reports—looks like it came from the same designer. It's remarkable.",
    author: 'Roy Park',
    role: 'VP of Marketing',
    avatar:
      'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=870&auto=format&fit=crop',
    fallbackAvatar: '/assets/img/avatar-sarah.jpg',
    statsTitle: 'How they use Kraft',
    stats: [
      { label: 'Brand Consistency', value: '99.5%' },
      { label: 'Team Members', value: '200+' },
      { label: 'Monthly Designs', value: '5,000+' },
    ],
  },
];

