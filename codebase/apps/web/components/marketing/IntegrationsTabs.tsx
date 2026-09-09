'use client';

import Link from 'next/link';
import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { INTEGRATIONS } from '@/lib/marketing-content';

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM',
  calls: 'Calls',
  chat: 'Chat',
  calendar: 'Calendar',
  platform: 'Platform',
};

export function IntegrationsTabs() {
  const categories = Object.keys(INTEGRATIONS);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Tabs defaultValue="crm">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-center gap-1">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="capitalize data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground"
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="flex flex-wrap justify-center gap-2">
              {INTEGRATIONS[cat].map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="gap-2 border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
                >
                  <IntegrationLogo id={item.id} size={22} />
                  {item.name}
                </Badge>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <div className="mt-6 text-center">
        <Button variant="link" asChild>
          <Link href="/pricing#quote">See all connectors in your quote →</Link>
        </Button>
      </div>
    </div>
  );
}
