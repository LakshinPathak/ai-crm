export function formatMoney(n: number, compact = false) {
  if (compact && n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (compact && n >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function sentimentLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fitScore(winProb: number) {
  if (winProb >= 70) return { label: '5 - Excellent fit', color: 'teal' };
  if (winProb >= 50) return { label: '4 - Good fit', color: 'green' };
  if (winProb >= 30) return { label: '3 - OK fit', color: 'yellow' };
  return { label: '2 - Poor fit', color: 'red' };
}
