import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { TrustSection } from '@/components/marketing/TrustSection';
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
      <section className="mkt-pricing-hero">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">{section.title}</Badge>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
          <p className="mkt-pricing-hero__stats">
            Built for technical sales teams · Cited AI with human approval
          </p>
        </div>
      </section>

      <section className="mkt-mvp px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Key capabilities</span>
          <h2>Three ways {section.title.toLowerCase()} helps your team</h2>
          <p>Purpose-built for presales and RevOps — not a generic CRM add-on.</p>
        </div>
        <div className="mkt-mvp__grid">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <FeatureIcon name={feature.icon} size={22} color={feature.accent} />
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <TrustSection />

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
