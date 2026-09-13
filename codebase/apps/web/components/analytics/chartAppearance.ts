/** Secondary chart chrome: 70% foreground instead of muted-foreground. */
export const CHART_AXIS_COLOR =
  'color-mix(in oklch, var(--foreground) 70%, transparent)';

export const CHART_TICK = { fontSize: 11, fill: CHART_AXIS_COLOR };

export const CHART_LEGEND_STYLE = { fontSize: 11, color: CHART_AXIS_COLOR };
