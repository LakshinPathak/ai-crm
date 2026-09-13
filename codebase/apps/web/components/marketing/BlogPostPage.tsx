import Link from 'next/link';
import { MarketingCta } from '@/components/marketing/MarketingCta';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
      <div className="mx-auto w-full max-w-3xl bg-background px-4 pt-10 text-foreground sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/blog">Blog</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <p className="mt-6 text-xs font-medium text-foreground/80">{post.date}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/80">{post.excerpt}</p>
      </div>

      <article className="prose mx-auto max-w-3xl bg-background px-4 py-12 text-base leading-relaxed text-foreground sm:px-6 sm:py-16">
        <div className="space-y-6">
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
