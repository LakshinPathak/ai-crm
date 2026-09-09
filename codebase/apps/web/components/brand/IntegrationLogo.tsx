export type IntegrationId =
  | 'hubspot'
  | 'salesforce'
  | 'pipedrive'
  | 'zoho'
  | 'gong'
  | 'chorus'
  | 'slack'
  | 'teams'
  | 'google-chat'
  | 'google-calendar'
  | 'outlook'
  | 'zoom'
  | 'jira'
  | 'linear'
  | 'google-drive'
  | 'notion';

type Props = {
  id: IntegrationId;
  size?: number;
  className?: string;
};

function LogoSvg({ size, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size ?? 28}
      height={size ?? 28}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const LOGOS: Record<IntegrationId, (size?: number, className?: string) => React.ReactNode> = {
  hubspot: (size, className) => (
    <LogoSvg id="hubspot" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#ff7a59" />
      <circle cx="16" cy="16" r="7" stroke="white" strokeWidth="2.5" fill="none" />
      <circle cx="16" cy="16" r="2.5" fill="white" />
    </LogoSvg>
  ),
  salesforce: (size, className) => (
    <LogoSvg id="salesforce" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#00a1e0" />
      <path
        d="M10 20c0-3.5 2.8-6.3 6.3-6.3 1.4 0 2.7.5 3.7 1.3 1-2.2 3.2-3.7 5.7-3.7 3.5 0 6.3 2.8 6.3 6.3 0 .4 0 .8-.1 1.2H10z"
        fill="white"
      />
    </LogoSvg>
  ),
  pipedrive: (size, className) => (
    <LogoSvg id="pipedrive" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#017737" />
      <path d="M10 22V10h4.5c3.2 0 5.2 1.6 5.2 4.2 0 2.2-1.4 3.6-3.5 4l5.3 3.8H18l-4.8-3.5H14v3.5H10z" fill="white" />
    </LogoSvg>
  ),
  zoho: (size, className) => (
    <LogoSvg id="zoho" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#e42527" />
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="14" fontWeight="800" fontFamily="system-ui,sans-serif">Z</text>
    </LogoSvg>
  ),
  gong: (size, className) => (
    <LogoSvg id="gong" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#8039df" />
      <path d="M8 18c2-4 4.5-6 8-6s6 2 8 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="12" r="2.5" fill="white" />
    </LogoSvg>
  ),
  chorus: (size, className) => (
    <LogoSvg id="chorus" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#1a1a2e" />
      <path d="M10 20V12h3l5 5 5-5h3v8h-3v-5l-5 5-5-5v5h-3z" fill="#00d4aa" />
    </LogoSvg>
  ),
  slack: (size, className) => (
    <LogoSvg id="slack" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#4a154b" />
      <rect x="9" y="14" width="5" height="5" rx="1.2" fill="#36c5f0" />
      <rect x="14" y="9" width="5" height="5" rx="1.2" fill="#2eb67d" />
      <rect x="18" y="14" width="5" height="5" rx="1.2" fill="#e01e5a" />
      <rect x="14" y="18" width="5" height="5" rx="1.2" fill="#ecb22e" />
    </LogoSvg>
  ),
  teams: (size, className) => (
    <LogoSvg id="teams" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#5059c9" />
      <rect x="8" y="10" width="10" height="12" rx="2" fill="white" />
      <circle cx="22" cy="12" r="4" fill="white" fillOpacity="0.9" />
      <path d="M18 18h8v4H18z" fill="white" fillOpacity="0.9" />
    </LogoSvg>
  ),
  'google-chat': (size, className) => (
    <LogoSvg id="google-chat" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#1a73e8" />
      <path d="M8 10h16v10H14l-4 4v-4H8V10z" fill="white" />
    </LogoSvg>
  ),
  'google-calendar': (size, className) => (
    <LogoSvg id="google-calendar" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="white" stroke="#e8eaef" />
      <rect x="8" y="10" width="16" height="14" rx="2" fill="#4285f4" />
      <rect x="8" y="8" width="16" height="5" rx="2" fill="#1967d2" />
      <rect x="11" y="16" width="4" height="3" rx="0.5" fill="white" />
      <rect x="17" y="16" width="4" height="3" rx="0.5" fill="white" />
    </LogoSvg>
  ),
  outlook: (size, className) => (
    <LogoSvg id="outlook" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#0078d4" />
      <rect x="8" y="10" width="16" height="12" rx="1.5" fill="white" fillOpacity="0.95" />
      <path d="M8 14h16" stroke="#0078d4" strokeWidth="1.5" />
    </LogoSvg>
  ),
  zoom: (size, className) => (
    <LogoSvg id="zoom" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#2d8cff" />
      <path d="M10 12h8v8h-8v-8zm10 2l6-3v10l-6-3v-4z" fill="white" />
    </LogoSvg>
  ),
  jira: (size, className) => (
    <LogoSvg id="jira" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#0052cc" />
      <path d="M16 8l8 8-8 8-8-8 8-8z" fill="white" />
      <path d="M16 14l4 4-4 4-4-4 4-4z" fill="#0052cc" />
    </LogoSvg>
  ),
  linear: (size, className) => (
    <LogoSvg id="linear" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#5e6ad2" />
      <path d="M10 22l12-12M14 22l8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </LogoSvg>
  ),
  'google-drive': (size, className) => (
    <LogoSvg id="google-drive" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#f8f9fc" stroke="#e8eaef" />
      <path d="M16 9l7 12H9l7-12z" fill="#0f9d58" />
      <path d="M9 21l3.5-6h13L23 21H9z" fill="#f4b400" />
      <path d="M16 9l-3.5 6h7L16 9z" fill="#4285f4" />
    </LogoSvg>
  ),
  notion: (size, className) => (
    <LogoSvg id="notion" size={size} className={className}>
      <rect width="32" height="32" rx="8" fill="#191919" />
      <rect x="10" y="9" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
      <text x="16" y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="serif">N</text>
    </LogoSvg>
  ),
};

const PROVIDER_ALIASES: Record<string, IntegrationId> = {
  'microsoft-teams': 'teams',
  'ms-teams': 'teams',
  'google_chat': 'google-chat',
  'google-calendar': 'google-calendar',
  'google-drive': 'google-drive',
};

export function isIntegrationId(id: string): id is IntegrationId {
  return id in LOGOS || id in PROVIDER_ALIASES;
}

export function resolveIntegrationId(id: string): IntegrationId | null {
  if (id in LOGOS) return id as IntegrationId;
  return PROVIDER_ALIASES[id] ?? null;
}

export function IntegrationLogo({ id, size = 28, className = '' }: Props) {
  const render = LOGOS[id];
  return <span className={`integration-logo ${className}`.trim()}>{render(size, className)}</span>;
}

export function IntegrationLogoOrFallback({
  id,
  name,
  size = 28,
  className = '',
}: {
  id: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const resolved = resolveIntegrationId(id);
  if (resolved) {
    return <IntegrationLogo id={resolved} size={size} className={className} />;
  }
  const label = (name ?? id).slice(0, 2).toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {label}
    </div>
  );
}

export function IntegrationLogoRow({ ids, size = 32 }: { ids: IntegrationId[]; size?: number }) {
  return (
    <div className="integration-logo-row">
      {ids.map((id) => (
        <IntegrationLogo key={id} id={id} size={size} />
      ))}
    </div>
  );
}
