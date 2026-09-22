import {
  CardDialogSection,
  CardEmptyState,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  BaseCard,
  BaseCardDialogWithState,
  EntityCardHeader,
  EntityCardHeaderIcon,
  Select,
} from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import { LUNAR_SERIES_PALETTE } from '@navet/app/components/shared/theme/lunar-weather-card-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@navet/app/hooks';
import {
  Activity,
  Clock3,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Server,
  Settings2,
  Thermometer,
} from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import type { HomeOsMetric, HomeOsPhysicalDevice } from '../../core/types';

export interface PveHomeOsCardData {
  pveDeviceId?: string;
  pveMetricRoles?: string[];
  tintColor?: string;
}

type PveVisualSize = 'tiny' | 'extra-small' | 'small' | 'medium' | 'large';

function resolveVisualSize(size: CardSize): PveVisualSize {
  if (size === 'tiny') return 'tiny';
  if (size === 'extra-small') return 'extra-small';
  if (size === 'small') return 'small';
  if (size === 'large' || size === 'extra-large' || size === 'extra-wide') return 'large';
  return 'medium';
}

function metricLimit(size: PveVisualSize) {
  if (size === 'tiny') return 1;
  if (size === 'extra-small') return 2;
  if (size === 'small') return 2;
  if (size === 'medium') return 5;
  return 6;
}

interface PveVisualTheme {
  background: string;
  border: string;
  readableBackground: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  titleColor: string;
  subtitleColor: string;
  accent: string;
  accentStrong: string;
  surface: string;
  surfaceBorder: string;
  track: string;
  shadow: string;
}

function getPveVisualTheme(theme: string): PveVisualTheme {
  if (theme === 'light') {
    return {
      background: `linear-gradient(135deg, ${LUNAR_SERIES_PALETTE.background[0]} 0%, #10254a 48%, #1b3764 100%)`,
      border: 'rgba(139,190,245,0.30)',
      readableBackground: '#10254a',
      textPrimary: 'text-white',
      textSecondary: 'text-blue-100/78',
      textMuted: 'text-blue-100/62',
      textTertiary: 'text-blue-100/44',
      titleColor: 'rgba(245,248,255,0.96)',
      subtitleColor: 'rgba(226,234,250,0.68)',
      accent: 'text-sky-200',
      accentStrong: 'text-cyan-100',
      surface: 'bg-white/[0.045]',
      surfaceBorder: 'border-white/10',
      track: 'bg-white/10',
      shadow: '0 24px 56px -34px rgba(30,64,175,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
    };
  }

  if (theme === 'glass') {
    return {
      background: `linear-gradient(135deg, rgba(5,8,22,0.88) 0%, rgba(13,22,48,0.86) 52%, rgba(38,58,120,0.72) 100%)`,
      border: 'rgba(190,211,255,0.20)',
      readableBackground: '#0d1630',
      textPrimary: 'text-white',
      textSecondary: 'text-blue-100/80',
      textMuted: 'text-blue-100/64',
      textTertiary: 'text-blue-100/44',
      titleColor: 'rgba(245,248,255,0.96)',
      subtitleColor: 'rgba(226,234,250,0.72)',
      accent: 'text-sky-200',
      accentStrong: 'text-cyan-100',
      surface: 'bg-white/[0.055]',
      surfaceBorder: 'border-white/12',
      track: 'bg-white/10',
      shadow: '0 26px 64px -38px rgba(2,8,20,0.72), inset 0 1px 0 rgba(255,255,255,0.12)',
    };
  }

  if (theme === 'black') {
    return {
      background: `linear-gradient(135deg, #01030a 0%, ${LUNAR_SERIES_PALETTE.background[0]} 52%, #0b1531 100%)`,
      border: 'rgba(190,211,255,0.13)',
      readableBackground: '#050816',
      textPrimary: 'text-white',
      textSecondary: 'text-blue-100/74',
      textMuted: 'text-blue-100/58',
      textTertiary: 'text-blue-100/38',
      titleColor: 'rgba(245,248,255,0.96)',
      subtitleColor: 'rgba(226,234,250,0.64)',
      accent: 'text-sky-200',
      accentStrong: 'text-cyan-100',
      surface: 'bg-white/[0.035]',
      surfaceBorder: 'border-white/10',
      track: 'bg-white/8',
      shadow: '0 28px 68px -42px rgba(0,0,0,0.86), inset 0 1px 0 rgba(255,255,255,0.05)',
    };
  }

  return {
    background: `linear-gradient(135deg, ${LUNAR_SERIES_PALETTE.background[0]} 0%, ${LUNAR_SERIES_PALETTE.background[1]} 50%, ${LUNAR_SERIES_PALETTE.background[3]} 100%)`,
    border: LUNAR_SERIES_PALETTE.borderStrong,
    readableBackground: LUNAR_SERIES_PALETTE.background[1],
    textPrimary: 'text-white',
    textSecondary: 'text-blue-100/78',
    textMuted: 'text-blue-100/62',
    textTertiary: 'text-blue-100/42',
    titleColor: 'rgba(245,248,255,0.96)',
    subtitleColor: 'rgba(226,234,250,0.68)',
    accent: 'text-sky-200',
    accentStrong: 'text-cyan-100',
    surface: 'bg-white/[0.045]',
    surfaceBorder: 'border-white/10',
    track: 'bg-white/10',
    shadow: '0 26px 62px -38px rgba(2,8,20,0.72), inset 0 1px 0 rgba(255,255,255,0.07)',
  };
}

const PVE_SYSTEM_KEYFRAMES = `
@keyframes navet-pve-system-drift {
  0%, 100% { transform: translate3d(-1.5%, 0, 0) scale(1.02); }
  50% { transform: translate3d(2%, -1%, 0) scale(1.05); }
}
@keyframes navet-pve-system-pulse {
  0%, 100% { opacity: .16; transform: translate3d(-1%, 1%, 0); }
  50% { opacity: .27; transform: translate3d(1.5%, -1%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .navet-pve-system-drift,
  .navet-pve-system-pulse { animation: none !important; }
}
`;

function PveSystemAtmosphere({
  size,
  effectsQuality,
  theme,
}: {
  size: CardSize;
  effectsQuality: 'high' | 'medium' | 'low';
  theme: string;
}) {
  if (size === 'tiny' || size === 'extra-small') return null;
  const canAnimate = effectsQuality === 'high';
  const isLight = theme === 'light';
  const haze = isLight ? 'rgba(79,127,210,0.12)' : 'rgba(79,127,210,0.14)';
  const signal = isLight ? 'rgba(143,216,245,0.10)' : 'rgba(143,216,245,0.08)';
  const driftStyle = canAnimate
    ? ({ animation: 'navet-pve-system-drift 32s ease-in-out infinite' } as CSSProperties)
    : undefined;
  const pulseStyle = canAnimate
    ? ({ animation: 'navet-pve-system-pulse 18s ease-in-out infinite' } as CSSProperties)
    : undefined;

  return (
    <>
      <style data-home-os-pve-atmosphere-style>{PVE_SYSTEM_KEYFRAMES}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        data-home-os-pve-atmosphere="system"
        data-home-os-pve-atmosphere-motion={canAnimate ? 'enabled' : 'static'}
      >
        <div
          className={`${canAnimate ? 'navet-pve-system-drift' : ''} absolute -inset-[18%] rounded-[42%] blur-2xl`}
          style={{
            ...driftStyle,
            background: `radial-gradient(ellipse at 14% 22%, ${haze}, transparent 54%), radial-gradient(ellipse at 84% 72%, ${signal}, transparent 48%)`,
          }}
        />
        <div
          className={`${canAnimate ? 'navet-pve-system-pulse' : ''} absolute -inset-[12%] opacity-35`}
          style={{
            ...pulseStyle,
            background: `linear-gradient(118deg, transparent 18%, ${signal} 46%, transparent 73%)`,
            maskImage: 'linear-gradient(180deg, transparent, black 25%, black 72%, transparent)',
            WebkitMaskImage:
              'linear-gradient(180deg, transparent, black 25%, black 72%, transparent)',
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(rgba(143,216,245,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(143,216,245,0.06) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
            maskImage: 'linear-gradient(135deg, transparent 10%, black 52%, transparent 94%)',
            WebkitMaskImage: 'linear-gradient(135deg, transparent 10%, black 52%, transparent 94%)',
          }}
        />
      </div>
    </>
  );
}

function roleLabel(role: string, language: string) {
  const labels: Record<string, [string, string]> = {
    'homelab.pve.cpu_usage': ['CPU usage', 'CPU 使用率'],
    'homelab.pve.load': ['Load', '系统负载'],
    'homelab.pve.temperature': ['Temperature', '温度'],
    'homelab.pve.memory_usage': ['Memory', '内存'],
    'homelab.pve.storage_usage': ['Storage', '存储'],
    'homelab.pve.uptime': ['Uptime', '运行时间'],
    'homelab.pve.vm_running': ['Running VMs', '运行中的虚拟机'],
    'homelab.pve.lxc_running': ['Running containers', '运行中的容器'],
    'homelab.pve.version': ['Version', '版本'],
    'homelab.pve.kernel_version': ['Kernel', '内核'],
  };
  const label = labels[role];
  if (label) return language === 'zh' ? label[1] : label[0];
  return role.split('.').at(-1)?.replaceAll('_', ' ') ?? role;
}

function formatMetric(metric: HomeOsMetric) {
  const value = metric.available ? String(metric.value ?? '—') : '—';
  return metric.unit ? `${value} ${metric.unit}` : value;
}

const PVE_VISUAL_METRIC_PRIORITY = [
  'homelab.pve.temperature',
  'homelab.pve.memory_usage',
  'homelab.pve.storage_usage',
  'homelab.pve.load',
  'homelab.pve.io_wait',
  'homelab.pve.cpu_model',
  'homelab.pve.status',
  'homelab.pve.online',
  'homelab.pve.uptime',
];

function sortPveVisualMetrics(metrics: Array<{ role: string; metric: HomeOsMetric }>) {
  return [...metrics].sort((left, right) => {
    const leftPriority = PVE_VISUAL_METRIC_PRIORITY.indexOf(left.role);
    const rightPriority = PVE_VISUAL_METRIC_PRIORITY.indexOf(right.role);
    return (leftPriority < 0 ? 100 : leftPriority) - (rightPriority < 0 ? 100 : rightPriority);
  });
}

function statusClasses(device: HomeOsPhysicalDevice, theme: string) {
  if (device.state === 'online' && device.freshness === 'fresh') {
    return theme === 'light'
      ? 'border-emerald-700/25 bg-emerald-500/10 text-emerald-700'
      : 'border-emerald-300/22 bg-emerald-300/10 text-emerald-100';
  }
  if (device.state === 'offline' || device.health === 'critical') {
    return theme === 'light'
      ? 'border-red-700/25 bg-red-500/10 text-red-700'
      : 'border-red-300/22 bg-red-300/10 text-red-100';
  }
  if (device.freshness === 'stale' || device.health === 'warning') {
    return theme === 'light'
      ? 'border-amber-700/25 bg-amber-500/10 text-amber-700'
      : 'border-amber-300/22 bg-amber-300/10 text-amber-100';
  }
  return theme === 'light'
    ? 'border-slate-600/20 bg-slate-500/10 text-slate-700'
    : 'border-white/12 bg-white/6 text-white/68';
}

function metricPercent(metric: HomeOsMetric) {
  if (metric.unit !== '%' || !metric.available) return null;
  const value = Number(metric.value);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

function metricTone(role: string, metric: HomeOsMetric, palette: PveVisualTheme) {
  if (role === 'homelab.pve.temperature') {
    const value = Number(metric.value);
    if (Number.isFinite(value) && value >= 85) return 'text-red-300';
    if (Number.isFinite(value) && value >= 70) return 'text-amber-200';
  }
  return palette.textSecondary;
}

function MetricGlyph({ role }: { role: string }) {
  const Icon =
    role === 'homelab.pve.temperature'
      ? Thermometer
      : role === 'homelab.pve.memory_usage'
        ? MemoryStick
        : role === 'homelab.pve.storage_usage'
          ? HardDrive
          : role === 'homelab.pve.uptime'
            ? Clock3
            : role === 'homelab.pve.load'
              ? Activity
              : role === 'homelab.pve.cpu_usage'
                ? Cpu
                : Database;
  return <Icon aria-hidden="true" className="h-3.5 w-3.5" />;
}

function PveMetricCell({
  role,
  metric,
  language,
  palette,
}: {
  role: string;
  metric: HomeOsMetric;
  language: string;
  palette: PveVisualTheme;
}) {
  const percent = metricPercent(metric);
  return (
    <div
      className={`min-w-0 border-t ${palette.surfaceBorder} ${palette.surface} px-2.5 py-2`}
      data-home-os-pve-metric={role}
    >
      <div
        className={`flex items-center gap-1.5 text-[0.64rem] uppercase tracking-[0.13em] ${palette.textMuted}`}
      >
        <MetricGlyph role={role} />
        <span className="truncate">{roleLabel(role, language)}</span>
      </div>
      <div
        className={`mt-1 truncate text-base font-semibold tabular-nums ${metricTone(role, metric, palette)}`}
      >
        {formatMetric(metric)}
      </div>
      {percent !== null ? (
        <div className={`mt-1 h-1 overflow-hidden rounded-full ${palette.track}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4f7fd2] to-[#8fd8f5]"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function PveHomeOsCard({
  size,
  devices,
  data,
  onUpdate,
  isEditMode,
  openSettingsRequestKey = 0,
}: {
  size: CardSize;
  devices: HomeOsPhysicalDevice[];
  data?: PveHomeOsCardData;
  onUpdate?: (data: PveHomeOsCardData) => void;
  isEditMode: boolean;
  openSettingsRequestKey?: number;
}) {
  const { language, t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const effectsQuality = useEffectiveEffectsQuality();
  const palette = getPveVisualTheme(theme);
  const visualSize = resolveVisualSize(size);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedDevice =
    devices.find((device) => device.id === data?.pveDeviceId) ?? devices[0] ?? null;
  const allMetrics = useMemo(
    () =>
      selectedDevice
        ? Object.entries(selectedDevice.semanticMetrics).flatMap(([role, metric]) =>
            metric ? [{ role, metric }] : []
          )
        : [],
    [selectedDevice]
  );
  const configuredRoles = data?.pveMetricRoles;
  const selectedMetrics = allMetrics
    .filter(({ role }) => !configuredRoles || configuredRoles.includes(role))
    .filter(({ role }) => !role.startsWith('diagnostic.'));
  const orderedMetrics = sortPveVisualMetrics(selectedMetrics);
  const primaryMetric =
    orderedMetrics.find(({ role }) => role === 'homelab.pve.cpu_usage') ?? orderedMetrics[0];
  const visibleMetrics = primaryMetric
    ? [
        primaryMetric,
        ...orderedMetrics
          .filter(({ role }) => role !== primaryMetric.role)
          .slice(0, Math.max(0, metricLimit(visualSize) - 1)),
      ]
    : [];
  const secondaryMetrics = visibleMetrics.filter(
    ({ role }) => role !== primaryMetric?.role && role !== 'homelab.pve.uptime'
  );
  const uptimeMetric = visibleMetrics.find(({ role }) => role === 'homelab.pve.uptime');
  const tintSurface = getCustomCardTintSurface(theme, data?.tintColor);
  const accentHex = normalizeCustomCardTint(data?.tintColor) ?? getThemeColorValue(primaryColor);
  const cardStyle: CSSProperties = {
    background: palette.background,
    borderColor: palette.border,
    boxShadow: palette.shadow,
    ...(tintSurface.panelStyle ?? {}),
  };

  useEffect(() => {
    if (!isEditMode) setSettingsOpen(false);
  }, [isEditMode]);
  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) setSettingsOpen(true);
  }, [onUpdate, openSettingsRequestKey]);

  if (!selectedDevice) {
    return (
      <BaseCard size={size} fullBleed frameClassName="overflow-hidden" style={cardStyle}>
        <div className={`relative z-10 flex h-full p-3 ${palette.textPrimary}`}>
          <CardEmptyState
            icon={Server}
            size={size}
            title={language === 'zh' ? 'PVE 设备不可用' : 'PVE device unavailable'}
            description={
              language === 'zh'
                ? '请连接 PVE 实体或在映射设置中选择数据源。'
                : 'Connect PVE entities or select sources in mapping settings.'
            }
          />
        </div>
      </BaseCard>
    );
  }

  const statusLabel =
    selectedDevice.state === 'online'
      ? language === 'zh'
        ? '在线'
        : 'Online'
      : selectedDevice.state === 'offline'
        ? language === 'zh'
          ? '离线'
          : 'Offline'
        : language === 'zh'
          ? '未知'
          : 'Unknown';

  return (
    <>
      <BaseCard
        size={size}
        fullBleed
        frameClassName="overflow-hidden"
        contentClassName="h-full"
        style={cardStyle}
        readableBackgroundColor={tintSurface.backgroundColor ?? palette.readableBackground}
      >
        <PveSystemAtmosphere size={size} effectsQuality={effectsQuality} theme={theme} />
        <div
          className={`relative z-10 flex h-full min-w-0 flex-col p-3 ${palette.textPrimary}`}
          data-home-os-pve-recipe="ups"
          data-home-os-pve-visual="system"
        >
          <EntityCardHeader
            title={selectedDevice.name}
            subtitle={`${language === 'zh' ? 'PVE / 服务器' : 'PVE / Server'}${selectedDevice.room ? ` · ${selectedDevice.room}` : ''}`}
            layout="eyebrow-first"
            size={size}
            titleClassName={palette.textPrimary}
            subtitleClassName={palette.textMuted}
            titleStyle={{ color: palette.titleColor }}
            subtitleStyle={{ color: palette.subtitleColor }}
            leading={
              <EntityCardHeaderIcon
                IconComponent={Server}
                isActive={selectedDevice.state === 'online'}
                size={size}
                baseColor={LUNAR_SERIES_PALETTE.blue}
                glyphClassName={palette.accent}
              />
            }
            trailing={
              isEditMode && onUpdate ? (
                <button
                  type="button"
                  aria-label={t('entityCardInteraction.openSettings', {
                    name: selectedDevice.name,
                  })}
                  onClick={() => setSettingsOpen(true)}
                  className={`rounded-full border p-2 ${palette.surfaceBorder} ${palette.textMuted} transition-colors hover:bg-white/10 hover:text-white`}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />

          {primaryMetric ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex min-w-0 items-end justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={`truncate text-4xl font-semibold leading-none tracking-[-0.04em] tabular-nums ${primaryMetric.metric.available ? palette.accentStrong : palette.textMuted}`}
                    data-home-os-pve-primary="cpu"
                  >
                    {formatMetric(primaryMetric.metric)}
                  </div>
                  <div className={`mt-2 flex items-center gap-1.5 text-xs ${palette.textMuted}`}>
                    <Cpu aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>{roleLabel(primaryMetric.role, language)}</span>
                  </div>
                  {metricPercent(primaryMetric.metric) !== null ? (
                    <div
                      className={`mt-2 h-1.5 max-w-48 overflow-hidden rounded-full ${palette.track}`}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4f7fd2] to-[#8fd8f5]"
                        style={{ width: `${metricPercent(primaryMetric.metric)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <div
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.63rem] font-medium uppercase tracking-[0.14em] ${statusClasses(selectedDevice, theme)}`}
                  data-home-os-pve-status={selectedDevice.state}
                >
                  {statusLabel}
                </div>
              </div>
              {secondaryMetrics.length > 0 ? (
                <div
                  className={`grid min-h-0 gap-x-2 gap-y-1 ${visualSize === 'small' || visualSize === 'extra-small' ? 'grid-cols-1' : visualSize === 'medium' ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                  {secondaryMetrics.map(({ role, metric }) => (
                    <PveMetricCell
                      key={role}
                      role={role}
                      metric={metric}
                      language={language}
                      palette={palette}
                    />
                  ))}
                </div>
              ) : null}
              {uptimeMetric ? (
                <div
                  className={`mt-auto flex items-center gap-1.5 text-[0.68rem] ${palette.textTertiary}`}
                >
                  <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>
                    {roleLabel(uptimeMetric.role, language)} · {formatMetric(uptimeMetric.metric)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <CardEmptyState
              icon={Server}
              size={size}
              title={language === 'zh' ? '没有可显示的 PVE 指标' : 'No PVE metrics to display'}
              description={language === 'zh' ? '请检查语义映射。' : 'Check the semantic mapping.'}
            />
          )}
        </div>
      </BaseCard>

      {onUpdate ? (
        <BaseCardDialogWithState
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
          title={language === 'zh' ? 'PVE 卡片设置' : 'PVE card settings'}
          description={
            language === 'zh' ? '选择设备和主要指标。' : 'Choose a device and primary metrics.'
          }
          controlsTabContent={
            <>
              <CardDialogSection label={language === 'zh' ? 'PVE 设备' : 'PVE device'}>
                <Select
                  value={selectedDevice.id}
                  onChange={(event) =>
                    onUpdate({
                      ...data,
                      pveDeviceId: event.target.value,
                      pveMetricRoles: undefined,
                    })
                  }
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </Select>
              </CardDialogSection>
              <CardDialogSection label={language === 'zh' ? '可见指标' : 'Visible metrics'}>
                <div className="space-y-1.5">
                  {allMetrics
                    .filter(({ role }) => !role.startsWith('diagnostic.'))
                    .map(({ role, metric }) => {
                      const checked = !configuredRoles || configuredRoles.includes(role);
                      return (
                        <SelectableCheckboxRow
                          key={role}
                          checked={checked}
                          onCheckedChange={() => {
                            const base = configuredRoles ?? allMetrics.map((item) => item.role);
                            const next = checked
                              ? base.filter((item) => item !== role)
                              : [...base, role];
                            onUpdate({
                              ...data,
                              pveDeviceId: selectedDevice.id,
                              pveMetricRoles: next,
                            });
                          }}
                          label={roleLabel(role, language)}
                          trailing={<span className="tabular-nums">{formatMetric(metric)}</span>}
                          checkboxPaletteColor={accentHex}
                        />
                      );
                    })}
                </div>
              </CardDialogSection>
            </>
          }
          tintColor={data?.tintColor}
          onTintColorChange={(tintColor) => onUpdate({ ...data, tintColor })}
          defaultTintAccent="#16a34a"
          theme={theme}
          maxWidth="md"
          height="capped"
        />
      ) : null}
    </>
  );
}
