export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export const faqData: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'What kinds of designs can Kraft create?',
    answer:
      'Kraft can generate logos, landing pages, social media graphics, brand identities, app interfaces, presentations, and more. Just describe what you need in natural language, and Kraft will produce multiple production-ready options.',
    defaultOpen: true,
  },
  {
    id: 'faq-2',
    question: 'How does Kraft ensure brand consistency?',
    answer:
      'Upload your logo, colors, fonts, and tone once and Kraft keeps them as a brand kit. Every design it generates draws from that kit, so layouts, type, and palettes stay on-brand across your whole team.',
  },
  {
    id: 'faq-3',
    question: 'Can I edit or refine designs after generation?',
    answer:
      'Yes. Describe the change in plain language—a new color, a bigger headline, a tighter layout—and Kraft applies it right away. You can also fine-tune any element by hand before you export.',
  },
  {
    id: 'faq-4',
    question: 'What export formats does Kraft support?',
    answer:
      'PNG and SVG exports come with every plan. Pro and Enterprise add Figma, PDF, and code exports, and you can push designs straight to your codebase.',
  },
  {
    id: 'faq-5',
    question: 'Is my data and designs secure?',
    answer:
      'Your designs and brand assets are encrypted in transit and at rest, and they are never used to train shared models. Enterprise plans add SSO, audit logs, and on-prem options.',
  },
];

