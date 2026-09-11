import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';

type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  body: readonly string[];
};

export function BlogPostPage({ post }: { post: BlogPost }) {
  return (
    <MarketingShell activeHref="/blog">
      <section className="mkt-pricing-hero bg-background px-4 sm:px-6">
        <div className="mkt-pricing-hero__inner">
          <Badge variant="secondary" className="mb-4">Blog</Badge>
          <p className="text-xs font-medium text-muted-foreground">{post.date}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="text-muted-foreground">{post.excerpt}</p>
          <p className="mkt-pricing-hero__stats">
            <Link href="/blog" className="text-primary hover:underline">
              ← Back to all posts
            </Link>
          </p>
        </div>
      </section>

      <article className="bg-muted/40 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-muted-foreground leading-relaxed">
          {post.body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </article>

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
