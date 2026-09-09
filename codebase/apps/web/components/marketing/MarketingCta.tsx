import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function MarketingCta({
  title,
  description,
  primaryHref = '/sign-up',
  primaryLabel = 'Start free',
  secondaryHref = '/pricing#quote',
  secondaryLabel = 'Get custom pricing',
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-20">
      <Card className="mx-auto max-w-3xl border-primary/30 bg-gradient-to-br from-primary/8 to-background text-center">
        <CardHeader className="items-center gap-4">
          <BrandLogo href="/" size="lg" showText={false} />
          <CardTitle className="text-2xl text-foreground sm:text-3xl">{title}</CardTitle>
          <CardDescription className="max-w-lg text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
