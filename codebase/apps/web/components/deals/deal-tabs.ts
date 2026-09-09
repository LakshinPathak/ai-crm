export type DealTabId =
  | 'overview'
  | 'plan'
  | 'activity'
  | 'events'
  | 'participants'
  | 'product-requests'
  | 'team-requests'
  | 'insights'
  | 'notes'
  | 'tasks'
  | 'projects'
  | 'file-center';

export const DEAL_TABS: { id: DealTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'activity', label: 'Activity' },
  { id: 'events', label: 'Events' },
  { id: 'participants', label: 'Participants' },
  { id: 'product-requests', label: 'Product Requests' },
  { id: 'team-requests', label: 'Team Requests' },
  { id: 'insights', label: 'Insights' },
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'projects', label: 'Projects' },
  { id: 'file-center', label: 'File Center' },
];

export function isDealTabId(value: string | null | undefined): value is DealTabId {
  return DEAL_TABS.some((t) => t.id === value);
}

export const DEFAULT_DEAL_TAB: DealTabId = 'overview';
