import { BaseCard, EntityCardHeader, EntityCardHeaderIcon } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import {
  getTechMonitorSurface,
  TECH_MONITOR_PALETTE,
} from '@navet/app/components/shared/theme/lunar-series-tech-monitor';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { HassConfig } from 'home-assistant-js-websocket';
import { House, Radio } from 'lucide-react';
import { HOME_OS_ROLES } from '../../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../../core/types';
import {
  formatHomeAssistantUptime,
  selectHomeAssistantHostTelemetry,
} from '../../resolution/home-assistant-host-telemetry';

type HostMetricKey = 'cpu' | 'memory' | 'storage' | 'uptime' | 'version';
type SizeKind = 'tiny' | 'extra-small' | 'small' | 'medium' | 'large';

const roleByMetric: Record<HostMetricKey, string> = {
  cpu: HOME_OS_ROLES.homelabHomeAssistantCpu,
  memory: HOME_OS_ROLES.homelabHomeAssistantMemory,
  storage: HOME_OS_ROLES.homelabHomeAssistantStorage,
  uptime: HOME_OS_ROLES.homelabHomeAssistantUptime,
  version: HOME_OS_ROLES.homelabHomeAssistantVersion,
};

const labels: Record<HostMetricKey, string> = {
  cpu: 'CPU',
  memory: 'MEMORY',
  storage: 'STORAGE',
  uptime: 'UPTIME',
  version: 'VERSION',
};

function sizeKind(size: CardSize): SizeKind {
  if (size === 'tiny') return 'tiny';
  if (size === 'extra-small') return 'extra-small';
  if (size === 'small') return 'small';
  if (size === 'medium' || size === 'medium-vertical') return 'medium';
  return 'large';
}

function metricValue(entity: ResolvedSemanticEntity, key: HostMetricKey, language: string) {
  if (key === 'uptime') return formatHomeAssistantUptime(entity, language);
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return `${entity.entity.primaryState}${typeof unit === 'string' && unit ? ` ${unit}` : ''}`;
}

function resolveStatus(
  online: ResolvedSemanticEntity | undefined,
  connected: boolean | undefined,
  config: Pick<HassConfig, 'version' | 'state'> | null | undefined
) {
  if (connected === false) return 'offline' as const;
  if (config && connected) {
    if (config.state === 'RUNNING') return 'online' as const;
    if (config.state === 'NOT_RUNNING' || config.state === 'STOPPING') return 'offline' as const;
    return 'unknown' as const;
  }
  if (online?.entity.availability !== 'available') return 'unknown' as const;
  const value = String(online.entity.primaryState).toLowerCase();
  if (['on', 'online', 'running', 'connected', 'true'].includes(value)) return 'online' as const;
  if (['off', 'offline', 'stopped', 'disconnected', 'false'].includes(value))
    return 'offline' as const;
  return 'unknown' as const;
}

function HostAtmosphere({ animated }: { animated: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      data-home-assistant-atmosphere="core"
      data-home-assistant-atmosphere-motion={animated ? 'enabled' : 'static'}
      aria-hidden="true"
    >
      <style>{`@keyframes ha-core-pulse { 50% { opacity: .7; transform: scale(1.04); } } @keyframes ha-event-flow { 50% { opacity: .35; } } @media (prefers-reduced-motion: reduce) { [data-home-assistant-atmosphere] * { animation: none !important; } }`}</style>
      <div
        className="absolute -right-10 -top-16 h-52 w-52 rounded-full opacity-45 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,.22), transparent 68%)',
          animation: animated ? 'ha-core-pulse 12s ease-in-out infinite' : undefined,
        }}
      />
      <svg
        aria-hidden="true"
        className="absolute right-1 top-6 h-[75%] w-[55%] opacity-25"
        viewBox="0 0 220 120"
        fill="none"
      >
        <path
          d="M25 78 92 34 175 60M92 34l42 72M134 106l41-46"
          stroke="#38bdf8"
          strokeWidth=".7"
          strokeOpacity=".42"
          style={{ animation: animated ? 'ha-event-flow 20s ease-in-out infinite' : undefined }}
        />
        <circle cx="92" cy="34" r="2" fill="#22d3ee" fillOpacity=".5" />
        <circle cx="175" cy="60" r="2" fill="#818cf8" fillOpacity=".45" />
        <circle cx="134" cy="106" r="1.5" fill="#38bdf8" fillOpacity=".4" />
      </svg>
    </div>
  );
}

function HostMetric({
  metric,
  compact = false,
}: {
  metric: { key: HostMetricKey; value: string };
  compact?: boolean;
}) {
  return (
    <div className="min-w-0" data-home-assistant-metric={metric.key}>
      <span className="block text-[0.6rem] uppercase tracking-[0.14em] text-blue-100/48">
        {labels[metric.key]}
      </span>
      <strong
        className={`block truncate tabular-nums text-blue-50 ${compact ? 'text-xs font-medium' : 'text-lg font-semibold'}`}
      >
        {metric.value}
      </strong>
      {!compact && metric.key !== 'version' ? (
        <div className="mt-1 h-px bg-gradient-to-r from-cyan-300/50 via-blue-400/20 to-transparent" />
      ) : null}
    </div>
  );
}

export function HomeAssistantHomeOsCard({
  size,
  entities,
  config,
  connected,
  title = 'Home Assistant',
}: {
  size: CardSize;
  entities: readonly ResolvedSemanticEntity[];
  config?: Pick<HassConfig, 'version' | 'state'> | null;
  connected?: boolean;
  title?: string;
}) {
  const { theme } = useTheme();
  const { language } = useI18n();
  const effectsQuality = useEffectiveEffectsQuality();
  const disableAnimations = useSettingsStore((state) => state.disableAnimations);
  const lowPowerMode = useSettingsStore((state) => state.lowPowerMode);
  const kind = sizeKind(size);
  const surface = getTechMonitorSurface(theme);
  const selected = selectHomeAssistantHostTelemetry(entities);
  const active =
    connected === false
      ? []
      : selected.filter((entity) => !entity.ignored && entity.entity.availability === 'available');
  const online = entities.find((entity) =>
    entity.roles.includes(HOME_OS_ROLES.homelabHomeAssistantOnline)
  );
  const status = resolveStatus(online, connected, config);
  const metrics = (Object.keys(roleByMetric) as HostMetricKey[]).flatMap((key) => {
    const entity = active.find((item) => item.roles.includes(roleByMetric[key]));
    if (entity && entity.entity.primaryState !== null)
      return [{ key, value: metricValue(entity, key, language) }];
    if (key === 'version' && connected && config?.version) return [{ key, value: config.version }];
    return [];
  });
  const byKey = (key: HostMetricKey) => metrics.find((metric) => metric.key === key);
  const telemetry = metrics.filter((metric) => metric.key !== 'version');
  const prominent =
    kind === 'extra-small'
      ? [byKey('cpu') ?? byKey('version')].filter((metric) => metric !== undefined)
      : kind === 'small'
        ? [byKey('cpu'), byKey('memory')].filter((metric) => metric !== undefined).length
          ? [byKey('cpu'), byKey('memory')].filter((metric) => metric !== undefined)
          : [byKey('version'), byKey('uptime'), byKey('storage')]
              .filter((metric) => metric !== undefined)
              .slice(0, 2)
        : kind === 'medium'
          ? [byKey('cpu'), byKey('memory')].filter((metric) => metric !== undefined).length
            ? [byKey('cpu'), byKey('memory')].filter((metric) => metric !== undefined)
            : telemetry.slice(0, 2)
          : telemetry;
  const secondary =
    kind === 'medium' ? telemetry.filter((metric) => !prominent.includes(metric)).slice(0, 2) : [];
  const version = byKey('version');
  const animated = effectsQuality === 'high' && !disableAnimations && !lowPowerMode;

  return (
    <BaseCard
      size={size}
      fullBleed
      frameClassName="overflow-hidden"
      contentClassName="h-full"
      style={{
        background: surface.background,
        borderColor: surface.border,
        boxShadow: surface.shadow,
      }}
      readableBackgroundColor={TECH_MONITOR_PALETTE.background[1]}
    >
      {kind !== 'tiny' && kind !== 'extra-small' ? <HostAtmosphere animated={animated} /> : null}
      <div
        className="relative z-10 flex h-full min-w-0 flex-col p-3 text-white"
        data-tech-monitor="home-assistant"
        data-home-assistant-size-kind={kind}
      >
        {kind === 'tiny' ? (
          <div className="flex flex-col items-start gap-1" data-home-assistant-tiny="true">
            <House className="h-4 w-4 text-cyan-200" aria-hidden="true" />
            <span
              className={`text-[0.58rem] font-semibold tracking-[0.08em] ${status === 'online' ? 'text-emerald-200' : status === 'offline' ? 'text-red-200' : 'text-blue-100/60'}`}
              data-home-assistant-core-status={status}
            >
              {status.toUpperCase()}
            </span>
          </div>
        ) : kind === 'extra-small' ? (
          <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-blue-50">
            <House className="h-3.5 w-3.5 shrink-0 text-cyan-200" aria-hidden="true" />
            <span className="truncate">Home Assistant</span>
            <span
              className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${status === 'online' ? 'bg-emerald-300' : status === 'offline' ? 'bg-red-300' : 'bg-white/40'}`}
              data-home-assistant-core-status={status}
            />
          </div>
        ) : (
          <EntityCardHeader
            title={kind === 'small' ? 'HA Core' : title}
            subtitle={kind === 'small' ? 'HOME ASSISTANT' : 'HOME ASSISTANT / CORE'}
            size={size}
            layout="eyebrow-first"
            titleClassName="text-white"
            subtitleClassName="text-blue-100/52"
            leading={
              <EntityCardHeaderIcon
                IconComponent={House}
                isActive={status === 'online'}
                size={size}
                baseColor={TECH_MONITOR_PALETTE.cyan}
                glyphClassName="text-cyan-100"
              />
            }
            trailing={
              <span
                className={`rounded-full border px-2 py-1 text-[0.6rem] font-semibold tracking-[0.12em] ${status === 'online' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : status === 'offline' ? 'border-red-300/25 bg-red-300/10 text-red-100' : 'border-white/12 bg-white/6 text-white/65'}`}
                data-home-assistant-core-status={status}
              >
                {status.toUpperCase()}
              </span>
            }
          />
        )}
        {kind === 'extra-small' ? (
          <div className="mt-auto flex items-center gap-1.5 text-xs text-blue-50">
            <span className="text-[0.58rem] font-medium text-blue-100/55">
              {status.toUpperCase()}
            </span>
            {prominent[0] ? (
              <span
                className="ml-auto truncate font-semibold tabular-nums"
                data-home-assistant-metric={prominent[0].key}
              >
                {prominent[0].value}
              </span>
            ) : null}
          </div>
        ) : kind !== 'tiny' ? (
          <div
            className={`flex min-h-0 flex-1 flex-col ${kind === 'medium' ? 'gap-1 pt-0.5' : kind === 'large' ? 'gap-4 pt-3' : 'gap-2 pt-1'}`}
          >
            <div className="flex items-center gap-2" data-home-assistant-runtime="core">
              <span
                className={`relative grid shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200 ${kind === 'medium' ? 'h-6 w-6' : 'h-7 w-7'}`}
              >
                <Radio className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <span className="block text-[0.56rem] uppercase tracking-[0.18em] text-blue-100/45">
                  CORE RUNTIME
                </span>
                <strong className="block text-sm font-semibold leading-4 text-blue-50">
                  {status === 'online' ? 'Running' : status === 'offline' ? 'Offline' : 'Unknown'}
                </strong>
              </div>
              {kind === 'medium' && secondary.length > 0 && version ? (
                <div className="ml-auto min-w-0 text-right" data-home-assistant-metric="version">
                  <span className="block text-[0.56rem] tracking-[0.1em] text-blue-100/48">
                    VERSION
                  </span>
                  <strong className="block truncate text-xs font-medium text-blue-50">
                    {version.value}
                  </strong>
                </div>
              ) : null}
            </div>
            {prominent.length ? (
              <div
                className={`grid gap-3 ${prominent.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${kind === 'large' ? 'mt-2' : ''}`}
              >
                {prominent.map((metric) => (
                  <HostMetric key={metric.key} metric={metric} />
                ))}
              </div>
            ) : null}
            {secondary.length ? (
              <div
                className="grid grid-cols-2 gap-2 border-t border-white/10 pt-1"
                data-home-assistant-secondary="true"
              >
                {secondary.map((metric) => (
                  <div
                    key={metric.key}
                    className="flex min-w-0 items-baseline gap-1.5"
                    data-home-assistant-metric={metric.key}
                  >
                    <span className="shrink-0 text-[0.56rem] tracking-[0.1em] text-blue-100/48">
                      {labels[metric.key]}
                    </span>
                    <strong className="truncate text-xs font-medium tabular-nums text-blue-50">
                      {metric.value}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}
            {version &&
            (kind === 'large' || (kind === 'medium' && secondary.length === 0)) &&
            !prominent.some((metric) => metric.key === 'version') ? (
              <div
                className={`mt-auto border-t border-white/10 ${kind === 'medium' ? 'flex items-center gap-2 pt-0.5' : 'pt-1'}`}
                data-home-assistant-footer="version"
                data-home-assistant-metric={kind === 'medium' ? 'version' : undefined}
              >
                {kind === 'medium' ? (
                  <>
                    <span className="text-[0.6rem] tracking-[0.12em] text-blue-100/48">
                      VERSION
                    </span>
                    <strong className="truncate text-xs font-medium text-blue-50">
                      {version.value}
                    </strong>
                  </>
                ) : (
                  <HostMetric metric={version} compact />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </BaseCard>
  );
}
