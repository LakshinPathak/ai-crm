'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

type NavLink = { href: string; label: string; isRoute?: boolean };

const NAV_LINKS: NavLink[] = [
  { href: '#features', label: 'Product' },
  { href: '#modules', label: 'Solutions' },
  { href: '#integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing', isRoute: true },
  { href: '#mvp', label: 'MVP' },
];

export function MobileNav() {
  return (
    <div className="mkt-mobile-nav">
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="mkt-mobile-nav__toggle"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="mkt-mobile-nav__panel">
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <DrawerClose key={link.href} asChild>
                {link.isRoute ? (
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ) : (
                  <Button variant="ghost" className="justify-start" asChild>
                    <a href={link.href}>{link.label}</a>
                  </Button>
                )}
              </DrawerClose>
            ))}
          </nav>
          <DrawerFooter className="gap-2">
            <DrawerClose asChild>
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button asChild>
                <Link href="/sign-in">Start free</Link>
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
