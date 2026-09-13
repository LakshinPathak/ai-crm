'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { MarketingNavItem } from '@/components/marketing/MarketingHeader';

const DEFAULT_NAV: MarketingNavItem[] = [
  { href: '/product', label: 'Product', isRoute: true },
  { href: '/why', label: 'Why AI CRM', isRoute: true },
  { href: '/#modules', label: 'Solutions' },
  { href: '/#integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing', isRoute: true },
];

export function MobileNav({ nav = DEFAULT_NAV }: { nav?: MarketingNavItem[] }) {
  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 border-border bg-background text-foreground sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
            {nav.map((link) => (
              <SheetClose key={link.href} asChild>
                {link.isRoute ? (
                  <Button variant="ghost" className="justify-start text-foreground" asChild>
                    <Link href={link.href} className="text-foreground">{link.label}</Link>
                  </Button>
                ) : (
                  <Button variant="ghost" className="justify-start text-foreground" asChild>
                    <a href={link.href} className="text-foreground">{link.label}</a>
                  </Button>
                )}
              </SheetClose>
            ))}
          </nav>
          <SheetFooter className="gap-2">
            <SheetClose asChild>
              <Button variant="outline" className="text-foreground" asChild>
                <Link href="/pricing#quote" className="text-foreground">Book demo</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="outline" className="text-foreground" asChild>
                <Link href="/sign-in" className="text-foreground">Sign in</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button className="text-primary-foreground" asChild>
                <Link href="/sign-up" className="text-primary-foreground">Start free</Link>
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
