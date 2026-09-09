import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { IntegrationsTabs } from '@/components/marketing/IntegrationsTabs';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { ModulesTabs } from '@/components/marketing/ModulesTabs';
import { MVP_FEATURES, PRODUCT_SECTIONS } from '@/lib/marketing-content';

export function ProductPage() {
  return (
    <MarketingShell activeHref="/product">
      <section className="mkt-pricing-hero">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">Product overview</Badge>
          <h1>Everything technical sales teams need — in one presales OS.</h1>
          <p>
            AI CRM sits next to your CRM and revenue stack. Explore each capability below —
            from unified deal records and cited AI to agents, analytics, and multi-CRM connectors.
          </p>
        </div>
      </section>

      <section id="capabilities" className="mkt-mvp px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Core capabilities</span>
          <h2>Five pillars of the platform</h2>
          <p>Dive into each area — detailed workflows for every presales motion.</p>
        </div>
        <div className="mkt-mvp__grid">
          {PRODUCT_SECTIONS.map((section) => (
            <Link key={section.slug} href={`/product/${section.slug}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <FeatureIcon name={section.icon} size={22} color={section.accent} />
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                  <span className="text-sm font-medium text-primary">
                    Explore {section.title.toLowerCase()} →
                  </span>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section id="platform" className="mkt-mvp px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Platform</span>
          <h2>Six capabilities revenue teams adopt first</h2>
          <p>Citation-first AI, agents with approval, and presales workflow.</p>
        </div>
        <div className="mkt-mvp__grid">
          {MVP_FEATURES.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <FeatureIcon name={feature.icon} size={22} color={feature.accent} />
                  {'badge' in feature && feature.badge && (
                    <Badge variant="secondary" className="text-xs">{feature.badge}</Badge>
                  )}
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="modules" className="mkt-modules px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Full platform</span>
          <h2>Module map for revenue teams</h2>
        </div>
        <ModulesTabs />
      </section>

      <section id="integrations" className="mkt-integrations px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Integrations</span>
          <h2>Your revenue stack, one deal record</h2>
        </div>
        <IntegrationsTabs />
      </section>

      <MarketingCta
        title="Ready to unify your presales workflow?"
        description="Start with HubSpot or demo data. Add agents and integrations as you grow."
        secondaryHref="/why"
        secondaryLabel="Why AI CRM"
      />
    </MarketingShell>
  );
}
