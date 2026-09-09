'use client';

import { useEffect, useState } from 'react';
import { cn } from 'cn';

export function RotatingText({
  words,
  intervalMs = 2800,
  className,
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase('out');
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setPhase('in');
      }, 280);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [words.length, intervalMs]);

  return (
    <span
      className={cn(
        'mkt-rotating-text inline-block min-w-[9ch]',
        phase === 'in' ? 'mkt-rotating-text--in' : 'mkt-rotating-text--out',
        className,
      )}
      aria-live="polite"
    >
      {words[index]}
    </span>
  );
}
