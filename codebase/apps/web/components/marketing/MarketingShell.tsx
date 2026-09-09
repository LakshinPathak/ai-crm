import Link from 'next/link';
import { Zap } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader, type MarketingNavItem } from '@/components/marketing/MarketingHeader';
import { StickyMobileCta } from '@/components/marketing/StickyMobileCta';

export function MarketingShell({
  children,
  nav,
  activeHref,
}: {
  children: React.ReactNode;
  nav?: MarketingNavItem[];
  activeHref?: string;
}) {
  return (
    <div className="mkt bg-background text-foreground pb-20 md:pb-0">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border bg-muted/60 px-4 py-2.5 text-center text-xs font-medium text-foreground sm:text-sm">
        <Zap size={14} className="shrink-0 text-primary" />
        <span>Connect HubSpot or Salesforce in under 10 minutes.</span>
        <Link href="/onboarding" className="font-semibold text-primary hover:text-primary/80 hover:underline">
          See setup →
        </Link>
      </div>
      <MarketingHeader nav={nav} activeHref={activeHref} />
      {children}
      <MarketingFooter />
      <StickyMobileCta />
    </div>
  );
}
