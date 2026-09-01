import { dispatchEntityCommand } from '@navet/app/commands';
import { BaseCard, Button, ModalSurface } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Solar } from 'lunar-javascript';
import type { ReactNode } from 'react';
import { buildFamilyMembers } from '../../adapters/family-adapter';
import { buildHomeOsLights } from '../../adapters/lighting-adapter';
import { buildPvePhysicalDevices } from '../../adapters/physical-device-adapter';
import { evaluateAlerts } from '../../alerts/alert-engine';
import { getDefaultHomeOsAlertRules } from '../../alerts/default-rules';
import { AstronomyVisual, getAstronomySnapshot } from '../../astronomy/astronomy-visual';
import { getMoonPhase } from '../../astronomy/moon-phase';
import { getHomeOsCardDefinition, type HomeOsCardKind } from '../../cards/card-registry';
import { HOME_OS_ROLES } from '../../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../../core/types';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { resolveMetric } from '../../mapping/metric-resolution';
import { useHomeOsConfigStore } from '../../stores/home-os-config-store';

function MetricRows({ entities }: { entities: readonly ResolvedSemanticEntity[] }) {
  if (!entities.length) return <p className="text-sm text-current/60">—</p>;
  return (
    <div className="grid gap-2">
      {entities.map((item) => {
        const unit = item.entity.attributes.unit ?? item.entity.attributes.unit_of_measurement;
        return (
          <div
            key={item.entity.canonicalId}
            className="flex items-start justify-between gap-4 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.displayName}</span>
              <span className="block truncate text-xs text-current/50">{item.roles[0]}</span>
            </span>
            <strong className="shrink-0 tabular-nums">
              {String(item.entity.primaryState ?? '—')}
              {typeof unit === 'string' ? ` ${unit}` : ''}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

const DETAIL_ROLES: Partial<Record<HomeOsCardKind, string[]>> = {
  router: [
    HOME_OS_ROLES.networkRouterOnline,
    HOME_OS_ROLES.networkRouterUptime,
    HOME_OS_ROLES.networkRouterClients,
    HOME_OS_ROLES.networkRouterCpu,
    HOME_OS_ROLES.networkRouterMemory,
    HOME_OS_ROLES.networkRouterUpload,
    HOME_OS_ROLES.networkRouterDownload,
  ],
  internet: [
    HOME_OS_ROLES.networkInternetOnline,
    HOME_OS_ROLES.networkInternetLatency,
    HOME_OS_ROLES.networkInternetPacketLoss,
    HOME_OS_ROLES.networkInternetJitter,
    HOME_OS_ROLES.networkInternetDownload,
    HOME_OS_ROLES.networkInternetUpload,
  ],
  gas: [HOME_OS_ROLES.energyGasCurrent],
  pve: [
    HOME_OS_ROLES.homelabPveOnline,
    HOME_OS_ROLES.homelabPveCpu,
    HOME_OS_ROLES.homelabPveTemperature,
    HOME_OS_ROLES.homelabPveMemory,
    HOME_OS_ROLES.homelabPveStorage,
    HOME_OS_ROLES.homelabPveVmRunning,
    HOME_OS_ROLES.homelabPveVersion,
  ],
};

function DiagnosisRows({
  roles,
  entities,
  copy,
}: {
  roles: readonly string[];
  entities: readonly ResolvedSemanticEntity[];
  copy: ReturnType<typeof getHomeOsCopy>;
}) {
  return (
    <div className="grid gap-2">
      {roles.map((role) => {
        const resolution = resolveMetric(role, entities);
        const stateCopy = {
          capability_absent: copy.capabilityAbsent,
          unmapped: copy.candidateUnmapped,
          ambiguous: copy.ambiguous,
          unavailable: copy.metricUnavailable,
          stale: copy.metricStale,
        } as const;
        return (
          <div key={role} className="rounded-xl border border-current/10 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{role}</span>
              <strong className="tabular-nums">
                {resolution.state === 'available' || resolution.state === 'stale'
                  ? `${String(resolution.value)}${resolution.unit ? ` ${resolution.unit}` : ''}`
                  : stateCopy[resolution.state]}
              </strong>
            </div>
            {resolution.candidates?.length ? (
              <p className="mt-1 truncate text-xs text-current/55">
                {resolution.candidates.map(({ entityId }) => entityId).join(' · ')}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function HomeOsDetailDialog({
  kind,
  entities,
  isOpen,
  onOpenChange,
}: {
  kind: HomeOsCardKind;
  entities: readonly ResolvedSemanticEntity[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { language } = useI18n();
  const { theme } = useTheme();
  const copy = getHomeOsCopy(language);
  const surface = getThemeSurfaceTokens(theme);
  const config = useHomeOsConfigStore((state) => state.config);
  const definition = getHomeOsCardDefinition(kind);
  const visible = entities.filter((item) => !item.ignored && item.displayMode !== 'hidden');
  const prefix =
    kind === 'pve'
      ? 'homelab.pve.'
      : kind === 'router'
        ? 'network.router.'
        : kind === 'internet'
          ? 'network.internet.'
          : kind === 'gas'
            ? 'energy.gas.'
            : kind === 'air-quality'
              ? 'environment.air_quality.'
              : kind === 'home-assistant'
                ? 'homelab.home_assistant.'
                : kind === 'weather'
                  ? 'weather.'
                  : kind === 'cleaning'
                    ? 'home.cleaning'
                    : kind === 'calendar'
                      ? 'family.calendar'
                      : '';
  let content: ReactNode;

  if (kind === 'household') {
    const members = buildFamilyMembers(visible);
    content = members.length ? (
      <div className="grid gap-2">
        {members.map((member) => (
          <div key={member.id} className="rounded-xl border border-current/10 p-3">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{member.name}</span>
              <span className={surface.textSecondary}>{member.state}</span>
            </div>
            <p className={`mt-1 text-xs ${surface.textSecondary}`}>
              {member.location ?? copy.roomUnknown}
              {member.battery !== undefined ? ` · ${member.battery}%` : ''}
            </p>
            <p className={`mt-2 text-xs ${surface.textMuted}`}>
              {copy.trackerSources}:{' '}
              {member.trackerSources.map((tracker) => tracker.name).join(' · ') ||
                copy.noMappedData}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p>{copy.noMappedData}</p>
    );
  } else if (kind === 'lighting') {
    const lights = buildHomeOsLights(visible, config.functionalDevices ?? []);
    content = lights.length ? (
      <div className="grid gap-2">
        {lights.map((light) => (
          <div key={light.id} className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">{light.name}</span>
              <span className={`block text-xs ${surface.textSecondary}`}>
                {light.room ?? copy.roomUnknown} · {light.state}
              </span>
            </span>
            {light.controllable ? (
              <Button
                size="small"
                variant="secondary"
                onClick={() => {
                  const target =
                    light.state === 'on'
                      ? (light.controls.off ?? light.controls.toggle)
                      : (light.controls.on ?? light.controls.toggle);
                  if (!target) return;
                  void dispatchEntityCommand(
                    {
                      type: target.startsWith('button.')
                        ? 'trigger'
                        : light.state === 'on'
                          ? 'turn_off'
                          : 'turn_on',
                      entityId: target,
                    },
                    light.providerId
                  );
                }}
              >
                {light.state === 'on' ? copy.turnOff : copy.turnOn}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    ) : (
      <p>{copy.noMappedData}</p>
    );
  } else if (kind === 'alerts') {
    const alerts = evaluateAlerts(visible, [
      ...getDefaultHomeOsAlertRules(language),
      ...config.alertRules,
    ]);
    content = alerts.length ? (
      <div className="grid gap-2">
        {alerts.map((alert) => (
          <div key={alert.id}>
            <p className="font-medium">{alert.message}</p>
            <p className={`text-sm ${surface.textSecondary}`}>
              {alert.deviceName} · {alert.room ?? copy.roomUnknown}
            </p>
            <p className={`text-xs ${surface.textSecondary}`}>
              {copy[alert.severity]} · {copy.currentValue}: {String(alert.currentValue)}
              {alert.unit ? ` ${alert.unit}` : ''} · {copy.duration}:{' '}
              {Math.max(1, Math.round(alert.durationMs / 60_000))} min
            </p>
            <p className={`text-xs ${surface.textMuted}`}>
              {copy.sourceEntity}: {alert.sourceEntityId}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p>{copy.noActiveAlerts}</p>
    );
  } else if (kind === 'pve') {
    const devices = buildPvePhysicalDevices(visible, config.physicalDevices);
    content = (
      <div className="grid gap-3">
        {devices.map((device) => (
          <BaseCard
            key={device.id}
            size="medium"
            title={device.name}
            subtitle={`${copy.connectivity}: ${copy[device.state]} · ${copy.freshness}: ${copy[device.freshness]}`}
          >
            <MetricRows
              entities={visible.filter((entity) =>
                device.entityIds.includes(entity.entity.externalId)
              )}
            />
            {device.freshness === 'stale' ? (
              <p className="mt-3 text-sm text-amber-400">{copy.dataStale}</p>
            ) : null}
          </BaseCard>
        ))}
        <DiagnosisRows roles={DETAIL_ROLES.pve ?? []} entities={visible} copy={copy} />
      </div>
    );
  } else if (kind === 'lunar') {
    const now = new Date();
    const lunar = Solar.fromDate(now).getLunar();
    const moon = getMoonPhase(now);
    const astronomy = getAstronomySnapshot(visible, now);
    content = (
      <div className="grid gap-4">
        <AstronomyVisual entities={visible} language={language} now={now} />
        <div className="flex items-center gap-4">
          <span className="text-5xl" aria-hidden="true">
            {moon.icon}
          </span>
          <div>
            <p className="text-xl font-semibold">
              {language === 'zh' ? moon.name.zh : moon.name.en}
            </p>
            <p className={surface.textSecondary}>
              {copy.moonAge}: {moon.age.toFixed(1)} · {copy.illumination}:{' '}
              {Math.round(moon.illumination * 100)}%
            </p>
          </div>
        </div>
        <MetricRows entities={[]} />
        <p>
          {now.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')} · {lunar.toString()}
        </p>
        <p className={surface.textSecondary}>
          {copy.solarTerm}: {lunar.getJieQi() || lunar.getNextJieQi()?.getName() || '—'}
        </p>
        <div className={`grid grid-cols-2 gap-2 text-sm ${surface.textSecondary}`}>
          <span>
            {copy.sunrise}: {astronomy.sunrise?.toLocaleTimeString() ?? '—'}
          </span>
          <span>
            {copy.sunset}: {astronomy.sunset?.toLocaleTimeString() ?? '—'}
          </span>
          <span>
            {copy.solarAzimuth}: {astronomy.azimuth ?? '—'}°
          </span>
          <span>
            {copy.solarElevation}: {astronomy.elevation ?? '—'}°
          </span>
        </div>
      </div>
    );
  } else {
    const diagnosticRoles = DETAIL_ROLES[kind];
    content = diagnosticRoles ? (
      <DiagnosisRows roles={diagnosticRoles} entities={visible} copy={copy} />
    ) : (
      <MetricRows
        entities={visible.filter((entity) => entity.roles.some((role) => role.startsWith(prefix)))}
      />
    );
  }

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={`${copy.detailTitle} · ${language === 'zh' ? definition?.name.zh : definition?.name.en}`}
      description={copy.detailDescription}
      mobileCoverSheet
      contentClassName="max-w-2xl"
      bodyClassName="max-h-[70vh] overflow-y-auto p-5"
    >
      <div className="space-y-4">
        {content}
        {kind === 'pve' ? (
          <p className={`text-xs ${surface.textMuted}`}>{copy.historyUnavailable}</p>
        ) : null}
      </div>
    </ModalSurface>
  );
}
