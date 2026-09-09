'use client';

import { Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LANDING_TESTIMONIALS } from '@/lib/marketing-content';

export function TestimonialCarousel() {
  return (
    <section className="border-y border-border bg-background px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
            <span className="ml-2 text-sm font-semibold text-foreground">4.8/5 on G2</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What presales leaders are saying
          </h2>
        </div>

        <Carousel opts={{ align: 'start', loop: true }} className="mx-auto">
          <CarouselContent className="-ml-4">
            {LANDING_TESTIMONIALS.map((item) => (
              <CarouselItem key={item.name} className="basis-full pl-4 md:basis-1/2">
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
                  </CardContent>
                  <CardFooter className="flex items-center gap-3 border-t pt-4">
                    <UserAvatar name={item.name} size="sm" />
                    <div>
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.title}</div>
                    </div>
                  </CardFooter>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div>
    </section>
  );
}
