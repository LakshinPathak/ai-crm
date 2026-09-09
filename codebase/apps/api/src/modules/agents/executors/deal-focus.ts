import { Deal } from '@ai-crm/db';
import type { AgentRunContext } from '../executor.js';

const STALL_THRESHOLD_DAYS = 14;
const MS_PER_DAY = 86400000;
const TOP_N = 5;

/** Weights aligned with agent-platform.md §5 (risk, blockers, stall, urgency/hot, value). */
const WEIGHTS = {
  risk: 0.25,
  blockers: 0.2,
  stall: 0.2,
  hot: 0.15,
  amount: 0.2,
} as const;

const HOT_HARD_BOOST = 10;

export interface FocusDealItem {
  dealId: string;
  title: string;
  score: number;
  reasons: string[];
}

interface DealFocusRunResult {
  status: 'completed';
  output: { focusDeals: FocusDealItem[] };
  creditsUsed: number;
}

export async function runDealFocus(ctx: AgentRunContext): Promise<DealFocusRunResult> {
  const openDeals = await Deal.find({
    workspaceId: ctx.workspaceId,
    ownerId: ctx.userId,
    status: 'open',
    deletedAt: null,
  });

  if (openDeals.length === 0) {
    return {
      status: 'completed',
      creditsUsed: 0.2,
      output: { focusDeals: [] },
    };
  }

  const maxAmount = Math.max(...openDeals.map((d) => d.amount ?? 0), 1);

  const focusDeals = openDeals
    .map((deal) => {
      const { score, reasons } = scoreDeal(deal, maxAmount);
      return {
        dealId: deal.id,
        title: deal.title,
        score,
        reasons,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.dealId.localeCompare(b.dealId);
    })
    .slice(0, TOP_N);

  return {
    status: 'completed',
    creditsUsed: 0.2,
    output: { focusDeals },
  };
}

function getStallDays(lastActivityAt: Date | null | undefined, updatedAt: Date): number {
  const ref = lastActivityAt ?? updatedAt;
  return Math.max(0, Math.floor((Date.now() - ref.getTime()) / MS_PER_DAY));
}

function scoreDeal(
  deal: InstanceType<typeof Deal>,
  maxAmount: number,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const stallDays = getStallDays(deal.lastActivityAt, deal.updatedAt);

  const riskNorm = clampPercent(deal.riskScore ?? 0);
  const blockerNorm = clampPercent((deal.blockerCount ?? 0) * 25);
  const stallNorm = clampPercent((stallDays / STALL_THRESHOLD_DAYS) * 100);
  const hotNorm = deal.isHot ? 100 : 0;
  const amountNorm = clampPercent(((deal.amount ?? 0) / maxAmount) * 100);

  const weighted =
    riskNorm * WEIGHTS.risk +
    blockerNorm * WEIGHTS.blockers +
    stallNorm * WEIGHTS.stall +
    hotNorm * WEIGHTS.hot +
    amountNorm * WEIGHTS.amount;

  const score = Math.min(100, Math.round(weighted + (deal.isHot ? HOT_HARD_BOOST : 0)));

  if (deal.riskScore >= 61) {
    reasons.push(`Critical risk score (${deal.riskScore})`);
  } else if (deal.riskScore >= 31) {
    reasons.push(`Elevated risk score (${deal.riskScore})`);
  } else if (deal.riskScore > 0) {
    reasons.push(`Risk score ${deal.riskScore}`);
  }

  const blockers = deal.blockerCount ?? 0;
  if (blockers > 0) {
    reasons.push(`${blockers} open blocker${blockers === 1 ? '' : 's'}`);
  }

  if (stallDays >= STALL_THRESHOLD_DAYS) {
    reasons.push(`No activity for ${stallDays} days (stalled)`);
  } else if (stallDays >= 7) {
    reasons.push(`${stallDays} days since last activity`);
  }

  if (deal.isHot) {
    reasons.push('Hot deal with active buying signals');
  }

  const amount = deal.amount ?? 0;
  if (amount > 0 && amountNorm >= 60) {
    reasons.push(`High pipeline value (${formatCurrency(amount, deal.currency)})`);
  } else if (amount > 0 && amountNorm >= 30) {
    reasons.push(`Significant deal value (${formatCurrency(amount, deal.currency)})`);
  }

  if (reasons.length === 0) {
    reasons.push('Prioritized for daily focus');
  }

  return { score, reasons };
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}
