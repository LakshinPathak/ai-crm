import { Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { TRUST_BADGES_ROADMAP, TRUST_BADGES_VERIFIED, TRUST_FAQ } from '@/lib/marketing-content';

export function TrustSection() {
  return (
    <section id="security" className="mx-auto max-w-3xl bg-muted/40 px-6 py-16">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Security</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Enterprise-grade controls for revenue teams
        </h2>
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {TRUST_BADGES_VERIFIED.map((badge) => (
          <Badge key={badge.label} variant="secondary" className="gap-1.5 px-3 py-1.5">
            <FeatureIcon name={badge.icon} size={14} />
            {badge.label}
          </Badge>
        ))}
        {TRUST_BADGES_ROADMAP.map((badge) => (
          <Badge key={badge.label} variant="outline" className="gap-1.5 px-3 py-1.5">
            <FeatureIcon name={badge.icon} size={14} />
            {badge.label}
          </Badge>
        ))}
      </div>

      <Alert className="mb-8">
        <Info className="size-4" />
        <AlertTitle>Compliance roadmap</AlertTitle>
        <AlertDescription>
          SOC 2 Type II and GDPR certification are in progress. AES-256 at rest, TLS 1.3, and SSO/SAML
          are available today.
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        {TRUST_FAQ.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger className="text-left font-semibold">{item.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
