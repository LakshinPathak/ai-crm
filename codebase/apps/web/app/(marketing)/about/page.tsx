import type { Metadata } from 'next';
import { AboutPage } from '@/components/marketing/AboutPage';

export const metadata: Metadata = {
  title: 'About — AI CRM',
  description:
    'AI CRM is the presales operating system that unifies CRM, Slack, Gong, and calendar context into one cited record per deal.',
};

export default function Page() {
  return <AboutPage />;
}
