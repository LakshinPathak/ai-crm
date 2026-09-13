import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border bg-background/95 p-3 text-foreground backdrop-blur md:hidden">
      <Button className="flex-1 text-primary-foreground" size="sm" asChild>
        <Link href="/sign-up" className="text-primary-foreground">
          Start free
        </Link>
      </Button>
      <Button className="flex-1 text-foreground" size="sm" variant="outline" asChild>
        <Link href="/pricing#quote" className="text-foreground">
          Book demo
        </Link>
      </Button>
    </div>
  );
}
