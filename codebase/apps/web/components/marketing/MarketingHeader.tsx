import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { MobileNav } from '@/components/marketing/MobileNav';
import { cn } from 'cn';

export type MarketingNavItem = { href: string; label: string; isRoute?: boolean };

const DEFAULT_NAV: MarketingNavItem[] = [
  { href: '/product', label: 'Product', isRoute: true },
  { href: '/why', label: 'Why AI CRM', isRoute: true },
  { href: '/#modules', label: 'Solutions' },
  { href: '/#integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing', isRoute: true },
];

export function MarketingHeader({
  nav = DEFAULT_NAV,
  activeHref,
}: {
  nav?: MarketingNavItem[];
  activeHref?: string;
}) {
  return (
    <header className="mkt-header">
      <BrandLogo href="/" size="sm" />
      <NavigationMenu className="mkt-nav hidden max-w-none flex-1 justify-center md:flex" viewport={false}>
        <NavigationMenuList>
          {nav.map((link) => (
            <NavigationMenuItem key={link.href}>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle(),
                  'bg-transparent',
                  activeHref === link.href && 'text-primary',
                )}
              >
                {link.isRoute ? (
                  <Link href={link.href}>{link.label}</Link>
                ) : (
                  <a href={link.href}>{link.label}</a>
                )}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      <div className="mkt-header__ctas">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/sign-up">
            Start free
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <MobileNav />
    </header>
  );
}
