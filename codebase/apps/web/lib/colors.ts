const PALETTES: [string, string][] = [
  ['#7c3aed', '#a78bfa'],
  ['#6366f1', '#818cf8'],
  ['#ec4899', '#f472b6'],
  ['#0ea5e9', '#38bdf8'],
  ['#10b981', '#34d399'],
  ['#f59e0b', '#fbbf24'],
  ['#ef4444', '#f87171'],
  ['#8b5cf6', '#c4b5fd'],
];

export function avatarGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}
