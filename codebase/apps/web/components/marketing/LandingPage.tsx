import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentDriftDemo } from '@/components/marketing/AgentDriftDemo';
import { AnimatedStats } from '@/components/marketing/animations/AnimatedStats';
import { FeatureMarquee } from '@/components/marketing/FeatureMarquee';
import { IntegrationsTabs } from '@/components/marketing/IntegrationsTabs';
import { LandingHero } from '@/components/marketing/LandingHero';
import { LogoMarquee } from '@/components/marketing/LogoMarquee';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { ModulesTabs } from '@/components/marketing/ModulesTabs';
import { TestimonialCarousel } from '@/components/marketing/TestimonialCarousel';
import { ScrollReveal } from '@/components/marketing/animations/ScrollReveal';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { INTEGRATIONS, MVP_FEATURES } from '@/lib/marketing-content';

const LANDING_NAV = [
  { href: '#platform', label: 'Platform' },
  { href: '#modules', label: 'Solutions' },
  { href: '#integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing', isRoute: true },
];

export function LandingPage() {
  return (
    <MarketingShell nav={LANDING_NAV}>
      <LandingHero />

      <section className="border-y border-border bg-muted/40 py-10 text-center">
        <ScrollReveal>
          <p className="mb-6 font-semibold text-muted-foreground">
            Works with your CRM — we don&apos;t replace it
          </p>
        </ScrollReveal>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 px-6">
          {INTEGRATIONS.crm.map((item, i) => (
            <ScrollReveal key={item.id} delay={i * 60}>
              <Card className="flex w-28 flex-col items-center gap-2 p-4 transition-all hover:-translate-y-1 hover:shadow-md">
                <IntegrationLogo id={item.id} size={36} />
                <span className="text-sm font-medium text-foreground">{item.name}</span>
              </Card>
            </ScrollReveal>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          OAuth · Stage mapping · Read-first sync · Writes require approval
        </p>
      </section>

      <LogoMarquee />
      <FeatureMarquee />
      <AnimatedStats />
      <TestimonialCarousel />
      <AgentDriftDemo />

      <section id="platform" className="mkt-mvp bg-background">
        <ScrollReveal>
          <div className="mkt-section-head">
            <span className="mkt-eyebrow">Platform</span>
            <h2>Six capabilities revenue teams adopt first</h2>
            <p>Citation-first AI, agents with approval, and presales workflow — built for technical sales.</p>
          </div>
        </ScrollReveal>
        <div className="mkt-mvp__grid">
          {MVP_FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 70}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <FeatureIcon name={f.icon} size={22} />
                    {'badge' in f && f.badge && (
                      <Badge variant="secondary" className="text-xs">{f.badge}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{f.description}</CardDescription>
                </CardHeader>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="modules" className="mkt-modules">
        <ScrollReveal>
          <div className="mkt-section-head">
            <span className="mkt-eyebrow">Full platform</span>
            <h2>Everything technical sales teams need</h2>
          </div>
        </ScrollReveal>
        <ModulesTabs />
      </section>

      <section id="integrations" className="mkt-integrations bg-background">
        <ScrollReveal>
          <div className="mkt-section-head">
            <span className="mkt-eyebrow">Integrations</span>
            <h2>Your revenue stack, one deal record</h2>
          </div>
        </ScrollReveal>
        <IntegrationsTabs />
      </section>

      <MarketingCta
        title="Connect your CRM this week. See cited deal context by Friday."
        description="Start with HubSpot or demo data. Add Gong, Slack, and agents when you're ready."
      />
    </MarketingShell>
  );
}
