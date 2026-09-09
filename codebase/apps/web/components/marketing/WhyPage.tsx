import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LinkButton } from '@/components/ui/LinkButton';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MobileNav } from '@/components/marketing/MobileNav';
import { TRUST_BADGES, WHY_VALUE_PROPS } from '@/lib/marketing-content';

export function WhyPage() {
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
          <Link href="/why" aria-current="page">Why AI CRM</Link>
          <Link href="/#modules">Solutions</Link>
          <Link href="/#integrations">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="mkt-header__ctas">
          <LinkButton href="/sign-in" variant="ghost" size="sm">Sign in</LinkButton>
          <LinkButton href="/pricing" size="sm" icon={<ArrowRight size={15} />}>
            Get pricing
          </LinkButton>
        </div>
        <MobileNav />
      </header>

      <section className="mkt-pricing-hero">
        <div className="mkt-pricing-hero__inner">
          <span className="mkt-eyebrow">Why AI CRM</span>
          <h1>Your CRM stores fields. We unify the context behind every deal.</h1>
          <p>
            Technical sales teams lose hours hunting across Slack threads, Gong clips, calendar notes,
            and CRM updates. AI CRM is the presales operating system that sits next to your CRM —
            converging scattered signals into one cited, approval-gated record per opportunity.
          </p>
          <p className="mkt-pricing-hero__stats">
            4 hr saved per deal per week · 95% citation coverage on AI claims
          </p>
        </div>
      </section>

      <section className="mkt-mvp">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Why teams switch</span>
          <h2>Four reasons revenue teams choose AI CRM</h2>
          <p>
            Not a generic CRM add-on — a context layer and agent platform built for solutions
            engineering, presales, and RevOps.
          </p>
        </div>
        <div className="mkt-mvp__grid">
          {WHY_VALUE_PROPS.map((prop) => (
            <article key={prop.title} className="mkt-card">
              <FeatureIcon name={prop.icon} size={22} color={prop.accent} />
              <h3>{prop.title}</h3>
              <p>{prop.description}</p>
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
        <p className="mkt-trust__note">Enterprise-grade security for revenue teams</p>
      </section>

      <section className="mkt-cta">
        <BrandLogo href="/" size="lg" showText={false} />
        <h2>Ready to see pricing for your team?</h2>
        <p>
          Tell us your CRM, team size, and workflow — we&apos;ll tailor a quote in four quick steps.
        </p>
        <div className="mkt-hero__actions">
          <LinkButton href="/pricing" size="lg" icon={<ArrowRight size={18} />}>
            View pricing
          </LinkButton>
          <LinkButton href="/sign-in" variant="soft" size="lg">
            Start free
          </LinkButton>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-footer__grid">
          <div>
            <BrandLogo href="/" variant="light" size="sm" />
            <p>AI-native presales operating system</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link href="/why">Why AI CRM</Link>
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
