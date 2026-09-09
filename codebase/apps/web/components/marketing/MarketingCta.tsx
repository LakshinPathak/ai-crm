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
    <section className="px-6 py-20">
      <Card className="mx-auto max-w-3xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent text-center">
        <CardHeader className="items-center gap-4">
          <BrandLogo href="/" size="lg" showText={false} />
          <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
          <CardDescription className="max-w-lg text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
