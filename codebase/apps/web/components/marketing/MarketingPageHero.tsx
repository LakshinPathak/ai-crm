import { Badge } from '@/components/ui/badge';

export function MarketingPageHero({
  badge,
  title,
  description,
  stats,
  children,
}: {
  badge?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  stats?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative mx-auto w-full max-w-[1180px] bg-background px-4 pb-8 pt-14 sm:px-6 sm:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent)]"
      />
      <div className="relative max-w-[640px]">
        {badge ? (
          <Badge variant="secondary" className="mb-4">
            {badge}
          </Badge>
        ) : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 text-base leading-relaxed text-foreground/80">{description}</p>
        ) : null}
        {stats ? <p className="mt-4 text-sm font-semibold text-primary">{stats}</p> : null}
        {children}
      </div>
    </section>
  );
}
