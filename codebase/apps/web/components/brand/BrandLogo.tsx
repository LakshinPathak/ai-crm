import Link from 'next/link';
import { LogoMark } from './LogoMark';

type Props = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
};

const SIZES = { sm: 28, md: 32, lg: 40 } as const;

export function BrandLogo({
  href = '/',
  size = 'md',
  variant = 'dark',
  showText = true,
}: Props) {
  const markSize = SIZES[size];

  const content = (
    <>
      <LogoMark size={markSize} className="brand-logo__mark" />
      {showText && (
        <span className={`brand-logo__text brand-logo__text--${variant}`}>AI CRM</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="brand-logo" aria-label="AI CRM home">
        {content}
      </Link>
    );
  }

  return <div className="brand-logo">{content}</div>;
}
