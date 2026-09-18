import { describe, expect, it } from 'vitest';
import {
  createFunctionalDeviceEditorDraft,
  inferFunctionalDeviceKind,
  normalizeFunctionalDeviceRoom,
} from '../components/mapping/functional-device-editor-model';
import type { SemanticRole } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';
import { homeOsEntity } from './fixtures';

function resolved(
  externalId: string,
  displayName: string,
  role: SemanticRole,
  attributes: Record<string, unknown> = {}
): ResolvedSemanticEntity {
  return {
    entity: homeOsEntity({ externalId, name: displayName, room: 'Unassigned', attributes }),
    candidates: [],
    roles: [role],
    confidence: 0.99,
    reasons: [],
    source: 'integration',
    displayName,
    room: 'Unassigned',
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  };
}

const pveAttributes = {
  deviceId: 'pve-node-1',
  deviceName: '1. Node: pve',
  integration: 'proxmox_sensor',
};

const pveEntities = [
  resolved('sensor.1_node_pve_node_status', '节点状态', 'homelab.pve.status', pveAttributes),
  resolved('sensor.1_node_pve_cpu_usage', 'CPU 使用率', 'homelab.pve.cpu_usage', pveAttributes),
  resolved(
    'sensor.1_node_pve_cpu_temperature',
    'CPU 温度',
    'homelab.pve.temperature',
    pveAttributes
  ),
  resolved(
    'sensor.1_node_pve_memory_usage',
    '内存使用率',
    'homelab.pve.memory_usage',
    pveAttributes
  ),
  resolved(
    'sensor.1_node_pve_root_filesystem_usage',
    '根文件系统使用率',
    'homelab.pve.storage_usage',
    pveAttributes
  ),
  resolved('sensor.1_node_pve_uptime', '运行时间', 'homelab.pve.uptime', pveAttributes),
];

describe('functional device editor model', () => {
  it('infers a PVE device and uniquely fills its metrics and state entity', () => {
    const initialEntityIds = pveEntities.map((item) => item.entity.externalId);
    const draft = createFunctionalDeviceEditorDraft(undefined, pveEntities, initialEntityIds);

    expect(inferFunctionalDeviceKind(pveEntities)).toBe('pve');
    expect(draft).toMatchObject({
      kind: 'pve',
      name: 'PVE',
      room: '',
      stateEntityId: 'sensor.1_node_pve_node_status',
      metrics: {
        online: 'sensor.1_node_pve_node_status',
        cpu: 'sensor.1_node_pve_cpu_usage',
        temperature: 'sensor.1_node_pve_cpu_temperature',
        memory: 'sensor.1_node_pve_memory_usage',
        storage: 'sensor.1_node_pve_root_filesystem_usage',
        uptime: 'sensor.1_node_pve_uptime',
      },
    });
  });

  it('leaves a metric empty when multiple preferred candidates match', () => {
    const duplicateCpu = resolved(
      'sensor.1_node_pve_cpu_usage_2',
      'CPU 使用率 2',
      'homelab.pve.cpu_usage',
      pveAttributes
    );
    const entities = [...pveEntities, duplicateCpu];
    const draft = createFunctionalDeviceEditorDraft(
      undefined,
      entities,
      entities.map((item) => item.entity.externalId)
    );

    expect(draft.kind).toBe('pve');
    expect(draft.metrics.cpu).toBeUndefined();
  });

  it('does not combine PVE entities from different Registry devices', () => {
    const otherNode = resolved('sensor.second_pve_cpu', 'Second PVE CPU', 'homelab.pve.cpu_usage', {
      ...pveAttributes,
      deviceId: 'pve-node-2',
      deviceName: '2. Node: pve-2',
    });

    expect(inferFunctionalDeviceKind([...pveEntities.slice(1, 2), otherNode])).toBe('other');
  });

  it('keeps every existing device choice ahead of automatic inference', () => {
    const existing: HomeOsFunctionalDevice = {
      id: 'manual-device',
      kind: 'server',
      name: 'My server',
      room: 'Lab',
      stateEntityId: 'binary_sensor.manual_online',
      controls: { trigger: 'button.manual' },
      metrics: { cpu: 'sensor.manual_cpu' },
      sourceEntityIds: ['sensor.manual_cpu'],
    };

    expect(
      createFunctionalDeviceEditorDraft(
        existing,
        pveEntities,
        pveEntities.map((item) => item.entity.externalId)
      )
    ).toEqual({
      name: 'My server',
      room: 'Lab',
      kind: 'server',
      stateEntityId: 'binary_sensor.manual_online',
      turnOnEntityId: '',
      turnOffEntityId: '',
      toggleEntityId: '',
      triggerEntityId: 'button.manual',
      metrics: { cpu: 'sensor.manual_cpu' },
    });
  });

  it('normalizes unassigned room placeholders', () => {
    expect(normalizeFunctionalDeviceRoom('Unassigned')).toBe('');
    expect(normalizeFunctionalDeviceRoom('未分配房间')).toBe('');
    expect(normalizeFunctionalDeviceRoom('书房')).toBe('书房');
  });
});
