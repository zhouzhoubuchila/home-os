import type { ThemeType } from '@navet/app/hooks/use-theme';

/** Shared visual anchors for system and connectivity monitoring cards. */
export const TECH_MONITOR_PALETTE = {
  background: ['#030610', '#050816', '#080d21', '#0d1630', '#111b3d'],
  cyan: '#22d3ee',
  sky: '#38bdf8',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  magenta: '#d946ef',
  textPrimary: 'rgba(245,248,255,0.96)',
  textSecondary: 'rgba(220,232,250,0.68)',
  textTertiary: 'rgba(190,205,230,0.42)',
  border: 'rgba(120,190,255,0.10)',
  borderStrong: 'rgba(120,190,255,0.18)',
  surface: 'rgba(255,255,255,0.035)',
  surfaceStrong: 'rgba(255,255,255,0.055)',
  glowCyan: 'rgba(34,211,238,0.16)',
  glowBlue: 'rgba(59,130,246,0.14)',
  glowViolet: 'rgba(139,92,246,0.13)',
} as const;

export const TECH_MONITOR_KEYFRAMES = `
@keyframes navet-tech-monitor-drift {
  0%, 100% { transform: translate3d(-1.5%, 0, 0) scale(1.02); }
  50% { transform: translate3d(2%, -1%, 0) scale(1.05); }
}
@keyframes navet-tech-monitor-flow {
  0% { transform: translate3d(-8%, 0, 0); opacity: .10; }
  50% { opacity: .22; }
  100% { transform: translate3d(8%, 0, 0); opacity: .10; }
}
@keyframes navet-tech-monitor-pulse {
  0%, 100% { opacity: .12; }
  50% { opacity: .24; }
}
@media (prefers-reduced-motion: reduce) {
  .navet-tech-monitor-drift,
  .navet-tech-monitor-flow,
  .navet-tech-monitor-pulse { animation: none !important; }
}
`;

export function getTechMonitorSurface(theme: ThemeType) {
  if (theme === 'black') {
    return {
      background: `linear-gradient(135deg, ${TECH_MONITOR_PALETTE.background[0]} 0%, ${TECH_MONITOR_PALETTE.background[1]} 56%, #0a1230 100%)`,
      border: 'rgba(120,190,255,0.12)',
      shadow: '0 28px 68px -42px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.05)',
    };
  }

  if (theme === 'light') {
    return {
      background: `linear-gradient(135deg, ${TECH_MONITOR_PALETTE.background[1]} 0%, #0d1d3b 54%, #172d58 100%)`,
      border: 'rgba(71,150,235,0.28)',
      shadow: '0 24px 56px -34px rgba(30,64,175,0.40), inset 0 1px 0 rgba(255,255,255,0.08)',
    };
  }

  return {
    background: `linear-gradient(135deg, ${TECH_MONITOR_PALETTE.background[0]} 0%, ${TECH_MONITOR_PALETTE.background[2]} 52%, ${TECH_MONITOR_PALETTE.background[4]} 100%)`,
    border: TECH_MONITOR_PALETTE.borderStrong,
    shadow: '0 26px 62px -38px rgba(2,8,20,0.76), inset 0 1px 0 rgba(255,255,255,0.07)',
  };
}
