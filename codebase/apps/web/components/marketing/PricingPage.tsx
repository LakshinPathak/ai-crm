import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PricingWizard } from '@/components/marketing/PricingWizard';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PRICING_BULLETS, PRICING_TESTIMONIALS } from '@/lib/marketing-content';

export function PricingPage() {
  return (
    <MarketingShell activeHref="/pricing">
      <section className="mkt-pricing-hero bg-background px-4 sm:px-6">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">Request custom pricing</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Pricing tailored to how your team sells.
          </h1>
          <p className="!text-foreground/80">
            Your CRM, your team size, your process — pricing should reflect that.
            No rigid per-seat surprises.
          </p>
          <ul className="mkt-pricing-hero__bullets">
            {PRICING_BULLETS.map((bullet) => (
              <li key={bullet} className="text-foreground">
                <Check size={16} className="text-primary" />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mkt-pricing-hero__stats text-primary">
            HubSpot and Salesforce live today · Pipedrive and Zoho in demo
          </p>
        </div>
      </section>

      <section id="quote" className="mkt-pricing-wizard-wrap bg-background px-4 sm:px-6">
        <PricingWizard />
      </section>

      <section className="mkt-pricing-proof bg-muted px-4 py-12 sm:px-6 sm:py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Proof</span>
          <h2 className="text-2xl text-foreground sm:text-3xl">Trusted by presales and RevOps leaders</h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TESTIMONIALS.map((item) => (
            <Card key={item.name} className="h-full bg-card">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed !text-foreground/80">&ldquo;{item.quote}&rdquo;</p>
              </CardContent>
              <CardHeader className="flex-row items-center gap-3 border-t pt-4">
                <UserAvatar name={item.name} size="sm" />
                <div>
                  <CardTitle className="text-sm">{item.name}</CardTitle>
                  <CardDescription className="text-xs !text-foreground/80">{item.title}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <MarketingCta
        title="Get your custom pricing now."
        description="Answer four quick questions — we'll tailor a quote to your stack and team."
        primaryHref="/pricing#quote"
        primaryLabel="Start quote wizard"
        secondaryHref="/sign-up"
        secondaryLabel="Start free instead"
      />
    </MarketingShell>
  );
}
