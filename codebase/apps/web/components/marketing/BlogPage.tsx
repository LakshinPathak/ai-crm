import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { BLOG_POSTS } from '@/lib/marketing-content';

export function BlogPage() {
  return (
    <MarketingShell activeHref="/blog">
      <section className="mkt-pricing-hero bg-background px-6">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">Blog</Badge>
          <h1 className="text-foreground">Presales insights for revenue teams</h1>
          <p className="text-muted-foreground">
            Practical guidance on deal context, AI agents, and technical sales workflows — from the
            team building AI CRM.
          </p>
        </div>
      </section>

      <section className="mkt-mvp bg-muted/40 px-6 py-16">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow text-primary">Latest posts</span>
          <h2 className="text-foreground">Ideas for modern presales leaders</h2>
        </div>
        <div className="mkt-mvp__grid">
          {BLOG_POSTS.map((post) => (
            <Card key={post.slug} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <p className="text-xs font-medium text-muted-foreground">{post.date}</p>
                <CardTitle className="text-base">
                  <Link href={post.href} className="hover:text-primary">
                    {post.title}
                  </Link>
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">{post.excerpt}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <MarketingCta
        title="See how AI CRM unifies your deal context"
        description="Connect your CRM, Gong, and Slack in minutes — then let agents surface risks and next steps with citations."
        primaryHref="/sign-up"
        primaryLabel="Start free"
        secondaryHref="/product"
        secondaryLabel="Explore product"
      />
    </MarketingShell>
  );
}
