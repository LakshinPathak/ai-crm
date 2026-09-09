'use client';

import { useEffect, useRef, useState } from 'react';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { Card, CardContent } from '@/components/ui/card';
import { STATS, STATS_FOOTNOTE } from '@/lib/marketing-content';
import { ScrollReveal } from './ScrollReveal';

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}

function StatCard({
  stat,
  active,
  delay,
}: {
  stat: (typeof STATS)[number];
  active: boolean;
  delay: number;
}) {
  const count = useCountUp(stat.value, active);

  return (
    <ScrollReveal delay={delay}>
      <Card className="text-center transition-shadow hover:shadow-md">
        <CardContent className="pt-6">
          <FeatureIcon name={stat.icon} size={18} className="mx-auto mb-2" />
          <div className="text-3xl font-extrabold tabular-nums text-primary sm:text-4xl">
            {count}{stat.suffix}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}

export function AnimatedStats() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="mkt-stats px-4 sm:px-6">
      <ScrollReveal>
        <h2 className="text-2xl font-bold sm:text-3xl">
          What presales teams report in the <em>first 90 days</em>
        </h2>
        <p>SEs and AEs stop hunting context across tools — leadership sees risk before it slips.</p>
      </ScrollReveal>
      <div className="mkt-stats__grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} active={active} delay={i * 80} />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">{STATS_FOOTNOTE}</p>
    </section>
  );
}
