import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeOsLightCircuitBuilder } from '../adapters/light-circuit-builder';
import { buildHomeOsLights, getWholeHomeLightActions } from '../adapters/lighting-adapter';
import { AstronomyVisual } from '../astronomy/astronomy-visual';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import { classifyEntity } from '../mapping/auto-classifier';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { REAL_HOME_FIXTURE } from './fixtures/real-home';

const resolved = resolveSemanticEntities(REAL_HOME_FIXTURE);
const byId = (id: string) => {
  const entity = REAL_HOME_FIXTURE.find((candidate) => candidate.externalId === id);
  if (!entity) throw new Error(`Missing fixture entity: ${id}`);
  return entity;
};

describe('Home OS V2.0.3.4 real-environment contracts', () => {
  it.each([
    ['status', HOME_OS_ROLES.homelabPveStatus],
    ['cpu_model', HOME_OS_ROLES.homelabPveCpuModel],
    ['cpu_usage', HOME_OS_ROLES.homelabPveCpu],
    ['load', HOME_OS_ROLES.homelabPveLoad],
    ['temperature', HOME_OS_ROLES.homelabPveTemperature],
    ['io_wait', HOME_OS_ROLES.homelabPveIoWait],
    ['memory_usage', HOME_OS_ROLES.homelabPveMemory],
    ['memory_used', HOME_OS_ROLES.homelabPveMemoryUsed],
    ['memory_total', HOME_OS_ROLES.homelabPveMemoryTotal],
    ['ksm_memory', HOME_OS_ROLES.homelabPveKsmMemory],
    ['storage_usage', HOME_OS_ROLES.homelabPveStorage],
    ['storage_capacity', HOME_OS_ROLES.homelabPveStorageTotal],
    ['storage_used', HOME_OS_ROLES.homelabPveStorageUsed],
    ['storage_free', HOME_OS_ROLES.homelabPveStorageFree],
    ['uptime', HOME_OS_ROLES.homelabPveUptime],
    ['kernel', HOME_OS_ROLES.homelabPveKernelVersion],
    ['version', HOME_OS_ROLES.homelabPveVersion],
    ['updates', HOME_OS_ROLES.homelabPveUpdateCount],
    ['vm_running', HOME_OS_ROLES.homelabPveVmRunning],
    ['vm_total', HOME_OS_ROLES.homelabPveVmTotal],
    ['lxc_running', HOME_OS_ROLES.homelabPveContainerRunning],
    ['lxc_total', HOME_OS_ROLES.homelabPveContainerTotal],
  ])('maps PVE %s to its exact role', (id, role) => {
    expect(classifyEntity(byId(`sensor.pve_${id}`))[0]?.role).toBe(role);
  });

  it('rejects incompatible PVE telemetry', () => {
    expect(classifyEntity(byId('sensor.pve_malformed_cpu'))).toEqual([]);
    expect(classifyEntity(byId('sensor.pve_unknown_metric'))).toEqual([]);
  });

  it('keeps buttons action-only and unknown circuits out of the on count', () => {
    const circuits = new HomeOsLightCircuitBuilder().build(resolved);
    const bedroom = circuits.find((circuit) => circuit.id.includes('bedroom-light'));
    expect(bedroom).toMatchObject({ stateSource: undefined, stateQuality: 'unknown' });
    const lights = buildHomeOsLights(resolved);
    expect(
      lights.filter((light) => light.stateQuality === 'reliable' && light.state === 'on')
    ).toHaveLength(1);
    expect(getWholeHomeLightActions(lights).map((action) => action.entityId)).not.toContain(
      'button.doorbell_wake_screen_light'
    );
  });

  it('routes refrigerator door and child lock to appliance semantics', () => {
    expect(classifyEntity(byId('binary_sensor.fridge_door'))[0]?.role).toBe(
      HOME_OS_ROLES.applianceDoor
    );
    expect(classifyEntity(byId('lock.fridge_child_lock'))[0]?.role).toBe(
      HOME_OS_ROLES.applianceChildLock
    );
  });

  it('renders the pinned upstream phase image without homemade Moon geometry', () => {
    const html = renderToStaticMarkup(
      <AstronomyVisual
        entities={resolved}
        language="zh"
        now={new Date('2026-09-03T12:00:00+08:00')}
      />
    );
    expect(html).toContain('data-sun-position-card-image="mittag.png"');
    expect(html).toContain('data-moon-source="entity"');
    expect(html).not.toContain('data-moon-disc=');
    expect(html).not.toContain('<ellipse');
  });
});
