import Link from 'next/link';
import { ArrowRight, Check, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LinkButton } from '@/components/ui/LinkButton';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MobileNav } from '@/components/marketing/MobileNav';
import { PricingWizard } from '@/components/marketing/PricingWizard';
import {
  PRICING_BULLETS,
  PRICING_SECURITY,
  PRICING_TESTIMONIALS,
  TRUST_BADGES,
} from '@/lib/marketing-content';

export function PricingPage() {
  return (
    <div className="mkt">
      <div className="mkt-announce">
        <Zap size={14} className="mkt-announce__icon" />
        Connect HubSpot, Salesforce, Pipedrive, or Zoho in under 10 minutes.
        <Link href="/sign-in">See how →</Link>
      </div>

      <header className="mkt-header">
        <BrandLogo href="/" size="sm" />
        <nav className="mkt-nav" aria-label="Main">
          <Link href="/#features">Product</Link>
          <Link href="/#modules">Solutions</Link>
          <Link href="/#integrations">Integrations</Link>
          <Link href="/pricing" aria-current="page">Pricing</Link>
          <Link href="/#mvp">MVP</Link>
        </nav>
        <div className="mkt-header__ctas">
          <LinkButton href="/sign-in" variant="ghost" size="sm">Sign in</LinkButton>
          <LinkButton href="/pricing#quote" size="sm" icon={<ArrowRight size={15} />}>
            Get pricing
          </LinkButton>
        </div>
        <MobileNav />
      </header>

      <section className="mkt-pricing-hero">
        <div className="mkt-pricing-hero__inner">
          <span className="mkt-eyebrow">Request custom pricing</span>
          <h1>Pricing tailored to how your team sells.</h1>
          <p>
            Your CRM, your team size, your process — pricing should reflect that.
            No rigid per-seat surprises.
          </p>
          <ul className="mkt-pricing-hero__bullets">
            {PRICING_BULLETS.map((bullet) => (
              <li key={bullet}>
                <Check size={16} />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mkt-pricing-hero__stats">
            Rated 4.8/5 on G2 · 95% of POCs become customers
          </p>
        </div>
      </section>

      <section className="mkt-pricing-wizard-wrap">
        <PricingWizard />
      </section>

      <section className="mkt-pricing-proof">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Proof</span>
          <h2>Trusted by presales and RevOps leaders</h2>
        </div>
        <div className="mkt-pricing-proof__grid">
          {PRICING_TESTIMONIALS.map((item) => (
            <article key={item.name} className="mkt-pricing-quote">
              <p>&ldquo;{item.quote}&rdquo;</p>
              <footer>
                <strong>{item.name}</strong>
                <span>{item.title}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-pricing-security">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Security</span>
          <h2>Built for enterprise revenue teams</h2>
        </div>
        <div className="mkt-pricing-security__grid">
          {PRICING_SECURITY.map((item, i) => (
            <article key={item.title} className="mkt-card">
              <FeatureIcon
                name={(['shield', 'key', 'lock'] as const)[i]}
                size={22}
                color="#7c3aed"
              />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-trust">
        <div className="mkt-trust__badges">
          {TRUST_BADGES.map((badge) => (
            <span key={badge.label} className="mkt-trust-badge">
              <FeatureIcon name={badge.icon} size={15} />
              {badge.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mkt-cta">
        <h2>Get your custom pricing now.</h2>
        <p>Answer four quick questions — we&apos;ll tailor a quote to your stack and team.</p>
        <LinkButton href="/pricing#quote" size="lg" icon={<ArrowRight size={18} />}>
          Start quote wizard →
        </LinkButton>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-footer__grid">
          <div>
            <BrandLogo href="/" variant="light" size="sm" />
            <p>AI-native presales operating system</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link href="/#mvp">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in">Sign in</Link>
          </div>
          <div>
            <h4>Build</h4>
            <a href="https://github.com" target="_blank" rel="noreferrer">API (roadmap)</a>
            <Link href="/#modules">MCP (roadmap)</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/#features">Security</Link>
            <Link href="/sign-in">Contact</Link>
          </div>
        </div>
        <div className="mkt-footer__bar">
          <span>© 2026 AI CRM. Built for revenue teams.</span>
          <span>Privacy · Terms · Status</span>
        </div>
      </footer>
    </div>
  );
}
