import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-background/95 p-3 backdrop-blur md:hidden">
      <Button className="flex-1" size="sm" asChild>
        <Link href="/sign-up">Start free</Link>
      </Button>
      <Button className="flex-1" size="sm" variant="outline" asChild>
        <Link href="/pricing#quote">Book demo</Link>
      </Button>
    </div>
  );
}
