import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ManualEntityMapping } from '../core/types';
import { HomeOsDataSourceResolver } from '../mapping/data-source-resolver';
import { resolveMetric } from '../mapping/metric-resolution';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import {
  resolveFinalFunctionalDevices,
  resolveFunctionalOnlineState,
  resolveInternetOnlineState,
} from '../resolution/final-home-os-resolution';
import { homeOsEntity } from './fixtures';

const internetDevice = (metrics: HomeOsFunctionalDevice['metrics']): HomeOsFunctionalDevice => ({
  id: 'internet:test',
  kind: 'internet',
  name: 'Internet',
  metrics,
  sourceEntityIds: Object.values(metrics),
});

const persistedRole = (entityId: string, role: string): ManualEntityMapping => ({
  schemaVersion: 2,
  entityId,
  semanticRoles: [role],
  source: 'manual',
  updatedAt: '2026-09-20T00:00:00.000Z',
});

describe('Internet telemetry semantic resolution', () => {
  it('maps the real OpenWrt latency probe and derives Internet online from it', () => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.router_latency',
        name: '主路由延迟',
        primaryState: 12,
        attributes: { integration: 'openwrt', deviceName: '主路由', unit: 'ms' },
      }),
    ]);

    expect(entity?.roles).toEqual(
      expect.arrayContaining([
        HOME_OS_ROLES.networkInternetLatency,
        HOME_OS_ROLES.networkInternetOnline,
      ])
    );
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkRouterDownload);
  });

  it('maps explicit WAN connectivity to Internet online', () => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'binary_sensor.wan_status',
        name: 'WAN Status',
        primaryState: 'on',
        attributes: { deviceClass: 'connectivity' },
      }),
    ]);
    expect(entity?.roles).toContain(HOME_OS_ROLES.networkInternetOnline);
  });

  it.each([
    ['binary_sensor.midea_xxx_device_status', 'Midea device status', 'midea'],
    ['binary_sensor.device_status', 'Device status', 'generic'],
  ])('rejects local device status %s as Internet online', (externalId, name, integration) => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({ externalId, name, attributes: { integration, deviceClass: 'connectivity' } }),
    ]);
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetOnline);
    expect(entity?.candidates.map(({ role }) => role)).not.toContain(
      HOME_OS_ROLES.networkInternetOnline
    );
  });

  it('rejects an IP binary sensor from Ping integration as latency', () => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'binary_sensor.192_168_8_201',
        name: '192.168.8.201',
        primaryState: 'Detected',
        attributes: { integration: 'ping', unit: 'ms' },
      }),
    ]);
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetLatency);
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetOnline);
    expect(
      resolveMetric(HOME_OS_ROLES.networkInternetLatency, [entity as NonNullable<typeof entity>])
        .candidates
    ).toBeUndefined();
  });

  it('never maps any binary sensor to numeric latency', () => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'binary_sensor.internet_ping',
        name: 'Internet ping',
        primaryState: 18,
        attributes: { unit: 'ms' },
      }),
    ]);
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetLatency);
  });

  it('uses a numeric millisecond Ping sensor for latency and online fallback', () => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.internet_ping',
        name: 'Internet ping',
        primaryState: 18,
        attributes: { unit: 'ms' },
      }),
    ]);
    expect(entity?.roles).toContain(HOME_OS_ROLES.networkInternetLatency);
    expect(entity?.roles).toContain(HOME_OS_ROLES.networkInternetOnline);
    expect(resolveInternetOnlineState(entity, entity)).toBe('online');
  });

  it.each([
    'Detected',
    'Clear',
    'On',
    'Off',
    'True',
    'False',
    'Connected',
    'Home',
    'Away',
    'Infinity',
  ])('rejects nonnumeric latency state %s', (state) => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.internet_ping',
        primaryState: state,
        attributes: { unit: 'ms' },
      }),
    ]);
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetLatency);
    expect(resolveInternetOnlineState(entity)).toBe('unknown');
  });

  it('invalidates a stored binary-sensor latency selection everywhere it is read', () => {
    const id = 'binary_sensor.192_168_8_201';
    const [entity] = resolveSemanticEntities(
      [
        homeOsEntity({
          externalId: id,
          name: 'IP ping',
          primaryState: 'Detected',
          attributes: { integration: 'ping', unit: 'ms' },
        }),
      ],
      [persistedRole(id, HOME_OS_ROLES.networkInternetLatency)]
    );
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetLatency);
    expect(entity?.needsReview).toBe(true);
    expect(entity?.reviewDisposition).toBe('review');
    expect(
      resolveMetric(HOME_OS_ROLES.networkInternetLatency, [entity as NonNullable<typeof entity>])
        .mappedEntityId
    ).toBeUndefined();
    expect(
      new HomeOsDataSourceResolver([entity as NonNullable<typeof entity>]).candidatesForRole(
        HOME_OS_ROLES.networkInternetLatency
      )
    ).toEqual([]);
    const [device] = resolveFinalFunctionalDevices(
      [entity as NonNullable<typeof entity>],
      [internetDevice({ latency: id })]
    );
    expect(device?.metricEntities.latency).toBeUndefined();
  });

  it('invalidates a stored Midea Internet online selection', () => {
    const id = 'binary_sensor.midea_xxx_device_status';
    const [entity] = resolveSemanticEntities(
      [
        homeOsEntity({
          externalId: id,
          name: 'Midea device status',
          attributes: { integration: 'midea', deviceClass: 'connectivity' },
        }),
      ],
      [persistedRole(id, HOME_OS_ROLES.networkInternetOnline)]
    );
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetOnline);
    expect(entity?.needsReview).toBe(true);
    expect(
      resolveMetric(HOME_OS_ROLES.networkInternetOnline, [entity as NonNullable<typeof entity>])
        .mappedEntityId
    ).toBeUndefined();
    const [device] = resolveFinalFunctionalDevices(
      [entity as NonNullable<typeof entity>],
      [internetDevice({ online: id })]
    );
    expect(device?.metricEntities.online).toBeUndefined();
  });

  it('removes incompatible Internet candidates before selecting an actual WAN status', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'binary_sensor.midea_device_status',
        name: 'Midea device status',
        attributes: { deviceClass: 'connectivity' },
      }),
      homeOsEntity({
        externalId: 'binary_sensor.wan_connected',
        name: 'WAN connected',
        primaryState: 'on',
      }),
    ]);
    const resolution = resolveMetric(HOME_OS_ROLES.networkInternetOnline, entities);
    expect(resolution.mappedEntityId).toBe('binary_sensor.wan_connected');
    expect(
      new HomeOsDataSourceResolver(entities)
        .candidatesForRole(HOME_OS_ROLES.networkInternetOnline)
        .map(({ sourceId }) => sourceId)
    ).toEqual(['binary_sensor.wan_connected']);
  });

  it('does not treat Home Assistant host health as Internet health', () => {
    const [entity] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.home_assistant_online',
        name: 'Home Assistant online status',
        primaryState: 'online',
        attributes: { integration: 'systemmonitor' },
      }),
    ]);
    expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetOnline);
  });

  it('resolves unavailable and unknown latency probes without fabricating online state', () => {
    const unavailable = resolveFinalFunctionalDevices(
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'sensor.internet_latency',
          name: 'Internet latency',
          primaryState: 'unavailable',
          availability: 'unavailable',
          attributes: { unit: 'ms' },
        }),
      ]),
      [internetDevice({ latency: 'sensor.internet_latency' })]
    )[0];
    const unknown = resolveFinalFunctionalDevices(
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'sensor.internet_latency',
          name: 'Internet latency',
          primaryState: 'unknown',
          availability: 'unknown',
          attributes: { unit: 'ms' },
        }),
      ]),
      [internetDevice({ latency: 'sensor.internet_latency' })]
    )[0];

    expect(resolveFunctionalOnlineState(unavailable as NonNullable<typeof unavailable>)).toBe(
      'offline'
    );
    expect(resolveFunctionalOnlineState(unknown as NonNullable<typeof unknown>)).toBe('unknown');
  });

  it('keeps timeout and error probes unknown without a latency candidate', () => {
    for (const state of ['timeout', 'error']) {
      const [entity] = resolveSemanticEntities([
        homeOsEntity({
          externalId: 'sensor.internet_ping',
          primaryState: state,
          attributes: { unit: 'milliseconds' },
        }),
      ]);
      expect(entity?.roles).not.toContain(HOME_OS_ROLES.networkInternetLatency);
      expect(resolveInternetOnlineState(entity)).toBe('unknown');
    }
  });

  it('maps real-time speed-test rates but never cumulative traffic as Mbps', () => {
    const [rate, total] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.speedtest_download',
        name: 'Speedtest download',
        primaryState: 240,
        attributes: { integration: 'speedtest', unit: 'Mbps' },
      }),
      homeOsEntity({
        externalId: 'sensor.internet_download_total',
        name: 'Internet download total',
        primaryState: 399,
        attributes: { integration: 'speedtest', unit: 'GB' },
      }),
    ]);

    expect(rate?.roles).toContain(HOME_OS_ROLES.networkInternetDownload);
    expect(total?.roles).not.toContain(HOME_OS_ROLES.networkInternetDownload);
    expect(total?.entity.attributes.unit).toBe('GB');
    if (!total) throw new Error('missing cumulative traffic fixture');
    const [persistedTotal] = resolveSemanticEntities(
      [total.entity],
      [persistedRole(total.entity.externalId, HOME_OS_ROLES.networkInternetDownload)]
    );
    expect(persistedTotal?.roles).not.toContain(HOME_OS_ROLES.networkInternetDownload);
    expect(persistedTotal?.needsReview).toBe(true);
  });

  it('maps packet loss and jitter when explicit telemetry exists', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.internet_packet_loss',
        name: 'Internet packet loss',
        primaryState: 1,
        attributes: { unit: '%' },
      }),
      homeOsEntity({
        externalId: 'sensor.internet_jitter',
        name: 'Internet jitter',
        primaryState: 3,
        attributes: { unit: 'ms' },
      }),
    ]);
    expect(entities.flatMap((entity) => entity.roles)).toEqual(
      expect.arrayContaining([
        HOME_OS_ROLES.networkInternetPacketLoss,
        HOME_OS_ROLES.networkInternetJitter,
      ])
    );
  });
});
