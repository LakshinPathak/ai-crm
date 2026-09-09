'use client';

import { type ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

export function StubTab({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
    />
  );
}
