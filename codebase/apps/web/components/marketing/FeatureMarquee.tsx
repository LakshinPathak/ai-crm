import { FeatureIcon } from '@/components/marketing/FeatureIcon';
import { MARQUEE_ITEMS } from '@/lib/marketing-content';

export function FeatureMarquee() {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <section className="mkt-marquee-wrap">
      <h2>Turn scattered deal context into a single system of intelligence</h2>
      <p>SEs, AEs, and presales leaders — one record per opportunity.</p>
      <div className="mkt-marquee mt-6">
        <div className="mkt-marquee__track">
          {track.map((item, i) => (
            <span key={`${item.text}-${i}`} className="mkt-marquee__pill">
              <FeatureIcon name={item.icon} size={14} />
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
