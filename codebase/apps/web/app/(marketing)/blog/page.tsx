import type { Metadata } from 'next';
import { BlogPage } from '@/components/marketing/BlogPage';

export const metadata: Metadata = {
  title: 'Blog — AI CRM',
  description:
    'Presales insights on deal context, AI agents, and technical sales workflows from the AI CRM team.',
};

export default function Page() {
  return <BlogPage />;
}
