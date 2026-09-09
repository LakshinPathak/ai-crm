import { Skeleton } from '@/components/ui/skeleton';

export { Skeleton };

export function PageSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-full max-w-52" />
        <Skeleton className="h-4 w-full max-w-36" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24 min-w-0" />
        <Skeleton className="h-24 min-w-0" />
        <Skeleton className="h-24 min-w-0" />
      </div>
      <Skeleton className="h-72 w-full min-w-0" />
    </div>
  );
}
