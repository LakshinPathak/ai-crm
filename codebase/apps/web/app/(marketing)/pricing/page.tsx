import type { Metadata } from 'next';
import { PricingPage } from '@/components/marketing/PricingPage';

export const metadata: Metadata = {
  title: 'Pricing — AI CRM',
  description:
    'Custom pricing for your CRM, team size, and presales workflow. Request a quote in four steps.',
};

export default function Page() {
  return <PricingPage />;
}
