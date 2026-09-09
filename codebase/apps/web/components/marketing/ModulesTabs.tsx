'use client';

import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FEATURE_MODULES, MODULE_OUTCOMES } from '@/lib/marketing-content';

const TAB_LABELS: Record<string, string> = {
  A: 'SE Workflow',
  B: 'AI Intel',
  C: 'Agents',
  D: 'Analytics',
  E: 'Product Gaps',
  F: 'Buyer Portal',
};

export function ModulesTabs() {
  return (
    <Tabs defaultValue="A" className="mx-auto w-full max-w-4xl px-4 sm:px-0">
      <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
        {FEATURE_MODULES.map((mod) => (
          <TabsTrigger
            key={mod.letter}
            value={mod.letter}
            className="text-xs sm:text-sm data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground"
          >
            {TAB_LABELS[mod.letter] ?? mod.letter}
          </TabsTrigger>
        ))}
      </TabsList>
      {FEATURE_MODULES.map((mod) => (
        <TabsContent key={mod.letter} value={mod.letter}>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <FeatureIcon name={mod.icon} size={24} />
                <div className="min-w-0">
                  <CardTitle>{mod.title}</CardTitle>
                  <CardDescription>{MODULE_OUTCOMES[mod.letter]}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {mod.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
