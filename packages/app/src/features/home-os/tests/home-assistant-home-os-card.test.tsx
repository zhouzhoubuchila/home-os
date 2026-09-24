import { HomeAssistantHomeOsCard } from '@navet/app/features/home-os/components/cards/home-assistant-home-os-card';
import { HomeOsWidget } from '@navet/app/features/home-os/components/cards/home-os-widget';
import { HomeOsDetailDialog } from '@navet/app/features/home-os/components/detail/home-os-detail-dialog';
import { HOME_OS_ROLES } from '@navet/app/features/home-os/core/semantic-roles';
import type { ManualEntityMapping } from '@navet/app/features/home-os/core/types';
import {
  resolveSemanticEntities,
  resolveSemanticEntity,
} from '@navet/app/features/home-os/mapping/semantic-resolver';
import {
  formatHomeAssistantUptime,
  selectHomeAssistantHostTelemetry,
} from '@navet/app/features/home-os/resolution/home-assistant-host-telemetry';
import { homeOsEntity } from '@navet/app/features/home-os/tests/fixtures';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { mapHomeAssistantEntitiesToNavetEntities } from '@navet/provider-homeassistant';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REAL_HOME_ASSISTANT_FIXTURE } from './fixtures/real-home/home-assistant';

const host = (id: string, value: string | number, unit?: string) =>
  homeOsEntity({
    externalId: id,
    name: id,
    primaryState: value,
    attributes: {
      integration: 'systemmonitor',
      deviceName: 'Home Assistant host',
      ...(unit ? { unit } : {}),
    },
  });

const full = resolveSemanticEntities([
  host('sensor.home_assistant_online', 'online'),
  host('sensor.home_assistant_cpu_usage', 12, '%'),
  host('sensor.home_assistant_memory_usage', 38, '%'),
  host('sensor.home_assistant_disk_use', 17.2, '%'),
]);

afterEach(() => useThemeStore.getState().setTheme('dark'));

describe('Home Assistant host Tech Monitor', () => {
  it('routes the registry kind to the dedicated card instead of generic metrics', () => {
    const { container } = renderWithProviders(
      <HomeOsWidget size="medium" data={{ kind: 'home-assistant' }} isEditMode />
    );
    expect(container.querySelector('[data-tech-monitor="home-assistant"]')).toBeInTheDocument();
  });

  it('uses the independent Medium recipe with real CPU and memory values', () => {
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="medium"
        entities={full}
        connected
        config={{ version: '2026.9.1', state: 'RUNNING' }}
      />
    );
    expect(container.querySelector('[data-tech-monitor="home-assistant"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-assistant-size-kind="medium"]')).toBeInTheDocument();
    expect(
      container.querySelector('[data-home-assistant-core-status="online"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toHaveTextContent('12 %');
    expect(container.querySelector('[data-home-assistant-metric="memory"]')).toHaveTextContent(
      '38 %'
    );
    expect(container.querySelector('[data-home-assistant-metric="version"]')).toHaveTextContent(
      '2026.9.1'
    );
    expect(container.querySelector('[data-home-assistant-metric="storage"]')).toHaveTextContent(
      '17.2 %'
    );
  });

  it('does not load atmosphere in Tiny and does not invent missing CPU', () => {
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="tiny"
        entities={full.slice(0, 1)}
        connected
        config={{ version: '2026.9.1', state: 'RUNNING' }}
      />
    );
    expect(container.querySelector('[data-home-assistant-atmosphere]')).toBeNull();
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toBeNull();
    expect(container.textContent).not.toContain('0 %');
  });

  it('uses an independent Extra Small recipe without the runtime row', () => {
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard size="extra-small" entities={full} connected />
    );
    expect(
      container.querySelector('[data-home-assistant-size-kind="extra-small"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[data-home-assistant-runtime]')).toBeNull();
    expect(container.querySelector('[data-home-assistant-atmosphere]')).toBeNull();
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toHaveTextContent('12 %');
  });

  it('keeps sparse data compact and uses the real HA config version', () => {
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="medium"
        entities={full.slice(0, 1)}
        connected
        config={{ version: '2026.9.1', state: 'RUNNING' }}
      />
    );
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toBeNull();
    expect(container.querySelector('[data-home-assistant-metric="memory"]')).toBeNull();
    expect(container.querySelector('[data-home-assistant-metric="version"]')).toHaveTextContent(
      '2026.9.1'
    );
  });

  it('does not present retained telemetry as live after provider disconnects', () => {
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="medium"
        entities={full}
        connected={false}
        config={{ version: '2026.9.1', state: 'RUNNING' }}
      />
    );
    expect(
      container.querySelector('[data-home-assistant-core-status="offline"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toBeNull();
    expect(container.querySelector('[data-home-assistant-metric="version"]')).toBeNull();
  });

  it('gets core status from connected HA config without a mapped online sensor', () => {
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="medium"
        entities={[]}
        connected
        config={{ version: '2026.9.1', state: 'RUNNING' }}
      />
    );
    expect(
      container.querySelector('[data-home-assistant-core-status="online"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[data-home-assistant-metric="version"]')).toHaveTextContent(
      '2026.9.1'
    );
  });

  it('keeps a dark instrument surface in Light theme', () => {
    useThemeStore.getState().setTheme('light');
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard size="medium" entities={full} connected />
    );
    expect(container.querySelector('[data-tech-monitor="home-assistant"]')).toHaveClass(
      'text-white'
    );
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toBeInTheDocument();
  });

  it('maps real-shaped System Monitor states without a Home Assistant device name', () => {
    const resolved = resolveSemanticEntities(
      mapHomeAssistantEntitiesToNavetEntities(REAL_HOME_ASSISTANT_FIXTURE)
    );
    expect(
      resolved.find((item) => item.entity.externalId === 'sensor.home_assistant_online')?.roles
    ).toContain(HOME_OS_ROLES.homelabHomeAssistantOnline);
    expect(
      resolved.find((item) => item.entity.externalId === 'sensor.system_monitor_disk_use')?.roles
    ).toContain(HOME_OS_ROLES.homelabHomeAssistantStorage);
    expect(
      resolved.find((item) => item.entity.externalId === 'sensor.processor_use')?.roles
    ).toContain(HOME_OS_ROLES.homelabHomeAssistantCpu);
    expect(
      resolved.find((item) => item.entity.externalId === 'sensor.memory_usage')?.roles
    ).toContain(HOME_OS_ROLES.homelabHomeAssistantMemory);
    expect(resolved.find((item) => item.entity.externalId === 'sensor.uptime')?.roles).toContain(
      HOME_OS_ROLES.homelabHomeAssistantUptime
    );
    expect(
      resolved.find((item) => item.entity.externalId === 'sensor.processor_use')?.entity.attributes
    ).toEqual(
      expect.objectContaining({
        integration: 'systemmonitor',
        deviceName: 'System Monitor',
        unit: '%',
      })
    );
  });

  it('recognizes English processor and memory labels but rejects non-percent memory', () => {
    const processor = homeOsEntity({
      externalId: 'sensor.processor_use',
      name: 'Processor utilization',
      primaryState: '3',
      attributes: { integration: 'systemmonitor', deviceName: 'System Monitor', unit: '%' },
    });
    const memory = homeOsEntity({
      externalId: 'sensor.memory_usage',
      name: 'Memory usage',
      primaryState: '67.3',
      attributes: { platform: 'systemmonitor', deviceName: 'System Monitor', unit: '%' },
    });
    const bytes = homeOsEntity({
      externalId: 'sensor.memory_available',
      name: 'Available memory',
      primaryState: '2048',
      attributes: { integration: 'systemmonitor', deviceName: 'System Monitor', unit: 'MB' },
    });
    expect(resolveSemanticEntity(processor).roles).toContain(HOME_OS_ROLES.homelabHomeAssistantCpu);
    expect(resolveSemanticEntity(memory).roles).toContain(HOME_OS_ROLES.homelabHomeAssistantMemory);
    expect(resolveSemanticEntity(bytes).roles).not.toContain(
      HOME_OS_ROLES.homelabHomeAssistantMemory
    );
    expect(
      resolveSemanticEntity(
        homeOsEntity({
          externalId: 'sensor.processor_usage',
          name: 'Processor usage',
          primaryState: 3,
          attributes: { platform: 'systemmonitor', unit: '%' },
        })
      ).roles
    ).toContain(HOME_OS_ROLES.homelabHomeAssistantCpu);
  });

  it('selects /config over root and /media for card and detail data', () => {
    const resolved = resolveSemanticEntities(
      mapHomeAssistantEntitiesToNavetEntities(REAL_HOME_ASSISTANT_FIXTURE)
    );
    const selected = selectHomeAssistantHostTelemetry(resolved);
    const storage = selected.filter((item) =>
      item.roles.includes(HOME_OS_ROLES.homelabHomeAssistantStorage)
    );
    expect(storage).toHaveLength(1);
    expect(storage[0].entity.externalId).toBe('sensor.system_monitor_disk_use_config');
    const withoutConfig = resolved.filter(
      (item) => item.entity.externalId !== 'sensor.system_monitor_disk_use_config'
    );
    expect(
      selectHomeAssistantHostTelemetry(withoutConfig).find((item) =>
        item.roles.includes(HOME_OS_ROLES.homelabHomeAssistantStorage)
      )?.entity.externalId
    ).toBe('sensor.system_monitor_disk_use');
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="large"
        entities={resolved}
        connected
        config={{ version: '2026.8.3', state: 'RUNNING' }}
      />
    );
    expect(container.querySelectorAll('[data-home-assistant-metric="storage"]')).toHaveLength(1);
    expect(container.querySelector('[data-home-assistant-metric="storage"]')).toHaveTextContent(
      '23.0 %'
    );
  });

  it('shows CPU, memory, storage, uptime and version in Medium from raw HA entities', () => {
    const resolved = resolveSemanticEntities(
      mapHomeAssistantEntitiesToNavetEntities(REAL_HOME_ASSISTANT_FIXTURE)
    );
    const { container } = renderWithProviders(
      <HomeAssistantHomeOsCard
        size="medium"
        entities={resolved}
        connected
        config={{ version: '2026.8.3', state: 'RUNNING' }}
      />
    );
    expect(container.querySelector('[data-home-assistant-metric="cpu"]')).toHaveTextContent('3 %');
    expect(container.querySelector('[data-home-assistant-metric="memory"]')).toHaveTextContent(
      '67.3 %'
    );
    expect(container.querySelector('[data-home-assistant-metric="storage"]')).toHaveTextContent(
      '23.0 %'
    );
    expect(container.querySelector('[data-home-assistant-metric="uptime"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-assistant-metric="version"]')).toHaveTextContent(
      '2026.8.3'
    );
  });

  it('formats uptime from the real timestamp instead of a fixed duration', () => {
    const resolved = resolveSemanticEntities(
      mapHomeAssistantEntitiesToNavetEntities(REAL_HOME_ASSISTANT_FIXTURE)
    );
    const uptime = resolved.find((item) => item.entity.externalId === 'sensor.uptime');
    expect(uptime).toBeDefined();
    if (!uptime) throw new Error('Uptime fixture missing');
    expect(formatHomeAssistantUptime(uptime, 'zh', Date.parse('2026-09-25T09:00:00.000Z'))).toBe(
      '1周'
    );
    expect(formatHomeAssistantUptime(uptime, 'zh', Date.parse('2026-09-19T09:00:00.000Z'))).toBe(
      '1天'
    );
  });

  it('uses the same resolved telemetry in Home Assistant detail', () => {
    const resolved = resolveSemanticEntities(
      mapHomeAssistantEntitiesToNavetEntities(REAL_HOME_ASSISTANT_FIXTURE)
    );
    renderWithProviders(
      <HomeOsDetailDialog kind="home-assistant" entities={resolved} isOpen onOpenChange={vi.fn()} />
    );
    expect(document.body.textContent).toContain('处理器占用');
    expect(document.body.textContent).toContain('内存用量');
    expect(document.body.textContent).toContain('23.0 %');
    expect(document.body.textContent).not.toContain('21.0 %');
    expect(document.body.textContent).not.toContain('30.0 %');
    expect(document.body.textContent).toContain('Uptime');
  });

  it('accepts real duration and human-readable uptime states', () => {
    const duration = homeOsEntity({
      externalId: 'sensor.uptime',
      name: 'Uptime',
      primaryState: '604800',
      attributes: { platform: 'systemmonitor', unit: 's' },
    });
    const readable = homeOsEntity({
      externalId: 'sensor.uptime',
      name: 'Uptime',
      primaryState: '1周',
      attributes: { platform: 'systemmonitor' },
    });
    expect(resolveSemanticEntity(duration).roles).toContain(
      HOME_OS_ROLES.homelabHomeAssistantUptime
    );
    const resolvedReadable = resolveSemanticEntity(readable);
    expect(resolvedReadable.roles).toContain(HOME_OS_ROLES.homelabHomeAssistantUptime);
    expect(formatHomeAssistantUptime(resolvedReadable, 'zh')).toBe('1周');
  });

  it('rejects unrelated CPU and status even with tempting names or integrations', () => {
    const tvCpu = homeOsEntity({
      externalId: 'sensor.tv_cpu',
      name: 'TV CPU',
      primaryState: 24,
      attributes: { integration: 'systemmonitor', deviceName: 'Living TV', unit: '%' },
    });
    const nasStatus = homeOsEntity({
      externalId: 'sensor.nas_status',
      name: 'NAS status',
      primaryState: 'online',
      attributes: { integration: 'home_assistant', deviceName: 'NAS' },
    });
    const pveCpu = homeOsEntity({
      externalId: 'sensor.pve_cpu',
      name: 'PVE CPU',
      primaryState: 18,
      attributes: { integration: 'systemmonitor', deviceName: 'PVE Node', unit: '%' },
    });
    const routerMemory = homeOsEntity({
      externalId: 'sensor.router_memory',
      name: 'Router memory',
      primaryState: 42,
      attributes: { integration: 'systemmonitor', deviceName: 'Main Router', unit: '%' },
    });
    const nasStorage = homeOsEntity({
      externalId: 'sensor.nas_disk_use',
      name: 'NAS storage usage',
      primaryState: 76,
      attributes: { integration: 'systemmonitor', deviceName: 'NAS', unit: '%' },
    });
    expect(resolveSemanticEntity(tvCpu).roles).not.toContain(HOME_OS_ROLES.homelabHomeAssistantCpu);
    expect(resolveSemanticEntity(nasStatus).roles).not.toContain(
      HOME_OS_ROLES.homelabHomeAssistantOnline
    );
    expect(resolveSemanticEntity(pveCpu).roles).not.toContain(
      HOME_OS_ROLES.homelabHomeAssistantCpu
    );
    expect(resolveSemanticEntity(routerMemory).roles).not.toContain(
      HOME_OS_ROLES.homelabHomeAssistantMemory
    );
    expect(resolveSemanticEntity(nasStorage).roles).not.toContain(
      HOME_OS_ROLES.homelabHomeAssistantStorage
    );
  });

  it('invalidates an incompatible persisted host mapping', () => {
    const tvCpu = homeOsEntity({
      externalId: 'sensor.tv_cpu',
      name: 'TV CPU',
      primaryState: 24,
      attributes: { integration: 'systemmonitor', deviceName: 'Living TV', unit: '%' },
    });
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: tvCpu.externalId,
      semanticRoles: [HOME_OS_ROLES.homelabHomeAssistantCpu],
      source: 'manual',
      updatedAt: '2026-09-25T00:00:00Z',
    };
    const result = resolveSemanticEntity(tvCpu, [mapping]);
    expect(result.roles).not.toContain(HOME_OS_ROLES.homelabHomeAssistantCpu);
    expect(result.needsReview).toBe(true);
  });
});
