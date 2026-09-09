'use client';

import Link from 'next/link';
import type { DealCard } from '@/lib/types';
import { formatMoney, initials } from '@/lib/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { BlockerBadge, HotBadge, SentimentBadge } from '@/components/deals/deal-badges';

export function DealTable({ deals }: { deals: DealCard[] }) {
  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <p className="font-medium text-foreground">No deals found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="overflow-x-auto p-0">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Deal</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Win %</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>
                  <Link
                    href={`/deals/${deal.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {deal.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(deal.companyName)}</AvatarFallback>
                    </Avatar>
                    {deal.companyName}
                  </div>
                </TableCell>
                <TableCell>{formatMoney(deal.amount)}</TableCell>
                <TableCell>{deal.winProbability}%</TableCell>
                <TableCell>
                  <SentimentBadge sentiment={deal.sentiment} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {deal.isHot && <HotBadge />}
                    {(deal.blockerCount ?? 0) > 0 && (
                      <BlockerBadge count={deal.blockerCount!} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
