import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LinkButton } from '@/components/ui/LinkButton';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MobileNav } from '@/components/marketing/MobileNav';
import {
  FEATURE_MODULES,
  MVP_FEATURES,
  PRODUCT_SECTIONS,
  TRUST_BADGES,
} from '@/lib/marketing-content';

export function ProductPage() {
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
          <Link href="/product" aria-current="page">Product</Link>
          <Link href="/why">Why AI CRM</Link>
          <Link href="/#modules">Solutions</Link>
          <Link href="/#integrations">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="mkt-header__ctas">
          <LinkButton href="/sign-in" variant="ghost" size="sm">Sign in</LinkButton>
          <LinkButton href="/sign-in" size="sm" icon={<ArrowRight size={15} />}>
            Start free
          </LinkButton>
        </div>
        <MobileNav />
      </header>

      <section className="mkt-pricing-hero">
        <div className="mkt-pricing-hero__inner">
          <span className="mkt-eyebrow">Product overview</span>
          <h1>Everything technical sales teams need — in one presales OS.</h1>
          <p>
            AI CRM sits next to your CRM and revenue stack. Explore each capability below —
            from unified deal records and cited AI to agents, analytics, and multi-CRM connectors.
          </p>
        </div>
      </section>

      <section id="capabilities" className="mkt-mvp">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Core capabilities</span>
          <h2>Five pillars of the platform</h2>
          <p>
            Dive into each area — detailed product pages coming soon for every workflow.
          </p>
        </div>
        <div className="mkt-mvp__grid">
          {PRODUCT_SECTIONS.map((section) => (
            <Link
              key={section.slug}
              href={`/product/${section.slug}`}
              className="mkt-card mkt-card--link"
            >
              <FeatureIcon name={section.icon} size={22} color={section.accent} />
              <h3>{section.title}</h3>
              <p>{section.description}</p>
              <span className="mkt-card__link">
                Explore {section.title.toLowerCase()} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="mvp" className="mkt-mvp">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">MVP scope</span>
          <h2>Highest-leverage features to ship first</h2>
          <p>Based on our core value prop — citation-first AI, agents with approval, and presales workflow.</p>
        </div>
        <div className="mkt-mvp__grid">
          {MVP_FEATURES.map((feature) => (
            <article key={feature.title} className="mkt-card">
              <FeatureIcon name={feature.icon} size={22} color={feature.accent} />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="mkt-modules">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Full platform</span>
          <h2>Module map for revenue teams</h2>
          <p>Six capability areas covering presales, intelligence, automation, analytics, and buyer experience.</p>
        </div>
        <div className="mkt-modules__grid">
          {FEATURE_MODULES.map((mod) => (
            <article key={mod.letter} className="mkt-module">
              <div className="mkt-module__head">
                <FeatureIcon name={mod.icon} size={20} color={mod.accent} />
                <span className="mkt-module__letter">{mod.letter}</span>
              </div>
              <h3>{mod.title}</h3>
              <ul>
                {mod.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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
        <h2>Ready to unify your presales workflow?</h2>
        <p>Start with HubSpot or demo data. Add agents and integrations as you grow.</p>
        <div className="mkt-hero__actions">
          <LinkButton href="/sign-in" size="lg" icon={<ArrowRight size={18} />}>
            Start free
          </LinkButton>
          <LinkButton href="/why" variant="soft" size="lg">
            Why AI CRM
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
            <Link href="/product">Overview</Link>
            <Link href="/why">Why AI CRM</Link>
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
