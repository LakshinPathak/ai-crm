import Link from 'next/link';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { HeroVisual } from '@/components/marketing/HeroVisual';
import { IntegrationsTabs } from '@/components/marketing/IntegrationsTabs';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { ModulesTabs } from '@/components/marketing/ModulesTabs';
import { TestimonialCarousel } from '@/components/marketing/TestimonialCarousel';
import { TrustSection } from '@/components/marketing/TrustSection';
import {
  BUILDING_BLOCKS,
  CRM_LOGO_IDS,
  INTEGRATIONS,
  HERO_TESTIMONIAL,
  MARQUEE_ITEMS,
  MVP_FEATURES,
  STATS,
  STATS_FOOTNOTE,
} from '@/lib/marketing-content';
import { UserAvatar } from '@/components/ui/user-avatar';

const LANDING_NAV = [
  { href: '#platform', label: 'Platform' },
  { href: '#modules', label: 'Solutions' },
  { href: '#integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing', isRoute: true },
  { href: '#security', label: 'Security' },
];

export function LandingPage() {
  return (
    <MarketingShell nav={LANDING_NAV}>
      <section className="mkt-hero">
        <div className="mkt-hero__inner">
          <div className="mkt-hero__copy">
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs font-semibold">
              <Sparkles className="mr-1 size-3.5" />
              Early access · HubSpot &amp; Salesforce connectors live
            </Badge>
            <h1>
              Stop hunting deal context<br />
              <em>across Gong, Slack, and your CRM</em>
            </h1>
            <p className="mkt-hero__sub">
              Connect HubSpot, Salesforce, Pipedrive, or Zoho in under 10 minutes. One record per deal
              — calls, threads, calendar, and CRM fields — with MEDDPICC summaries that cite every
              claim. <strong>Nothing writes back without your approval.</strong>
            </p>
            <div className="mkt-hero__actions">
              <div className="flex flex-col gap-1">
                <Button size="lg" asChild>
                  <Link href="/sign-up">
                    Connect your CRM free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Free for presales teams · No credit card · OAuth setup ~10 min
                </p>
              </div>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing#quote">Book a 15-min demo</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/sign-in">
                  <Play className="size-4" />
                  Watch overview
                </Link>
              </Button>
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
              <UserAvatar name={HERO_TESTIMONIAL.name} size="sm" />
              <div>
                <p className="text-muted-foreground">&ldquo;{HERO_TESTIMONIAL.quote}&rdquo;</p>
                <p className="mt-1 font-medium">
                  {HERO_TESTIMONIAL.name}, {HERO_TESTIMONIAL.title}
                  <span className="ml-2 text-muted-foreground">· {HERO_TESTIMONIAL.rating}</span>
                </p>
              </div>
            </div>

            <div className="mkt-hero__crm-row">
              <span>Works with</span>
              <div className="mkt-hero__crm-logos">
                {CRM_LOGO_IDS.map((id) => (
                  <IntegrationLogo key={id} id={id} size={28} />
                ))}
              </div>
            </div>
          </div>
          <AspectRatio ratio={16 / 10} className="w-full max-md:order-first">
            <HeroVisual />
          </AspectRatio>
        </div>

        <Separator className="my-10 max-w-6xl mx-auto" />

        <div className="mkt-hero__blocks">
          {BUILDING_BLOCKS.map((block) => (
            <Card key={block.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="gap-3">
                <FeatureIcon name={block.icon} size={22} color={block.accent} />
                <CardTitle className="text-base">{block.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{block.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30 py-10 text-center">
        <p className="mb-6 font-semibold text-muted-foreground">
          Works with your CRM — we don&apos;t replace it
        </p>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 px-6">
          {INTEGRATIONS.crm.map((item) => (
            <Card key={item.id} className="flex w-28 flex-col items-center gap-2 p-4">
              <IntegrationLogo id={item.id} size={36} />
              <span className="text-sm font-medium">{item.name}</span>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          OAuth · Stage mapping · Read-first sync · Writes require approval
        </p>
      </section>

      <section className="mkt-marquee-wrap">
        <h2>Turn scattered deal context into a single system of intelligence</h2>
        <p>SEs, AEs, and presales leaders — one record per opportunity.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {MARQUEE_ITEMS.map((item, i) => (
            <Badge key={i} variant="outline" className="rounded-full px-3 py-1.5 text-sm">
              <FeatureIcon name={item.icon} size={14} className="mr-1.5" />
              {item.text}
            </Badge>
          ))}
        </div>
      </section>

      <section className="mkt-stats">
        <h2>What presales teams report in the <em>first 90 days</em></h2>
        <p>SEs and AEs stop hunting context across tools — leadership sees risk before it slips.</p>
        <div className="mkt-stats__grid">
          {STATS.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="pt-6">
                <FeatureIcon name={stat.icon} size={18} className="mx-auto mb-2 text-primary" />
                <div className="text-4xl font-extrabold text-primary">
                  {stat.value}{stat.suffix}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{STATS_FOOTNOTE}</p>
      </section>

      <TestimonialCarousel />

      <section id="platform" className="mkt-mvp">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Platform</span>
          <h2>Six capabilities revenue teams adopt first</h2>
          <p>Citation-first AI, agents with approval, and presales workflow — built for technical sales.</p>
        </div>
        <div className="mkt-mvp__grid">
          {MVP_FEATURES.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <FeatureIcon name={f.icon} size={22} color={f.accent} />
                  {'badge' in f && f.badge && (
                    <Badge variant="secondary" className="text-xs">{f.badge}</Badge>
                  )}
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="modules" className="mkt-modules">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Full platform</span>
          <h2>Everything technical sales teams need</h2>
        </div>
        <ModulesTabs />
      </section>

      <section id="integrations" className="mkt-integrations">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Integrations</span>
          <h2>Your revenue stack, one deal record</h2>
        </div>
        <IntegrationsTabs />
      </section>

      <TrustSection />

      <MarketingCta
        title="Connect your CRM this week. See cited deal context by Friday."
        description="Start with HubSpot or demo data. Add Gong, Slack, and agents when you're ready."
      />
    </MarketingShell>
  );
}
