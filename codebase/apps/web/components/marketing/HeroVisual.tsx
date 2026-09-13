import type { CSSProperties } from 'react';
import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

const LILAC = 'var(--chart-1)';
const MINT = 'var(--chart-2)';
const PEACH = 'var(--chart-3)';

const BAR_FILLS = [LILAC, MINT, PEACH, MINT, LILAC, PEACH] as const;

const CITATION_CHIP: CSSProperties[] = [
  { background: 'color-mix(in oklch, var(--chart-1) 28%, var(--card))', color: 'var(--foreground)' },
  { background: 'color-mix(in oklch, var(--chart-2) 28%, var(--card))', color: 'var(--foreground)' },
  { background: 'color-mix(in oklch, var(--chart-3) 28%, var(--card))', color: 'var(--foreground)' },
];

/** Product UI mockup — hero centerpiece */
export function HeroVisual() {
  return (
    <div
      className="hero-visual"
      role="img"
      aria-label="Deal workspace showing MEDDPICC summary with citations from Gong, Slack, and HubSpot"
    >
      <style>{`
        .hero-visual .hero-visual__card--meddpicc::before {
          background: linear-gradient(90deg, var(--chart-1), var(--chart-2), var(--chart-3));
        }
        .hero-visual .hero-visual__card--meddpicc::after {
          background: linear-gradient(105deg, transparent 40%, color-mix(in oklch, var(--chart-1) 20%, transparent) 50%, transparent 60%);
        }
        .hero-visual .hero-visual__nav-item--active {
          background: color-mix(in oklch, var(--chart-1) 32%, var(--card));
          border-color: color-mix(in oklch, var(--chart-1) 40%, var(--border));
        }
      `}</style>
      <div
        className="hero-visual__glow"
        style={{
          background:
            'radial-gradient(ellipse at 20% 30%, color-mix(in oklch, var(--chart-1) 42%, transparent), transparent 62%), radial-gradient(ellipse at 80% 20%, color-mix(in oklch, var(--chart-2) 36%, transparent), transparent 58%), radial-gradient(ellipse at 50% 90%, color-mix(in oklch, var(--chart-3) 28%, transparent), transparent 55%)',
        }}
      />

      <div className="hero-visual__float hero-visual__float--hubspot">
        <IntegrationLogo id="hubspot" size={36} />
        <span>HubSpot</span>
      </div>
      <div className="hero-visual__float hero-visual__float--slack">
        <IntegrationLogo id="slack" size={36} />
        <span>Slack</span>
      </div>
      <div className="hero-visual__float hero-visual__float--gong">
        <IntegrationLogo id="gong" size={36} />
        <span>Gong</span>
      </div>

      <div
        className="hero-visual__window"
        style={{
          background: 'var(--card)',
          boxShadow: 'var(--shadow-lg), 0 24px 60px color-mix(in oklch, var(--chart-1) 18%, transparent)',
        }}
      >
        <div className="hero-visual__chrome">
          <div className="hero-visual__dots">
            <span /><span /><span />
          </div>
          <div className="hero-visual__url">app.aicrm.io/deals/acme-enterprise</div>
        </div>

        <div className="hero-visual__body">
          <aside className="hero-visual__sidebar">
            <div className="hero-visual__nav-item hero-visual__nav-item--active" />
            <div className="hero-visual__nav-item" />
            <div className="hero-visual__nav-item" />
            <div className="hero-visual__nav-item" />
          </aside>

          <main className="hero-visual__main">
            <div className="hero-visual__deal-header">
              <div>
                <div className="hero-visual__deal-title">Acme Enterprise — Platform POC</div>
                <div className="hero-visual__deal-meta">$285,000 · Discovery → Evaluation</div>
              </div>
              <Badge variant="destructive" className="text-[10px]">At risk</Badge>
            </div>

            <div className="hero-visual__grid">
              <div
                className="hero-visual__card hero-visual__card--meddpicc"
                style={{
                  background: 'color-mix(in oklch, var(--chart-1) 18%, var(--card))',
                }}
              >
                <div className="hero-visual__card-head">
                  <Sparkles size={14} />
                  <span>MEDDPICC summary</span>
                  <em>Live</em>
                </div>
                <div className="hero-visual__med-line">
                  <strong>Metrics</strong>
                  <p>Target 40% infra cost reduction by Q3 — cited from Gong call 2/14</p>
                </div>
                <div className="hero-visual__med-line">
                  <strong>Decision</strong>
                  <p>CFO sign-off required — flagged in Slack #deal-acme</p>
                </div>
                <div className="hero-visual__citations">
                  {['Gong 14:32', 'Slack msg', 'HubSpot'].map((label, i) => (
                    <span key={label} style={CITATION_CHIP[i]}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="hero-visual__card hero-visual__card--stats"
                style={{
                  background: 'color-mix(in oklch, var(--chart-2) 16%, var(--card))',
                }}
              >
                <div className="hero-visual__stat">
                  <TrendingUp size={16} aria-hidden />
                  <div>
                    <strong>78%</strong>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">Deal health</span>
                  </div>
                </div>
                <div className="hero-visual__stat">
                  <CheckCircle2 size={16} aria-hidden />
                  <div>
                    <strong>3/5</strong>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">POC phases</span>
                  </div>
                </div>
                <div className="hero-visual__activity-bars">
                  {([72, 45, 88, 60, 95, 70] as const).map((h, i) => (
                    <div
                      key={i}
                      className="hero-visual__bar hero-visual__bar--animated"
                      style={{
                        '--bar-height': `${h}%`,
                        '--bar-delay': `${i * 0.12}s`,
                        background: BAR_FILLS[i],
                      } as CSSProperties}
                    />
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
