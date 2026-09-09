'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollReveal } from '@/components/marketing/animations/ScrollReveal';

const ALERTS = [
  {
    title: 'MEDDPICC drift detected',
    body: 'HubSpot stage moved to Evaluation but Gong call still references Discovery.',
    source: 'Gong + HubSpot',
  },
  {
    title: 'Risk agent flagged stall',
    body: 'No buyer activity in 14 days — champion quiet in Slack #deal-acme.',
    source: 'Slack thread',
  },
  {
    title: 'CRM write proposed',
    body: 'Update win probability 62% → 78% based on POC phase completion.',
    source: 'Approval queue',
  },
] as const;

export function AgentDriftDemo() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % ALERTS.length);
        setVisible(true);
      }, 350);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const alert = ALERTS[index];

  return (
    <section className="bg-background px-6 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <ScrollReveal>
          <Badge variant="secondary" className="mb-4">Like Slite — but for deals</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Agents detect drift across your revenue stack
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Inspired by self-maintaining knowledge bases — AI CRM watches Gong, Slack, and your CRM.
            When reality moves, it drafts the fix and routes it for human approval before any write.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <Card
            className={`mkt-drift-card border-primary/30 bg-gradient-to-br from-primary/8 to-card transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-sm">Agent triage</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">Human approval</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-sm text-foreground">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.body}</p>
                <p className="mt-2 text-xs text-primary font-medium">Source: {alert.source}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Badge variant="secondary" className="gap-1 px-2 py-1">
                  <X className="size-3" /> Reject
                </Badge>
                <Badge className="gap-1 px-2 py-1">
                  <Check className="size-3" /> Approve
                </Badge>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}
