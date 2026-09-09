'use client';

import Link from 'next/link';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { HeroVisual } from '@/components/marketing/HeroVisual';
import { RotatingText } from '@/components/marketing/animations/RotatingText';
import { ScrollReveal } from '@/components/marketing/animations/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { BUILDING_BLOCKS, CRM_LOGO_IDS, HERO_TESTIMONIAL } from '@/lib/marketing-content';

const ROTATING_SOURCES = ['Gong', 'Slack', 'HubSpot', 'Salesforce'];

export function LandingHero() {
  return (
    <section className="mkt-hero mkt-hero--animated">
      <div className="mkt-hero__mesh" aria-hidden />
      <div className="mkt-hero__inner">
        <ScrollReveal className="mkt-hero__copy">
          <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs font-semibold">
            <Sparkles className="mr-1 size-3.5" />
            Early access · HubSpot &amp; Salesforce connectors live
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Stop hunting deal context<br />
            <em>
              across <RotatingText words={ROTATING_SOURCES} /> and your CRM
            </em>
          </h1>
          <p className="mkt-hero__sub text-base sm:text-lg">
            Connect HubSpot, Salesforce, Pipedrive, or Zoho in under 10 minutes. One record per deal
            — calls, threads, calendar, and CRM fields — with MEDDPICC summaries that cite every
            claim. <strong>Nothing writes back without your approval.</strong>
          </p>
          <div className="mkt-hero__actions flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Button size="lg" asChild className="mkt-cta-glow w-full sm:w-auto">
                <Link href="/sign-up">
                  Connect your CRM free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Free for presales teams · No credit card · OAuth setup ~10 min
              </p>
            </div>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/pricing#quote">Book a 15-min demo</Link>
            </Button>
            <Button variant="ghost" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/sign-in">
                <Play className="size-4" />
                Watch overview
              </Link>
            </Button>
          </div>

          <div className="mb-6 flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
            <UserAvatar name={HERO_TESTIMONIAL.name} size="sm" />
            <div>
              <p className="text-muted-foreground">&ldquo;{HERO_TESTIMONIAL.quote}&rdquo;</p>
              <p className="mt-1 font-medium text-foreground">
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
        </ScrollReveal>

        <ScrollReveal delay={150} className="w-full">
          <AspectRatio ratio={16 / 10} className="w-full max-md:order-first">
            <HeroVisual />
          </AspectRatio>
        </ScrollReveal>
      </div>

      <Separator className="my-10 max-w-6xl mx-auto" />

      <div className="mkt-hero__blocks grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUILDING_BLOCKS.map((block, i) => (
          <ScrollReveal key={block.id} delay={i * 100}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="gap-3">
                <FeatureIcon name={block.icon} size={22} />
                <CardTitle className="text-base">{block.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{block.description}</CardDescription>
              </CardHeader>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
