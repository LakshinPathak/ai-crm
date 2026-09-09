import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { TrustSection } from '@/components/marketing/TrustSection';
import { WHY_VALUE_PROPS } from '@/lib/marketing-content';

export function WhyPage() {
  return (
    <MarketingShell activeHref="/why">
      <section className="mkt-pricing-hero bg-background px-6">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">Why AI CRM</Badge>
          <h1 className="text-foreground">Your CRM stores fields. We unify the context behind every deal.</h1>
          <p className="text-muted-foreground">
            Technical sales teams lose hours hunting across Slack threads, Gong clips, calendar notes,
            and CRM updates. AI CRM is the presales operating system that sits next to your CRM —
            converging scattered signals into one cited, approval-gated record per opportunity.
          </p>
          <p className="mkt-pricing-hero__stats text-primary">
            4 hr saved per deal per week · 95% citation coverage on AI claims
          </p>
        </div>
      </section>

      <section className="mkt-mvp bg-muted/40 px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Why teams switch</span>
          <h2 className="text-foreground">Four reasons revenue teams choose AI CRM</h2>
          <p className="text-muted-foreground">
            Not a generic CRM add-on — a context layer and agent platform built for solutions
            engineering, presales, and RevOps.
          </p>
        </div>
        <div className="mkt-mvp__grid">
          {WHY_VALUE_PROPS.map((prop) => (
            <Card key={prop.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <FeatureIcon name={prop.icon} size={22} />
                <CardTitle className="text-base">{prop.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{prop.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <TrustSection />

      <MarketingCta
        title="Ready to see pricing for your team?"
        description="Tell us your CRM, team size, and workflow — we'll tailor a quote in four quick steps."
        primaryHref="/pricing#quote"
        primaryLabel="View pricing"
        secondaryHref="/sign-up"
        secondaryLabel="Start free"
      />
    </MarketingShell>
  );
}
