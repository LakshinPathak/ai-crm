import { IntegrationLogo } from '@/components/brand/IntegrationLogo';
import { INTEGRATIONS } from '@/lib/marketing-content';

const LOGO_ITEMS = Object.values(INTEGRATIONS).flat();

export function LogoMarquee() {
  const track = [...LOGO_ITEMS, ...LOGO_ITEMS];

  return (
    <section className="mkt-logo-marquee border-y border-border bg-muted/40 py-8">
      <p className="mb-5 text-center text-sm font-semibold text-muted-foreground">
        Trusted by revenue teams using
      </p>
      <div className="mkt-marquee">
        <div className="mkt-marquee__track mkt-marquee__track--logos">
          {track.map((item, i) => (
            <div key={`${item.id}-${i}`} className="mkt-logo-marquee__item">
              <IntegrationLogo id={item.id} size={32} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
