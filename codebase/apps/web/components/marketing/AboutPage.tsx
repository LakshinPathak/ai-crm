import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero';
import { MarketingShell } from '@/components/marketing/MarketingShell';

const MISSION_POINTS = [
  {
    title: 'Context over fields',
    description:
      'CRM systems record what happened. We unify why it matters — Slack threads, Gong moments, calendar notes, and MEDDPICC in one cited record.',
    icon: 'layers',
  },
  {
    title: 'Agents with guardrails',
    description:
      'Automation should accelerate presales, not bypass humans. Every agent run is scoped, cited, and approval-gated before writes.',
    icon: 'sparkles',
  },
  {
    title: 'Built for technical sales',
    description:
      'POC workflows and SE deal rooms — buyer portal is on the roadmap, not shipping yet.',
    icon: 'users',
  },
] as const;

export function AboutPage() {
  return (
    <MarketingShell activeHref="/about">
      <MarketingPageHero
        badge="About us"
        title="The presales operating system revenue teams deserve"
        description="AI CRM was founded to solve a simple problem: technical sellers spend more time hunting for context than advancing deals. Our mission is to give every SE, AE, and RevOps leader a single, trustworthy view of each opportunity — with AI that cites its sources."
        stats="Founded for B2B technical sales · Multi-CRM from day one"
      />

      <section className="mkt-mvp bg-muted px-4 py-12 sm:px-6 sm:py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Our mission</span>
          <h2 className="text-foreground">What we believe presales teams need</h2>
          <p className="!text-foreground/80">
            We are building the context layer that sits next to your CRM — not another database of
            fields, but a living record of every signal that shapes a deal.
          </p>
        </div>
        <div className="mkt-mvp__grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MISSION_POINTS.map((point) => (
            <Card key={point.title} className="bg-card transition-shadow hover:shadow-md">
              <CardHeader>
                <FeatureIcon name={point.icon} size={22} />
                <CardTitle className="text-base">{point.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed !text-foreground/80">{point.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <MarketingCta
        title="Join teams unifying deal context with AI CRM"
        description="Start with your CRM connection and see cited summaries, risk agents, and POC workflows in one workspace."
        primaryHref="/sign-up"
        primaryLabel="Start free"
        secondaryHref="/pricing#quote"
        secondaryLabel="Get custom pricing"
      />
    </MarketingShell>
  );
}
