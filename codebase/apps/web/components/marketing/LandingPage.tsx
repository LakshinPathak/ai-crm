import Link from 'next/link';
import { ArrowRight, Play, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { HeroVisual } from '@/components/marketing/HeroVisual';
import {
  BUILDING_BLOCKS,
  FEATURE_MODULES,
  INTEGRATIONS,
  MARQUEE_ITEMS,
  MVP_FEATURES,
  STATS,
  TRUST_BADGES,
  CRM_LOGO_IDS,
} from '@/lib/marketing-content';
import { MobileNav } from '@/components/marketing/MobileNav';
import { cn } from 'cn';

type NavLink = { href: string; label: string; isRoute?: boolean };

const NAV_LINKS: NavLink[] = [
  { href: '#features', label: 'Product' },
  { href: '#modules', label: 'Solutions' },
  { href: '#integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing', isRoute: true },
  { href: '#mvp', label: 'MVP' },
];

export function LandingPage() {
  return (
    <div className="mkt">
      <div className="mkt-announce">
        <Zap size={14} className="mkt-announce__icon" />
        Connect HubSpot, Salesforce, Pipedrive, or Zoho in under 10 minutes.
        <Link href="/sign-in">See how →</Link>
      </div>

      <header className="mkt-header">
        <BrandLogo href="/" size="sm" />
        <NavigationMenu className="mkt-nav hidden max-w-none flex-1 justify-center md:flex" viewport={false}>
          <NavigationMenuList>
            {NAV_LINKS.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink
                  asChild
                  className={cn(navigationMenuTriggerStyle(), 'bg-transparent')}
                >
                  {link.isRoute ? (
                    <Link href={link.href}>{link.label}</Link>
                  ) : (
                    <a href={link.href}>{link.label}</a>
                  )}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="mkt-header__ctas">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-in">
              Start free
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        <MobileNav />
      </header>

      <section className="mkt-hero">
        <div className="mkt-hero__inner">
          <div className="mkt-hero__copy">
            <div className="mkt-hero__badge">
              <FeatureIcon name="sparkles" size={14} />
              AI-powered presales operating system
            </div>
            <h1>
              The context layer for<br />
              <em>technical sales teams</em>
            </h1>
            <p className="mkt-hero__sub">
              Sit alongside your CRM. Pull context from Slack, Gong, email, and calendar into one
              per-deal record. Run AI agents with citations — nothing writes without your approval.
            </p>
            <div className="mkt-hero__actions">
              <Button size="lg" asChild>
                <Link href="/sign-in">
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/sign-in">
                  <Play className="size-4" />
                  Watch demo
                </Link>
              </Button>
            </div>
            <div className="mkt-hero__crm-row">
              <span>Works with</span>
              <div className="mkt-hero__crm-logos">
                {CRM_LOGO_IDS.map((id) => (
                  <IntegrationLogo key={id} id={id} size={28} />
                ))}
              </div>
            </div>
          </div>
          <AspectRatio ratio={16 / 10} className="w-full">
            <HeroVisual />
          </AspectRatio>
        </div>

        <div className="mkt-hero__blocks">
          {BUILDING_BLOCKS.map((block) => (
            <article key={block.id} className="mkt-block">
              <FeatureIcon name={block.icon} size={22} color={block.accent} />
              <h3>{block.title}</h3>
              <p>{block.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-strip mkt-strip--crm">
        <p className="mkt-strip__label">Trusted by revenue teams using</p>
        <Carousel className="mx-auto w-full max-w-4xl">
          <CarouselContent className="-ml-2">
            {INTEGRATIONS.crm.map((item) => (
              <CarouselItem key={item.id} className="basis-1/2 pl-2 sm:basis-1/4">
                <div className="mkt-logo-card">
                  <IntegrationLogo id={item.id} size={36} />
                  <span>{item.name}</span>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
        <p className="mkt-strip__hint">OAuth · Stage mapping · Live pipeline sync</p>
      </section>

      <section className="mkt-marquee-wrap">
        <h2>Turn scattered deal context into a single system of intelligence</h2>
        <p>Calls, CRM, Slack, and calendar — converged into one record per opportunity.</p>
        <Carousel
          opts={{ align: 'start', loop: true }}
          className="mx-auto w-full max-w-5xl"
        >
          <CarouselContent className="-ml-2">
            {MARQUEE_ITEMS.map((item, i) => (
              <CarouselItem key={i} className="basis-auto pl-2">
                <span className="mkt-marquee__pill inline-flex items-center gap-2">
                  <FeatureIcon name={item.icon} size={14} />
                  {item.text}
                </span>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section className="mkt-stats">
        <h2>Sell complex deals <em>faster</em></h2>
        <p>SEs and AEs stop hunting context across tools — and leadership sees risk before it slips.</p>
        <div className="mkt-stats__grid">
          {STATS.map((stat) => (
            <div key={stat.label} className="mkt-stat">
              <FeatureIcon name={stat.icon} size={18} className="mkt-stat__icon" />
              <div className="mkt-stat__value">
                {stat.value}{stat.suffix}
              </div>
              <div className="mkt-stat__label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="mvp" className="mkt-mvp">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">MVP scope</span>
          <h2>Highest-leverage features to ship first</h2>
          <p>Based on Opine&apos;s core value prop — citation-first AI, agents with approval, and presales workflow.</p>
        </div>
        <div className="mkt-mvp__grid">
          {MVP_FEATURES.map((f) => (
            <article key={f.title} className="mkt-card">
              <FeatureIcon name={f.icon} size={22} color={f.accent} />
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="mkt-modules">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Full platform</span>
          <h2>Everything technical sales teams need</h2>
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

      <section id="integrations" className="mkt-integrations">
        <div className="mkt-section-head">
          <span className="mkt-eyebrow">Integrations</span>
          <h2>Connect your entire revenue stack</h2>
        </div>
        <div className="mkt-int-grid">
          {Object.entries(INTEGRATIONS).map(([category, items]) => (
            <div key={category} className="mkt-int-col">
              <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
              <div className="mkt-int-tags">
                {items.map((item) => (
                  <span key={item.id} className="mkt-int-tag">
                    <IntegrationLogo id={item.id} size={22} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mkt-trust">
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
          <Button size="lg" asChild>
            <Link href="/sign-in">
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/sign-in">Book a demo</Link>
          </Button>
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
            <a href="#mvp">Features</a>
            <a href="#integrations">Integrations</a>
            <Link href="/sign-in">Sign in</Link>
          </div>
          <div>
            <h4>Build</h4>
            <a href="https://github.com" target="_blank" rel="noreferrer">API (roadmap)</a>
            <a href="#modules">MCP (roadmap)</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#features">Security</a>
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
