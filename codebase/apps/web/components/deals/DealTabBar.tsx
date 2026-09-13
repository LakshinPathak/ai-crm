'use client';

import { ChevronDown } from 'lucide-react';
import { DEAL_TABS, type DealTabId } from './deal-tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from 'cn';

const PRIMARY_TAB_IDS: DealTabId[] = ['overview', 'plan', 'activity', 'insights'];

export function DealTabBar({
  value,
  onTabSelect,
}: {
  value: DealTabId;
  onTabSelect: (id: DealTabId) => void;
}) {
  const primary = DEAL_TABS.filter((t) => PRIMARY_TAB_IDS.includes(t.id));
  const more = DEAL_TABS.filter((t) => !PRIMARY_TAB_IDS.includes(t.id));
  const moreActive = more.find((t) => t.id === value);

  return (
    <TabsList variant="line" className="h-auto w-full flex-nowrap justify-start overflow-x-auto text-foreground">
      {primary.map((t) => (
        <TabsTrigger key={t.id} value={t.id} className="shrink-0 text-foreground/70 data-active:text-foreground">
          {t.label}
        </TabsTrigger>
      ))}
      {more.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-auto shrink-0 gap-1 px-1.5 py-0.5 font-medium text-foreground/60',
                moreActive && 'text-foreground',
              )}
            >
              {moreActive?.label ?? 'More'}
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {more.map((t) => (
              <DropdownMenuItem
                key={t.id}
                data-checked={value === t.id || undefined}
                onSelect={() => onTabSelect(t.id)}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </TabsList>
  );
}
