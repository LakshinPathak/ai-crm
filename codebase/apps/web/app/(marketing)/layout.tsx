import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI CRM — AI-native presales operating system',
  description:
    'Unified deal context from CRM, Slack, Gong, and calendar. AI summaries with citations, risk agents, POC workflows, and leadership analytics.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
