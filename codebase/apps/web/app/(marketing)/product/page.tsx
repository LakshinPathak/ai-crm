import type { Metadata } from 'next';
import { ProductPage } from '@/components/marketing/ProductPage';

export const metadata: Metadata = {
  title: 'Product — AI CRM',
  description:
    'Explore AI CRM capabilities: deals pipeline, cited AI summaries, revenue agents, insights, and multi-CRM connectors.',
};

export default function Page() {
  return <ProductPage />;
}
