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
      <div className="sticky top-0 z-50 bg-background">
        <div className="flex h-9 items-center justify-center gap-2 overflow-hidden border-b border-border bg-muted/60 px-4 text-center text-xs font-medium text-foreground sm:h-10 sm:text-sm">
          <Zap size={14} className="shrink-0 text-primary" />
          <span className="truncate">Connect HubSpot or Salesforce in under 10 minutes.</span>
          <Link
            href="/onboarding"
            className="shrink-0 font-semibold text-primary hover:text-primary/80 hover:underline"
          >
            See setup →
          </Link>
        </div>
        <MarketingHeader nav={nav} activeHref={activeHref} />
      </div>
      {children}
      <MarketingFooter />
      <StickyMobileCta />
    </div>
  );
}
