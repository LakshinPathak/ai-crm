import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PricingWizard } from '@/components/marketing/PricingWizard';
import { TrustSection } from '@/components/marketing/TrustSection';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  PRICING_BULLETS,
  PRICING_SECURITY,
  PRICING_TESTIMONIALS,
} from '@/lib/marketing-content';

export function PricingPage() {
  return (
    <MarketingShell activeHref="/pricing">
      <section className="mkt-pricing-hero bg-background">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">Request custom pricing</Badge>
          <h1 className="text-foreground">Pricing tailored to how your team sells.</h1>
          <p className="text-muted-foreground">
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
            Rated 4.8/5 on G2 · 95% of POCs become customers
          </p>
        </div>
      </section>

      <section id="quote" className="mkt-pricing-wizard-wrap bg-background">
        <PricingWizard />
      </section>

      <section className="mkt-pricing-proof bg-muted/40 px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Proof</span>
          <h2 className="text-foreground">Trusted by presales and RevOps leaders</h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_TESTIMONIALS.map((item) => (
            <Card key={item.name} className="h-full">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
              </CardContent>
              <CardHeader className="flex-row items-center gap-3 border-t pt-4">
                <UserAvatar name={item.name} size="sm" />
                <div>
                  <CardTitle className="text-sm">{item.name}</CardTitle>
                  <CardDescription className="text-xs">{item.title}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mkt-pricing-security bg-background px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Security</span>
          <h2 className="text-foreground">Built for enterprise revenue teams</h2>
        </div>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {PRICING_SECURITY.map((item, i) => (
            <Card key={item.title}>
              <CardHeader>
                <FeatureIcon
                  name={(['shield', 'key', 'lock'] as const)[i]}
                  size={22}
                  color="var(--primary)"
                />
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <TrustSection />

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
