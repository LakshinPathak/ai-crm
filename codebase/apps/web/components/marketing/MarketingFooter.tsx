import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Separator } from '@/components/ui/separator';

export function MarketingFooter() {
  return (
    <footer className="mkt-footer border-t border-border !bg-muted !text-foreground px-4 sm:px-6 [&_a]:!text-foreground [&_a]:hover:!text-primary [&_h4]:!text-foreground/80 [&_p]:!text-foreground/80">
      <div className="mkt-footer__grid grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <BrandLogo href="/" size="sm" />
          <p>AI-native presales operating system</p>
        </div>
        <div>
          <h4>Product</h4>
          <Link href="/product">Overview</Link>
          <a href="/#platform">Platform</a>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div>
          <h4>Solutions</h4>
          <Link href="/why">Why AI CRM</Link>
          <a href="/#modules">For SEs</a>
          <a href="/#integrations">Integrations</a>
        </div>
        <div>
          <h4>Company</h4>
          <Link href="/pricing#quote">Contact</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Start free</Link>
        </div>
      </div>
      <Separator className="my-6 bg-border" />
      <div className="mkt-footer__bar flex flex-col gap-2 !border-border !text-foreground/80 text-center sm:flex-row sm:justify-between sm:text-left">
        <span className="!text-foreground/80">© 2026 AI CRM. Built for revenue teams.</span>
        <span className="!text-foreground/80">Privacy · Terms · Status</span>
      </div>
    </footer>
  );
}
