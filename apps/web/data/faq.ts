export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export const faqData: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'What is AMRS?',
    answer:
      'AMRS (Adaptive Model Recovery System) is an intelligent framework that diagnoses underperforming machine learning models and attempts targeted recovery instead of relying on complete retraining.',
    defaultOpen: true,
  },
  {
    id: 'faq-2',
    question: 'How does AMRS identify model failures?',
    answer:
      'It analyzes metrics such as training and validation performance, generalization gap, validation-loss trends and calibration error to identify potential failure modes.',
  },
  {
    id: 'faq-3',
    question: 'Does AMRS retrain the entire model?',
    answer:
      'Not by default. It prioritizes targeted recovery techniques that modify selected parameters or statistics while preserving previously learned knowledge.',
  },
  {
    id: 'faq-4',
    question: 'How does AMRS decide whether a recovery is successful?',
    answer:
      'Every candidate is evaluated against predefined verification criteria using a separate holdout dataset. Candidates that fail are rejected.',
  },
  {
    id: 'faq-5',
    question: 'What happens when recovery fails?',
    answer:
      'AMRS retains the original model and records a rollback decision with the reasons for rejection.',
  },
  {
    id: 'faq-6',
    question: 'Which models does AMRS support?',
    answer:
      'The initial MVP focuses on supported PyTorch image-classification architectures, including MLP, small CNN and ResNet18 CIFAR configurations.',
  },
  {
    id: 'faq-7',
    question: 'Can AMRS monitor training?',
    answer:
      'Yes. The MVP includes monitoring and recorded-training-history replay to identify potential overfitting and instability triggers.',
  },
  {
    id: 'faq-8',
    question: 'Does AMRS support transformer models?',
    answer:
      'Transformer recovery through Hugging Face PEFT/LoRA is planned as a post-MVP capability.',
  },
];

export default faqData;
