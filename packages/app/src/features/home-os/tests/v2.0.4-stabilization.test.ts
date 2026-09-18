import { mapHomeAssistantEntitiesToNavetEntities } from '@navet/provider-homeassistant/homeassistant-mappers';
import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveWeatherSource } from '../mapping/data-source-resolver';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { buildHomeOsProductProjection } from '../projection/product-path-projection';
import { REAL_HOME_ASSISTANT_FIXTURE } from './fixtures/real-home/home-assistant';

describe('Home OS V2.0.4 raw Home Assistant stabilization', () => {
  const normalized = mapHomeAssistantEntitiesToNavetEntities(REAL_HOME_ASSISTANT_FIXTURE);
  const resolved = resolveSemanticEntities(normalized);

  it('preserves Registry context and classifies numeric-string telemetry', () => {
    const pveCpu = resolved.find((item) => item.entity.externalId === 'sensor.pve_cpu_usage');
    const routerClients = resolved.find(
      (item) => item.entity.externalId === 'sensor.openwrt_router_clients'
    );

    expect(pveCpu?.entity.attributes).toEqual(
      expect.objectContaining({
        deviceId: 'pve-node-1',
        deviceName: 'PVE Node 1',
        integration: 'proxmoxve',
        uniqueId: 'pve-node-1-cpu',
      })
    );
    expect(pveCpu?.roles).toContain(HOME_OS_ROLES.homelabPveCpu);
    expect(routerClients?.roles).toContain(HOME_OS_ROLES.networkRouterClients);
  });

  it('keeps unrelated System Monitor telemetry out of HA online', () => {
    const disk = resolved.find(
      (item) => item.entity.externalId === 'sensor.system_monitor_disk_use'
    );
    const online = resolved.find(
      (item) => item.entity.externalId === 'sensor.home_assistant_online'
    );

    expect(disk?.roles).not.toContain(HOME_OS_ROLES.homelabHomeAssistantOnline);
    expect(online?.roles).toContain(HOME_OS_ROLES.homelabHomeAssistantOnline);
  });

  it('reaches weather, calendar, astronomy, and PVE product paths', () => {
    const weather = resolveWeatherSource([], resolved);
    const calendar = resolved.find((item) => item.entity.externalId === 'calendar.family');
    const projection = buildHomeOsProductProjection({ entities: resolved });

    expect(weather).toMatchObject({
      sourceType: 'ha_weather',
      id: 'weather.home',
      current: { condition: 'partlycloudy', temperature: 29, humidity: 72 },
    });
    expect(calendar?.roles).toContain(HOME_OS_ROLES.familyCalendar);
    expect(projection.astronomyEntities.map((item) => item.entity.externalId)).toContain('sun.sun');
    expect(projection.pveDevices[0]?.semanticMetrics).toEqual(
      expect.objectContaining({
        [HOME_OS_ROLES.homelabPveCpu]: expect.objectContaining({ value: '24.5' }),
        [HOME_OS_ROLES.homelabPveTemperature]: expect.objectContaining({ value: '61.2' }),
      })
    );
  });

  it('recovers a renamed entity by the Registry unique ID', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'switch.old_study_light',
      stableRef: { providerId: 'home_assistant', uniqueId: 'study-light-relay-1' },
      semanticRoles: [HOME_OS_ROLES.lightingSwitch],
      source: 'manual',
      updatedAt: '2026-09-18T00:00:00.000Z',
    };
    const renamed = resolveSemanticEntities(normalized, [mapping]).find(
      (item) => item.entity.externalId === 'switch.study_light'
    );

    expect(renamed).toMatchObject({
      source: 'manual',
      roles: [HOME_OS_ROLES.lightingSwitch],
    });
  });
});
