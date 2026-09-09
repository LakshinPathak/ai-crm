import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductSectionPage } from '@/components/marketing/ProductSectionPage';
import { getProductSection, PRODUCT_SECTIONS } from '@/lib/marketing-content';

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PRODUCT_SECTIONS.map((section) => ({ slug: section.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const section = getProductSection(slug);

  if (!section) {
    return { title: 'Product — AI CRM' };
  }

  return {
    title: `${section.title} — AI CRM`,
    description: section.description,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const section = getProductSection(slug);

  if (!section) {
    notFound();
  }

  return <ProductSectionPage section={section} />;
}
