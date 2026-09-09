import type { Metadata } from 'next';
import { WhyPage } from '@/components/marketing/WhyPage';

export const metadata: Metadata = {
  title: 'Why AI CRM — AI-native presales operating system',
  description:
    'Your CRM stores fields. AI CRM unifies Slack, Gong, calendar, and CRM context into one cited record per deal — built for technical sales teams.',
};

export default function Page() {
  return <WhyPage />;
}
