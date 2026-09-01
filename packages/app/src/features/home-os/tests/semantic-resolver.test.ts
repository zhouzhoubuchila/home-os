import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveSemanticEntities, resolveSemanticEntity } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('semantic resolver', () => {
  it('classifies person, light, and tracker domains without treating trackers as people', () => {
    expect(resolveSemanticEntity(homeOsEntity({ externalId: 'person.alex' })).roles).toContain(
      HOME_OS_ROLES.familyPerson
    );
    expect(resolveSemanticEntity(homeOsEntity({ externalId: 'light.kitchen' })).roles).toContain(
      HOME_OS_ROLES.lightingLight
    );
    const tracker = resolveSemanticEntity(homeOsEntity({ externalId: 'device_tracker.phone' }));
    expect(tracker.roles).toContain(HOME_OS_ROLES.familyTracker);
    expect(tracker.roles).not.toContain(HOME_OS_ROLES.familyPerson);
  });

  it('does not classify an ordinary switch as lighting', () => {
    const result = resolveSemanticEntity(homeOsEntity({ externalId: 'switch.coffee_machine' }));
    expect(result.roles).toEqual([HOME_OS_ROLES.deviceSwitch]);
  });

  it('gives manual mappings priority and recovers them by stable unique id', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'switch.old_lamp',
      stableRef: { providerId: 'home_assistant', uniqueId: 'stable-lamp' },
      semanticRoles: [HOME_OS_ROLES.lightingSwitch],
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const result = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'switch.renamed_lamp',
        attributes: { uniqueId: 'stable-lamp' },
      }),
      [mapping]
    );
    expect(result.roles).toEqual([HOME_OS_ROLES.lightingSwitch]);
    expect(result.source).toBe('manual');
    expect(result.needsReview).toBe(false);
  });

  it('uses PVE device context before temperature semantics', () => {
    const result = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.1_node_pve_cpu_temperature',
        name: 'CPU Temperature',
        attributes: {
          integration: 'proxmoxve',
          deviceClass: 'temperature',
          unit: '°C',
          deviceName: 'PVE node',
        },
      })
    );
    expect(result.roles).toEqual([HOME_OS_ROLES.homelabPveTemperature]);
    expect(result.roles).not.toContain(HOME_OS_ROLES.environmentTemperature);
    expect(result.needsReview).toBe(false);
  });

  it('keeps room temperature environmental and freezer temperature appliance-internal', () => {
    const room = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.living_room_temperature',
        name: 'Living room temperature',
        attributes: { deviceClass: 'temperature', unit: '°C' },
      })
    );
    const freezer = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.freezer_temperature',
        name: 'Freezer temperature',
        attributes: { deviceClass: 'temperature', unit: '°C' },
      })
    );
    expect(room.roles).toContain(HOME_OS_ROLES.environmentTemperature);
    expect(freezer.roles).toContain(HOME_OS_ROLES.applianceInternalTemperature);
    expect(freezer.roles).not.toContain(HOME_OS_ROLES.environmentTemperature);
  });

  it('classifies backup diagnostics without adding review noise', () => {
    const backup = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.backup_last_success',
        attributes: { entityCategory: 'diagnostic' },
      })
    );
    expect(backup.needsReview).toBe(false);
    expect(backup.reviewDisposition).toBe('diagnostic');
  });

  it('resolves a realistic 584-entity installation without turning trackers into review noise', () => {
    const entities = Array.from({ length: 584 }, (_, index) =>
      homeOsEntity({
        externalId: `device_tracker.family_phone_${index}`,
        name: `Family phone ${index}`,
        primaryState: index % 3 === 0 ? 'home' : 'not_home',
      })
    );
    const result = resolveSemanticEntities(entities);
    expect(result).toHaveLength(584);
    expect(result.every((item) => item.roles.includes(HOME_OS_ROLES.familyTracker))).toBe(true);
    expect(result.filter((item) => item.needsReview)).toHaveLength(0);
  });
});
