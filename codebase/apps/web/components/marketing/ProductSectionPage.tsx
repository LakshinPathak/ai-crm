import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import {
  PRODUCT_SECTION_FEATURES,
  type ProductSectionSlug,
} from '@/lib/marketing-content';

type ProductSection = {
  slug: ProductSectionSlug;
  title: string;
  description: string;
  icon: string;
  accent: string;
};

export function ProductSectionPage({ section }: { section: ProductSection }) {
  const features = PRODUCT_SECTION_FEATURES[section.slug];

  return (
    <MarketingShell activeHref="/product">
      <MarketingPageHero
        badge={section.title}
        title={section.title}
        description={section.description}
        stats="Built for technical sales teams · Cited AI with human approval"
      />

      <section className="mkt-mvp bg-muted px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Key capabilities</span>
          <h2 className="text-foreground">Three ways {section.title.toLowerCase()} helps your team</h2>
          <p className="!text-foreground/80">Purpose-built for presales and RevOps — not a generic CRM add-on.</p>
        </div>
        <div className="mkt-mvp__grid">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card transition-shadow hover:shadow-md">
              <CardHeader>
                <FeatureIcon name={feature.icon} size={22} />
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed !text-foreground/80">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <MarketingCta
        title="Ready to see pricing for your team?"
        description="Tell us your CRM, team size, and workflow — we'll tailor a quote in four quick steps."
        primaryHref="/pricing#quote"
        primaryLabel="View pricing"
        secondaryHref="/product"
        secondaryLabel="All product areas"
      />
    </MarketingShell>
  );
}
