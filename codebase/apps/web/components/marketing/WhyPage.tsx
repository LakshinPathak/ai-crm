import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { WHY_VALUE_PROPS } from '@/lib/marketing-content';

export function WhyPage() {
  return (
    <MarketingShell activeHref="/why">
      <MarketingPageHero
        badge="Why AI CRM"
        title="Your CRM stores fields. We unify the context behind every deal."
        description="Technical sales teams lose hours hunting across Slack threads, Gong clips, calendar notes, and CRM updates. AI CRM is the presales operating system that sits next to your CRM — converging scattered signals into one cited, approval-gated record per opportunity."
        stats="Cited MEDDPICC · approval-gated CRM write-back · live HubSpot + Salesforce"
      />

      <section className="mkt-mvp bg-muted px-4 py-12 sm:px-6 sm:py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Why teams switch</span>
          <h2 className="text-foreground">Four reasons revenue teams choose AI CRM</h2>
          <p className="!text-foreground/80">
            Not a generic CRM add-on — a context layer and agent platform built for solutions
            engineering, presales, and RevOps.
          </p>
        </div>
        <div className="mkt-mvp__grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_VALUE_PROPS.map((prop) => (
            <Card key={prop.title} className="bg-card transition-shadow hover:shadow-md">
              <CardHeader>
                <FeatureIcon name={prop.icon} size={22} />
                <CardTitle className="text-base">{prop.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed !text-foreground/80">{prop.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

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
