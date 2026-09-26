import { buildFamilyMembers } from '../adapters/family-adapter';
import { buildHomeOsLights } from '../adapters/lighting-adapter';
import { evaluateAlerts } from '../alerts/alert-engine';
import { getDefaultHomeOsAlertRules } from '../alerts/default-rules';
import type { HomeOsAlertRuleConfig } from '../config/schema';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';
import { resolveDeviceHealth } from '../resolution/device-health-resolution';
import {
  resolveFinalFunctionalDevices,
  resolveFunctionalOnlineState,
  resolveInternetOnlineState,
} from '../resolution/final-home-os-resolution';

export type HomeOsRailKind = 'household' | 'lighting' | 'alerts' | 'internet' | 'battery';
export interface HomeOsRailMetric {
  kind: HomeOsRailKind;
  value: string;
  tone?: 'warning' | 'danger' | 'success';
}

/** A read-only projection of the same resolved sources used by the corresponding cards. */
export function buildHomeOsStatusRail(
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[],
  customAlertRules: readonly HomeOsAlertRuleConfig[],
  language: string,
  providerConnected?: boolean
): HomeOsRailMetric[] {
  if (providerConnected === false) return [];
  const zh = language === 'zh';
  const metrics: HomeOsRailMetric[] = [];
  const members = buildFamilyMembers(entities, functionalDevices);
  if (members.length) {
    const home = members.filter((member) => member.state.toLowerCase() === 'home').length;
    metrics.push({
      kind: 'household',
      value: zh ? `${home} / ${members.length} 在家` : `${home} / ${members.length} home`,
    });
  }

  const lights = buildHomeOsLights(entities, functionalDevices);
  if (lights.length) {
    const on = lights.filter(
      (light) => light.stateQuality === 'reliable' && light.state === 'on'
    ).length;
    metrics.push({ kind: 'lighting', value: zh ? `${on} 盏开启` : `${on} on` });
  }

  if (entities.length) {
    const alerts = evaluateAlerts(entities, [
      ...getDefaultHomeOsAlertRules(language),
      ...customAlertRules,
    ]);
    const health = resolveDeviceHealth(entities, providerConnected);
    const count = alerts.length;
    metrics.push({
      kind: 'alerts',
      value: count
        ? zh
          ? `${count} 项需处理`
          : `${count} need attention`
        : zh
          ? '无需处理'
          : 'All clear',
      tone: count ? 'warning' : 'success',
    });
    if (health.summary.total) {
      metrics.push({
        kind: 'battery',
        value: zh ? `${health.summary.lowBattery} 台低电量` : `${health.summary.lowBattery} low`,
        tone: health.summary.lowBattery ? 'warning' : undefined,
      });
    }
  }

  const internetDevice = resolveFinalFunctionalDevices(entities, functionalDevices).find(
    (device) => device.kind === 'internet'
  );
  const online = entities.find((entity) =>
    entity.roles.includes(HOME_OS_ROLES.networkInternetOnline)
  );
  const latency = entities.find((entity) =>
    entity.roles.includes(HOME_OS_ROLES.networkInternetLatency)
  );
  const internetState = internetDevice
    ? resolveFunctionalOnlineState(internetDevice)
    : resolveInternetOnlineState(online, latency);
  if (internetState !== 'unknown') {
    metrics.splice(Math.min(metrics.length, 3), 0, {
      kind: 'internet',
      value: internetState === 'online' ? (zh ? '在线' : 'Online') : zh ? '异常' : 'Offline',
      tone: internetState === 'online' ? 'success' : 'danger',
    });
  }
  return metrics;
}
