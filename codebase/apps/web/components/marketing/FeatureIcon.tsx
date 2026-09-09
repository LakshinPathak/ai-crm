import type { CSSProperties } from 'react';
import {
  Layers,
  Sparkles,
  Radar,
  ClipboardCheck,
  Users,
  BarChart3,
  LayoutDashboard,
  Kanban,
  FlaskConical,
  Shield,
  Lock,
  KeyRound,
  Fingerprint,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  layers: Layers,
  sparkles: Sparkles,
  radar: Radar,
  clipboard: ClipboardCheck,
  users: Users,
  chart: BarChart3,
  dashboard: LayoutDashboard,
  kanban: Kanban,
  flask: FlaskConical,
  shield: Shield,
  lock: Lock,
  key: KeyRound,
  fingerprint: Fingerprint,
  badge: BadgeCheck,
};

type Props = {
  name: string;
  size?: number;
  className?: string;
  color?: string;
};

export function FeatureIcon({ name, size = 20, className = '', color }: Props) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return (
    <span
      className={`feature-icon ${className}`.trim()}
      style={color ? { '--feature-icon-color': color } as CSSProperties : undefined}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
