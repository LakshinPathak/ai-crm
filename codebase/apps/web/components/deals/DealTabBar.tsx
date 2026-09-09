'use client';

import { DEAL_TABS } from './deal-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DealTabBar() {
  return (
    <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
      {DEAL_TABS.map((t) => (
        <TabsTrigger key={t.id} value={t.id} className="shrink-0">
          {t.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
