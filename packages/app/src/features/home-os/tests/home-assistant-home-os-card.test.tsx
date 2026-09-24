import { HomeAssistantHomeOsCard } from '@navet/app/features/home-os/components/cards/home-assistant-home-os-card';
import { HomeOsWidget } from '@navet/app/features/home-os/components/cards/home-os-widget';
import { HOME_OS_ROLES } from '@navet/app/features/home-os/core/semantic-roles';
import type { ManualEntityMapping } from '@navet/app/features/home-os/core/types';
import {
  resolveSemanticEntities,
  resolveSemanticEntity,
} from '@navet/app/features/home-os/mapping/semantic-resolver';
import { homeOsEntity } from '@navet/app/features/home-os/tests/fixtures';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { mapHomeAssistantEntitiesToNavetEntities } from '@navet/provider-homeassistant';
import { afterEach, describe, expect, it } from 'vitest';
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
    expect(container.querySelector('[data-home-assistant-metric="storage"]')).toBeNull();
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

  it('maps the raw HA fixture online and storage, without inventing CPU or memory', () => {
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
      resolved.some((item) => item.roles.includes(HOME_OS_ROLES.homelabHomeAssistantCpu))
    ).toBe(false);
    expect(
      resolved.some((item) => item.roles.includes(HOME_OS_ROLES.homelabHomeAssistantMemory))
    ).toBe(false);
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
    expect(resolveSemanticEntity(tvCpu).roles).not.toContain(HOME_OS_ROLES.homelabHomeAssistantCpu);
    expect(resolveSemanticEntity(nasStatus).roles).not.toContain(
      HOME_OS_ROLES.homelabHomeAssistantOnline
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
