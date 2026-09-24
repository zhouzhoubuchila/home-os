import { BaseCard, EntityCardHeader, EntityCardHeaderIcon } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import {
  getTechMonitorSurface,
  TECH_MONITOR_KEYFRAMES,
  TECH_MONITOR_PALETTE,
} from '@navet/app/components/shared/theme/lunar-series-tech-monitor';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Activity, ArrowDown, ArrowUp, Gauge, Network, Radio, Router } from 'lucide-react';
import { useMemo } from 'react';
import type { ResolvedHomeOsFunctionalDevice } from '../../adapters/functional-device-adapter';
import { HOME_OS_ROLES } from '../../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../../core/types';
import {
  functionalDeviceMetricRows,
  ROUTER_METRIC_ORDER,
  resolveFunctionalOnlineState,
  resolveInternetOnlineState,
} from '../../resolution/final-home-os-resolution';

export type NetworkCardKind = 'router' | 'internet';

type NetworkMetricKey =
  | 'online'
  | 'clients'
  | 'wan_ip'
  | 'lan_ip'
  | 'cpu'
  | 'memory'
  | 'temperature'
  | 'uptime'
  | 'upload'
  | 'download'
  | 'latency'
  | 'packet_loss'
  | 'jitter';

interface NetworkMetric {
  key: NetworkMetricKey;
  entity: ResolvedSemanticEntity;
}

const ROUTER_ROLES: Partial<Record<NetworkMetricKey, string>> = {
  online: HOME_OS_ROLES.networkRouterOnline,
  uptime: HOME_OS_ROLES.networkRouterUptime,
  clients: HOME_OS_ROLES.networkRouterClients,
  cpu: HOME_OS_ROLES.networkRouterCpu,
  memory: HOME_OS_ROLES.networkRouterMemory,
  upload: HOME_OS_ROLES.networkRouterUpload,
  download: HOME_OS_ROLES.networkRouterDownload,
  wan_ip: HOME_OS_ROLES.networkRouterWanIpv4,
  lan_ip: HOME_OS_ROLES.networkRouterLanIpv4,
};

const INTERNET_ROLES: Partial<Record<NetworkMetricKey, string>> = {
  online: HOME_OS_ROLES.networkInternetOnline,
  latency: HOME_OS_ROLES.networkInternetLatency,
  packet_loss: HOME_OS_ROLES.networkInternetPacketLoss,
  jitter: HOME_OS_ROLES.networkInternetJitter,
  upload: HOME_OS_ROLES.networkInternetUpload,
  download: HOME_OS_ROLES.networkInternetDownload,
};

const SIZE_KIND = (size: CardSize) => {
  if (size === 'tiny') return 'tiny';
  if (size === 'extra-small') return 'extra-small';
  if (size === 'small') return 'small';
  return 'large';
};

const isDefined = <T,>(value: T | undefined): value is T => value !== undefined;

const LABELS: Record<NetworkMetricKey, [string, string]> = {
  online: ['Online', '在线状态'],
  clients: ['Devices', '设备数'],
  wan_ip: ['WAN IP', 'WAN IP'],
  lan_ip: ['LAN IP', 'LAN IP'],
  cpu: ['CPU', 'CPU'],
  memory: ['Memory', '内存'],
  temperature: ['Temperature', '温度'],
  uptime: ['Uptime', '运行时间'],
  upload: ['Upload', '上传'],
  download: ['Download', '下载'],
  latency: ['Ping', '延迟'],
  packet_loss: ['Loss', '丢包'],
  jitter: ['Jitter', '抖动'],
};

function metricLabel(key: NetworkMetricKey, entity: ResolvedSemanticEntity, language: string) {
  const pair = LABELS[key];
  const raw = [
    entity.displayName,
    entity.entity.externalId,
    entity.entity.attributes.device_class,
    entity.entity.attributes.deviceClass,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  const aggregate = /total|cumulative|累计|总量/.test(raw);
  if (aggregate && (key === 'download' || key === 'upload')) {
    return language === 'zh' ? `${pair[1]}累计` : `${pair[0]} total`;
  }
  return language === 'zh' ? pair[1] : pair[0];
}

function entityValue(entity: ResolvedSemanticEntity) {
  const value = entity.entity.availability === 'available' ? entity.entity.primaryState : '—';
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return `${value ?? '—'}${typeof unit === 'string' && unit ? ` ${unit}` : ''}`;
}

function resolveNetworkMetrics(
  kind: NetworkCardKind,
  device: ResolvedHomeOsFunctionalDevice | undefined,
  entities: readonly ResolvedSemanticEntity[]
) {
  const roles = kind === 'router' ? ROUTER_ROLES : INTERNET_ROLES;
  if (device) {
    const order =
      kind === 'router'
        ? ROUTER_METRIC_ORDER
        : (['online', 'latency', 'packet_loss', 'jitter', 'download', 'upload'] as const);
    return functionalDeviceMetricRows(device, order).map(({ key, entity }) => ({
      key: key as NetworkMetricKey,
      entity,
    }));
  }
  return (Object.entries(roles) as Array<[NetworkMetricKey, string | undefined]>).flatMap(
    ([key, role]) => {
      const entity = role ? entities.find((item) => item.roles.includes(role)) : undefined;
      return entity ? [{ key, entity }] : [];
    }
  );
}

function onlineState(
  kind: NetworkCardKind,
  device: ResolvedHomeOsFunctionalDevice | undefined,
  metrics: readonly NetworkMetric[]
) {
  if (device) return resolveFunctionalOnlineState(device);
  const source = metrics.find(({ key }) => key === 'online')?.entity;
  if (kind === 'internet') {
    return resolveInternetOnlineState(source, metrics.find(({ key }) => key === 'latency')?.entity);
  }
  if (!source || source.entity.availability === 'unknown') return 'unknown' as const;
  if (source.entity.availability === 'unavailable') return 'offline' as const;
  const state = String(source.entity.primaryState ?? '').toLowerCase();
  if (['on', 'online', 'available', 'true', 'connected', 'home'].includes(state))
    return 'online' as const;
  if (['off', 'offline', 'false', 'unavailable', 'disconnected'].includes(state))
    return 'offline' as const;
  return 'unknown' as const;
}

function NetworkAtmosphere({
  size,
  effectsQuality,
}: {
  size: CardSize;
  effectsQuality: 'high' | 'medium' | 'low';
}) {
  if (size === 'tiny' || size === 'extra-small') return null;
  const canAnimate = effectsQuality === 'high';
  return (
    <>
      <style data-tech-monitor-network-style>{TECH_MONITOR_KEYFRAMES}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        data-tech-monitor-atmosphere="network"
        data-tech-monitor-atmosphere-motion={canAnimate ? 'enabled' : 'static'}
      >
        <div
          className={`${canAnimate ? 'navet-tech-monitor-drift' : ''} absolute -inset-[20%] opacity-50 blur-2xl`}
          style={{
            background: `radial-gradient(ellipse at 10% 24%, ${TECH_MONITOR_PALETTE.glowCyan}, transparent 48%), radial-gradient(ellipse at 86% 78%, ${TECH_MONITOR_PALETTE.glowViolet}, transparent 46%)`,
            animation: canAnimate ? 'navet-tech-monitor-drift 34s ease-in-out infinite' : undefined,
          }}
        />
        <div
          className={`${canAnimate ? 'navet-tech-monitor-flow' : ''} absolute left-0 right-0 top-[38%] h-16 opacity-30`}
          style={{
            background: `repeating-linear-gradient(100deg, transparent 0 18px, ${TECH_MONITOR_PALETTE.cyan} 19px 20px, transparent 21px 54px)`,
            maskImage: 'linear-gradient(90deg, transparent, black 18%, black 82%, transparent)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent, black 18%, black 82%, transparent)',
            animation: canAnimate ? 'navet-tech-monitor-flow 16s ease-in-out infinite' : undefined,
          }}
        />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 500 180"
          preserveAspectRatio="none"
        >
          <path
            d="M-10 128 C 90 80, 150 160, 245 103 S 400 38, 510 75"
            fill="none"
            stroke={TECH_MONITOR_PALETTE.blue}
            strokeOpacity=".55"
            strokeWidth=".7"
          />
          <path
            d="M-10 148 C 92 124, 176 164, 270 128 S 402 92, 510 112"
            fill="none"
            stroke={TECH_MONITOR_PALETTE.violet}
            strokeOpacity=".35"
            strokeWidth=".6"
          />
          <circle cx="245" cy="103" r="2" fill={TECH_MONITOR_PALETTE.cyan} fillOpacity=".7" />
          <circle cx="400" cy="38" r="1.5" fill={TECH_MONITOR_PALETTE.violet} fillOpacity=".6" />
        </svg>
      </div>
    </>
  );
}

function StatusBadge({ state }: { state: 'online' | 'offline' | 'unknown' }) {
  const online = state === 'online';
  const critical = state === 'offline';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.15em] ${online ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100' : critical ? 'border-red-300/25 bg-red-300/10 text-red-100' : 'border-white/12 bg-white/6 text-white/60'}`}
      data-tech-monitor-status={state}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : critical ? 'bg-red-300' : 'bg-white/35'}`}
      />
      {online ? 'Online' : critical ? 'Offline' : 'Unknown'}
    </span>
  );
}

function NetworkMetricCell({ metric, language }: { metric: NetworkMetric; language: string }) {
  const Icon = metric.key === 'download' ? ArrowDown : metric.key === 'upload' ? ArrowUp : Activity;
  return (
    <div
      className="min-w-0 border-t border-white/10 bg-white/[0.025] px-2.5 py-2"
      data-tech-monitor-metric={metric.key}
    >
      <div className="flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-blue-100/48">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-cyan-200/70" />
        <span className="truncate">{metricLabel(metric.key, metric.entity, language)}</span>
      </div>
      <strong className="mt-1 block truncate text-sm font-medium tabular-nums text-blue-50/90">
        {entityValue(metric.entity)}
      </strong>
    </div>
  );
}

export function NetworkHomeOsCard({
  size,
  kind,
  device,
  entities = [],
  title,
}: {
  size: CardSize;
  kind: NetworkCardKind;
  device?: ResolvedHomeOsFunctionalDevice;
  entities?: readonly ResolvedSemanticEntity[];
  title?: string;
}) {
  const { language } = useI18n();
  const { theme } = useTheme();
  const effectsQuality = useEffectiveEffectsQuality();
  const surface = getTechMonitorSurface(theme);
  const metrics = useMemo(
    () => resolveNetworkMetrics(kind, device, entities),
    [device, entities, kind]
  );
  const state = onlineState(kind, device, metrics);
  const sizeKind = SIZE_KIND(size);
  const download = metrics.find(({ key }) => key === 'download');
  const upload = metrics.find(({ key }) => key === 'upload');
  const latency = metrics.find(({ key }) => key === 'latency');
  const clients = metrics.find(({ key }) => key === 'clients');
  const primaryMetrics = [download, upload].filter(isDefined);
  const secondaryMetrics = metrics.filter(
    ({ key }) => key !== 'download' && key !== 'upload' && key !== 'latency'
  );
  const compactMetrics =
    sizeKind === 'tiny'
      ? [latency ?? metrics.find(({ key }) => key === 'online')]
      : sizeKind === 'extra-small'
        ? primaryMetrics
        : sizeKind === 'small'
          ? [clients]
          : [
              clients,
              ...secondaryMetrics.filter(({ key }) =>
                ['packet_loss', 'jitter', 'wan_ip', 'lan_ip'].includes(key)
              ),
            ];
  const shownMetrics = compactMetrics.filter(isDefined);
  const displayTitle = title ?? device?.name ?? (kind === 'router' ? 'Network' : 'Internet');
  const subtitle = kind === 'router' ? 'NETWORK / ROUTER' : 'NETWORK / WAN';

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
      <NetworkAtmosphere size={size} effectsQuality={effectsQuality} />
      <div
        className="relative z-10 flex h-full min-w-0 flex-col p-3 text-white"
        data-tech-monitor="network"
      >
        <EntityCardHeader
          title={displayTitle}
          subtitle={subtitle}
          layout="eyebrow-first"
          size={size}
          titleClassName="text-white"
          subtitleClassName="text-blue-100/52"
          titleStyle={{ color: TECH_MONITOR_PALETTE.textPrimary }}
          subtitleStyle={{ color: TECH_MONITOR_PALETTE.textSecondary }}
          leading={
            <EntityCardHeaderIcon
              IconComponent={kind === 'router' ? Router : Network}
              isActive={state === 'online'}
              size={size}
              baseColor={TECH_MONITOR_PALETTE.cyan}
              glyphClassName="text-cyan-100"
            />
          }
          trailing={<StatusBadge state={state} />}
        />

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          {sizeKind === 'tiny' ? (
            <div className="flex min-w-0 items-end justify-between gap-2">
              <div>
                <div className="text-[0.62rem] uppercase tracking-[0.16em] text-blue-100/46">
                  {latency ? metricLabel('latency', latency.entity, language) : 'Status'}
                </div>
                <strong
                  className="mt-1 block truncate text-2xl font-semibold tabular-nums text-cyan-100"
                  data-tech-monitor-primary="network"
                >
                  {latency
                    ? entityValue(latency.entity)
                    : state === 'online'
                      ? 'Online'
                      : state === 'offline'
                        ? 'Offline'
                        : '—'}
                </strong>
              </div>
              <Radio className="h-6 w-6 text-cyan-200/65" />
            </div>
          ) : (
            <>
              {primaryMetrics.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {primaryMetrics.map((metric) => (
                    <div key={metric.key} data-tech-monitor-primary={metric.key}>
                      <div className="flex items-center gap-1.5 text-[0.63rem] uppercase tracking-[0.16em] text-blue-100/50">
                        {metric.key === 'download' ? (
                          <ArrowDown className="h-3.5 w-3.5 text-cyan-200/75" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5 text-violet-200/75" />
                        )}
                        {metricLabel(metric.key, metric.entity, language)}
                      </div>
                      <strong className="mt-1 block truncate text-2xl font-semibold leading-none tracking-[-0.03em] tabular-nums text-blue-50">
                        {entityValue(metric.entity)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : null}
              {latency ? (
                <div
                  className="flex items-center gap-2 text-xs text-blue-100/62"
                  data-tech-monitor-latency="true"
                >
                  <Gauge className="h-3.5 w-3.5 text-cyan-200/75" />
                  <span>{metricLabel('latency', latency.entity, language)}</span>
                  <strong className="tabular-nums text-blue-50/90">
                    {entityValue(latency.entity)}
                  </strong>
                  <span className="ml-auto font-mono text-cyan-200/45">·━━╱━━╲━━</span>
                </div>
              ) : null}
              {sizeKind !== 'extra-small' && shownMetrics.length ? (
                <div className="grid min-h-0 grid-cols-2 gap-x-2 gap-y-1">
                  {shownMetrics.map((metric) => (
                    <NetworkMetricCell
                      key={`${metric.key}-${metric.entity.entity.externalId}`}
                      metric={metric}
                      language={language}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </BaseCard>
  );
}
