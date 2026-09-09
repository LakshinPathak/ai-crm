import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

/** Product UI mockup — hero centerpiece */
export function HeroVisual() {
  return (
    <div
      className="hero-visual"
      role="img"
      aria-label="Deal workspace showing MEDDPICC summary with citations from Gong, Slack, and HubSpot"
    >
      <div className="hero-visual__glow" />

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

      <div className="hero-visual__window">
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
              <div className="hero-visual__card hero-visual__card--meddpicc">
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
                  <span>Gong 14:32</span>
                  <span>Slack msg</span>
                  <span>HubSpot</span>
                </div>
              </div>

              <div className="hero-visual__card hero-visual__card--stats">
                <div className="hero-visual__stat">
                  <TrendingUp size={16} />
                  <div>
                    <strong>78%</strong>
                    <span>Deal health</span>
                  </div>
                </div>
                <div className="hero-visual__stat">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>3/5</strong>
                    <span>POC phases</span>
                  </div>
                </div>
                <div className="hero-visual__activity-bars">
                  {[72, 45, 88, 60, 95, 70].map((h, i) => (
                    <div key={i} className="hero-visual__bar" style={{ height: `${h}%` }} />
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
