import {
  CardDialogSection,
  CardEmptyState,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  BaseCard,
  BaseCardDialogWithState,
  CardMetric,
  EntityCardHeader,
  EntityCardHeaderIcon,
  Select,
} from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Server, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { HomeOsMetric, HomeOsPhysicalDevice } from '../../core/types';

export interface PveHomeOsCardData {
  pveDeviceId?: string;
  pveMetricRoles?: string[];
  tintColor?: string;
}

function normalizeSize(size: CardSize): 'small' | 'medium' | 'large' {
  return size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';
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

function statusClasses(device: HomeOsPhysicalDevice, theme: string) {
  if (device.state === 'online' && device.freshness === 'fresh') {
    return theme === 'light'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
      : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
  }
  if (device.state === 'offline' || device.health === 'critical') {
    return theme === 'light'
      ? 'border-red-300 bg-red-100 text-red-800'
      : 'border-red-400/30 bg-red-500/15 text-red-200';
  }
  if (device.freshness === 'stale' || device.health === 'warning') {
    return theme === 'light'
      ? 'border-amber-300 bg-amber-100 text-amber-800'
      : 'border-amber-400/30 bg-amber-500/15 text-amber-200';
  }
  return theme === 'light'
    ? 'border-slate-300 bg-slate-100 text-slate-700'
    : 'border-white/12 bg-white/8 text-white/72';
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
  const surface = getThemeSurfaceTokens(theme);
  const resolvedSize = normalizeSize(size);
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
  const visibleMetrics = selectedMetrics.slice(
    0,
    resolvedSize === 'small' ? 2 : resolvedSize === 'medium' ? 4 : 6
  );
  const primaryMetric =
    visibleMetrics.find(({ role }) => role === 'homelab.pve.cpu_usage') ?? visibleMetrics[0];
  const secondaryMetrics = visibleMetrics.filter(({ role }) => role !== primaryMetric?.role);
  const tintSurface = getCustomCardTintSurface(theme, data?.tintColor);
  const accentHex = normalizeCustomCardTint(data?.tintColor) ?? getThemeColorValue(primaryColor);

  useEffect(() => {
    if (!isEditMode) setSettingsOpen(false);
  }, [isEditMode]);
  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) setSettingsOpen(true);
  }, [onUpdate, openSettingsRequestKey]);

  if (!selectedDevice) {
    return (
      <BaseCard size={resolvedSize} fullBleed frameClassName="overflow-hidden">
        <div className="flex h-full p-3">
          <CardEmptyState
            icon={Server}
            size={resolvedSize}
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
        size={resolvedSize}
        fullBleed
        frameClassName="overflow-hidden"
        contentClassName="h-full"
        style={tintSurface.panelStyle}
        readableBackgroundColor={tintSurface.backgroundColor}
      >
        <div className="relative flex h-full min-w-0 flex-col p-3" data-home-os-pve-recipe="ups">
          <EntityCardHeader
            title={selectedDevice.name}
            subtitle={selectedDevice.room ?? 'PVE'}
            layout="eyebrow-first"
            size={resolvedSize === 'large' ? 'medium' : resolvedSize}
            titleClassName={surface.textPrimary}
            subtitleClassName={surface.textMuted}
            leading={
              <EntityCardHeaderIcon
                IconComponent={Server}
                isActive={selectedDevice.state === 'online'}
                size={resolvedSize === 'large' ? 'medium' : resolvedSize}
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
                  className={`rounded-full border p-2 ${surface.border} ${surface.hoverBg}`}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />

          {primaryMetric ? (
            <div className="mt-3 flex flex-1 flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <CardMetric
                  value={formatMetric(primaryMetric.metric)}
                  label={roleLabel(primaryMetric.role, language)}
                  size={resolvedSize === 'large' ? 'xl' : 'lg'}
                  isActive={primaryMetric.metric.available}
                  accentClassName={theme === 'light' ? 'text-slate-900' : 'text-white'}
                  theme={theme}
                  labelClassName={surface.textMuted}
                />
                <div
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses(selectedDevice, theme)}`}
                >
                  {statusLabel}
                </div>
              </div>
              {secondaryMetrics.length > 0 ? (
                <div
                  className={`grid gap-2 ${resolvedSize === 'small' ? 'grid-cols-1' : resolvedSize === 'medium' ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                  {secondaryMetrics.map(({ role, metric }) => (
                    <div
                      key={role}
                      className={`min-w-0 rounded-2xl border px-3 py-2 ${surface.border} ${surface.panelMuted}`}
                    >
                      <div
                        className={`truncate text-xs uppercase tracking-[0.1em] ${surface.textMuted}`}
                      >
                        {roleLabel(role, language)}
                      </div>
                      <div
                        className={`mt-1 truncate text-lg font-semibold tabular-nums ${surface.textPrimary}`}
                      >
                        {formatMetric(metric)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <CardEmptyState
              icon={Server}
              size={resolvedSize}
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
