import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice } from '../core/types';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import {
  resolveFinalFunctionalDevices,
  resolveFunctionalOnlineState,
} from '../resolution/final-home-os-resolution';
import { homeOsEntity } from './fixtures';

const internetDevice = (metrics: HomeOsFunctionalDevice['metrics']): HomeOsFunctionalDevice => ({
  id: 'internet:test',
  kind: 'internet',
  name: 'Internet',
  metrics,
  sourceEntityIds: Object.values(metrics),
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
          primaryState: 12,
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
          primaryState: 12,
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
  });

  it('maps packet loss and jitter when explicit telemetry exists', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'sensor.internet_packet_loss', name: 'Internet packet loss' }),
      homeOsEntity({ externalId: 'sensor.internet_jitter', name: 'Internet jitter' }),
    ]);
    expect(entities.flatMap((entity) => entity.roles)).toEqual(
      expect.arrayContaining([
        HOME_OS_ROLES.networkInternetPacketLoss,
        HOME_OS_ROLES.networkInternetJitter,
      ])
    );
  });
});
