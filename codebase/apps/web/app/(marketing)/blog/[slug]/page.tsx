import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BlogPostPage } from '@/components/marketing/BlogPostPage';
import { BLOG_POSTS, getBlogPost } from '@/lib/marketing-content';

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: 'Blog — AI CRM' };
  }

  return {
    title: `${post.title} — AI CRM`,
    description: post.excerpt,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return <BlogPostPage post={post} />;
}
