import { BaseCard, ModalSurface } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useI18n } from '@navet/app/hooks';
import { Activity, HeartPulse } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ResolvedSemanticEntity } from '../../core/types';
import {
  type DeviceHealthDevice,
  resolveDeviceHealth,
} from '../../resolution/device-health-resolution';

export function deviceHealthSizeKind(size: CardSize) {
  if (size === 'tiny') return 'tiny';
  if (size === 'extra-small') return 'extra-small';
  if (size === 'small') return 'small';
  if (size === 'medium' || size === 'medium-vertical') return 'medium';
  return 'large';
}

const copy = {
  en: {
    title: 'Device Health',
    subtitle: 'WHOLE HOME',
    healthy: 'HEALTHY',
    attention: 'NEEDS ATTENTION',
    unavailable: 'UNAVAILABLE',
    lowBattery: 'LOW BATTERY',
    degraded: 'DEGRADED',
    unknown: 'UNKNOWN',
    good: 'GOOD',
    check: 'CHECK',
    sourceOffline: 'SOURCE OFFLINE',
    sourceMessage: 'Home Assistant unavailable',
    empty: 'No registered household devices',
    clear: 'No devices need attention',
    detail: 'Device Health Detail',
    healthyGroup: 'Healthy',
    showHealthy: 'Show healthy devices',
    hideHealthy: 'Hide healthy devices',
    battery: 'Battery',
  },
  zh: {
    title: '设备健康',
    subtitle: '全屋设备',
    healthy: '健康',
    attention: '需要关注',
    unavailable: '不可用',
    lowBattery: '低电量',
    degraded: '状态异常',
    unknown: '未知',
    good: '良好',
    check: '待检查',
    sourceOffline: '数据源离线',
    sourceMessage: 'Home Assistant 不可用',
    empty: '暂无已注册的家庭设备',
    clear: '暂无需要处理的设备',
    detail: '设备健康详情',
    healthyGroup: '健康设备',
    showHealthy: '查看健康设备',
    hideHealthy: '收起健康设备',
    battery: '电量',
  },
} as const;

function reason(device: DeviceHealthDevice, zh: boolean) {
  const issue = device.issues[0];
  if (issue === 'unavailable') return zh ? '设备不可用' : 'Device unavailable';
  if (issue === 'critical-battery') return zh ? '电量严重不足' : 'Critical battery';
  if (issue === 'degraded') return zh ? '部分功能不可用' : 'Partly unavailable';
  if (issue === 'low-battery') return zh ? '电量偏低' : 'Low battery';
  return zh ? '状态未知' : 'Unknown state';
}

function DeviceRow({
  device,
  zh,
  compact = false,
}: {
  device: DeviceHealthDevice;
  zh: boolean;
  compact?: boolean;
}) {
  const danger =
    device.issues.includes('unavailable') || device.issues.includes('critical-battery');
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-2 ${compact ? 'text-[10px] leading-[14px]' : 'py-2 text-sm'}`}
    >
      <span className="min-w-0 truncate text-[#e6efff]">{device.name}</span>
      <span className={`shrink-0 tabular-nums ${danger ? 'text-[#ffaaa8]' : 'text-[#e9c987]'}`}>
        {device.batteryLevel !== undefined && device.lowBattery
          ? `${device.batteryLevel}%`
          : reason(device, zh)}
      </span>
    </div>
  );
}

export interface DeviceHealthHomeOsCardProps {
  size: CardSize;
  entities: readonly ResolvedSemanticEntity[];
  providerConnected?: boolean;
  isEditMode?: boolean;
}

export function DeviceHealthHomeOsCard({
  size,
  entities,
  providerConnected,
  isEditMode = false,
}: DeviceHealthHomeOsCardProps) {
  const { language } = useI18n();
  const zh = language === 'zh';
  const labels = zh ? copy.zh : copy.en;
  const kind = deviceHealthSizeKind(size);
  const model = useMemo(
    () => resolveDeviceHealth(entities, providerConnected),
    [entities, providerConnected]
  );
  const { summary } = model;
  const [open, setOpen] = useState(false);
  const [showHealthy, setShowHealthy] = useState(false);
  const status = model.sourceOffline
    ? labels.sourceOffline
    : summary.total === 0 || summary.unknown > summary.total / 2
      ? labels.check
      : summary.attention
        ? labels.attention
        : labels.good;
  const statusColor =
    model.sourceOffline || summary.unknown > summary.total / 2
      ? '#a9bad6'
      : summary.unavailable ||
          model.attention.some((item) => item.issues.includes('critical-battery'))
        ? '#ffaaa8'
        : summary.attention
          ? '#e9c987'
          : '#8adbc9';
  const openDetail = () => {
    if (!isEditMode) setOpen(true);
  };
  return (
    <>
      <BaseCard
        size={size}
        title={labels.title}
        themeOverride="dark"
        subtitle={kind === 'tiny' || kind === 'medium' ? undefined : labels.subtitle}
        headerCompact={kind === 'medium'}
        headerVariant={kind === 'medium' ? 'dense' : 'default'}
        headerMarginBottomClassName={kind === 'medium' ? 'mb-0' : undefined}
        headerLeading={<HeartPulse className="h-4 w-4 text-[#9bcced]" />}
        headerTrailing={
          kind === 'tiny' ? undefined : (
            <span
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-[.12em]"
              style={{ color: statusColor }}
            >
              {status}
            </span>
          )
        }
        backgroundClassName="bg-[#080e22]"
        style={{ background: 'linear-gradient(135deg,#050816,#101b37 60%,#162345)' }}
        underlay={
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 80% 15%,rgba(104,151,224,.13),transparent 55%)',
            }}
          />
        }
        className={isEditMode ? '' : 'cursor-pointer'}
        data-device-health-size={kind}
        data-device-health-source={model.sourceOffline ? 'offline' : 'connected'}
        role={isEditMode ? undefined : 'button'}
        tabIndex={isEditMode ? undefined : 0}
        aria-label={isEditMode ? undefined : labels.detail}
        onClick={openDetail}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDetail();
          }
        }}
      >
        <div
          className={`flex h-full min-h-0 flex-col text-[#edf4ff] ${kind === 'medium' ? 'gap-1' : 'gap-2'}`}
        >
          {model.sourceOffline ? (
            <div className="flex h-full items-center text-xs text-[#e9c987]">
              {labels.sourceMessage}
            </div>
          ) : summary.total === 0 ? (
            <div className="flex h-full items-center text-xs text-[#bdcce8]">{labels.empty}</div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-2">
                <div className={kind === 'medium' ? 'flex items-baseline gap-2' : undefined}>
                  <div className="text-[9px] font-semibold tracking-[.16em] text-[#a7b9d6]">
                    {labels.healthy}
                  </div>
                  <div
                    className={`${kind === 'tiny' || kind === 'extra-small' ? 'text-lg' : kind === 'medium' ? 'text-2xl leading-6' : 'text-3xl'} font-semibold tabular-nums tracking-tight`}
                  >
                    {summary.healthy}
                    <span className="ml-1 text-sm font-normal text-[#a7b9d6]">
                      / {summary.total}
                    </span>
                  </div>
                </div>
                {kind !== 'tiny' && kind !== 'extra-small' ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#8eb8ef]/20 bg-[#8eb8ef]/5">
                    <Activity className="h-4 w-4 text-[#a9d4f1]" />
                  </div>
                ) : null}
              </div>
              {kind === 'tiny' || kind === 'extra-small' ? (
                <div className="truncate text-[10px] text-[#b8c9e4]">
                  {summary.attention ? `${summary.attention} ${labels.attention}` : labels.good}
                </div>
              ) : (
                <>
                  <div
                    className={`${kind === 'medium' ? 'flex items-center justify-between gap-1 text-[9px]' : kind === 'large' ? 'grid grid-cols-4 gap-3' : 'grid grid-cols-2 gap-3'} border-t border-white/[.07] pt-1`}
                  >
                    {(
                      [
                        [labels.unavailable, summary.unavailable],
                        [labels.lowBattery, summary.lowBattery],
                        ...(kind === 'small' ? [] : [[labels.degraded, summary.degraded]]),
                        ...(kind === 'large' ? [[labels.unknown, summary.unknown]] : []),
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className={
                          kind === 'medium' ? 'flex min-w-0 items-center gap-1' : 'min-w-0'
                        }
                      >
                        <div className="truncate text-[8px] tracking-[.08em] text-[#a7b9d6]">
                          {label}
                        </div>
                        <div
                          className={`${kind === 'medium' ? 'text-[10px]' : 'text-[13px]'} font-semibold tabular-nums leading-4`}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {kind === 'medium' || kind === 'large' ? (
                    <div className="min-h-0 overflow-hidden border-t border-white/[.07] pt-1">
                      <div className="text-[8px] font-semibold tracking-[.12em] text-[#9cb4d5]">
                        {labels.attention}
                      </div>
                      {model.attention.length ? (
                        model.attention
                          .slice(0, kind === 'large' ? 7 : 3)
                          .map((device) => (
                            <DeviceRow
                              key={device.id}
                              device={device}
                              zh={zh}
                              compact={kind === 'medium'}
                            />
                          ))
                      ) : (
                        <div className="pt-1 text-[10px] text-[#9edacb]">{labels.clear}</div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </BaseCard>
      <ModalSurface
        isOpen={open}
        onOpenChange={setOpen}
        title={labels.detail}
        contentStyle={{ background: '#101a34', color: '#eaf2ff' }}
        contentClassName="max-w-2xl"
        bodyClassName="max-h-[70vh] overflow-y-auto p-5"
      >
        <div className="space-y-5 text-[#eaf2ff]">
          {model.sourceOffline ? (
            <p className="text-sm text-[#e9c987]">{labels.sourceMessage}</p>
          ) : null}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[#e9c987]">
              {labels.attention} · {model.attention.length}
            </h3>
            {model.attention.length ? (
              model.attention.map((device) => (
                <div key={device.id} className="border-b border-white/10">
                  <DeviceRow device={device} zh={zh} />
                  <div className="pb-2 text-xs text-[#9eb2ce]">
                    {device.room} · {reason(device, zh)}
                    {device.batteryLevel !== undefined
                      ? ` · ${labels.battery} ${device.batteryLevel}%`
                      : ''}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#9eb2ce]">{labels.clear}</p>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[#b9cbe5]">
              {labels.unknown} · {summary.unknown}
            </h3>
            {model.devices
              .filter((device) => device.state === 'unknown')
              .map((device) => (
                <div key={device.id} className="border-b border-white/10">
                  <DeviceRow device={device} zh={zh} />
                  <div className="pb-2 text-xs text-[#9eb2ce]">{device.room}</div>
                </div>
              ))}
          </section>
          <section>
            <button
              type="button"
              className="text-sm text-[#a9d4f1]"
              onClick={() => setShowHealthy(!showHealthy)}
            >
              {showHealthy ? labels.hideHealthy : labels.showHealthy} · {summary.healthy}
            </button>
            {showHealthy
              ? model.devices
                  .filter((device) => device.state === 'healthy' && !device.lowBattery)
                  .map((device) => (
                    <div key={device.id} className="border-b border-white/10">
                      <DeviceRow device={device} zh={zh} />
                      <div className="pb-2 text-xs text-[#9eb2ce]">{device.room}</div>
                    </div>
                  ))
              : null}
          </section>
        </div>
      </ModalSurface>
    </>
  );
}
