import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FunctionalDeviceEditorDialog } from '../components/mapping/functional-device-editor-dialog';
import type { ResolvedSemanticEntity } from '../core/types';
import { homeOsEntity } from './fixtures';

function pveEntity(
  externalId: string,
  displayName: string,
  role: string,
  state: string | number = 'on'
): ResolvedSemanticEntity {
  return {
    entity: homeOsEntity({
      externalId,
      name: displayName,
      room: 'Unassigned',
      primaryState: state,
      attributes: {
        deviceId: 'pve-node-1',
        deviceName: '1. Node: pve',
        integration: 'proxmox_sensor',
      },
    }),
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

const pveEntities = [
  pveEntity('sensor.pve_status', 'Node status', 'homelab.pve.status'),
  pveEntity('sensor.pve_cpu', 'CPU usage', 'homelab.pve.cpu_usage', 8.77),
  pveEntity('sensor.pve_temperature', 'CPU temperature', 'homelab.pve.temperature', 55),
  pveEntity('sensor.pve_memory', 'Memory usage', 'homelab.pve.memory_usage', 41.86),
  pveEntity('sensor.pve_storage', 'Storage usage', 'homelab.pve.storage_usage', 17.66),
  pveEntity('sensor.pve_uptime', 'Uptime', 'homelab.pve.uptime', '4d 16h'),
];

const initialEntityIds = pveEntities.map((item) => item.entity.externalId);

function editor(entities: readonly ResolvedSemanticEntity[], open = true) {
  return (
    <FunctionalDeviceEditorDialog
      open={open}
      entities={entities}
      initialEntityIds={initialEntityIds}
      saving={false}
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

describe('FunctionalDeviceEditorDialog', () => {
  it('keeps dirty fields when live entities refresh and reinitializes after reopening', () => {
    const { rerender } = renderWithProviders(editor(pveEntities));
    const kind = document.getElementById('functional-device-kind') as HTMLSelectElement;
    const name = document.getElementById('functional-device-name') as HTMLInputElement;
    const room = document.getElementById('functional-device-room') as HTMLInputElement;
    const cpu = document.getElementById('functional-device-metric-cpu') as HTMLButtonElement;

    expect(kind.value).toBe('pve');
    expect(name.value).toBe('PVE');
    expect(room.value).toBe('');
    expect(cpu).toHaveTextContent('sensor.pve_cpu');

    fireEvent.change(kind, { target: { value: 'router' } });
    fireEvent.change(name, { target: { value: 'Edited node' } });
    fireEvent.change(room, { target: { value: 'Lab' } });
    fireEvent.click(cpu);
    fireEvent.click(screen.getByRole('option', { name: /CPU temperature/ }));

    const refreshed = pveEntities.map((item) => ({
      ...item,
      entity: { ...item.entity, primaryState: 99 },
    }));
    rerender(editor(refreshed));

    expect(kind.value).toBe('router');
    expect(name.value).toBe('Edited node');
    expect(room.value).toBe('Lab');
    expect(document.getElementById('functional-device-metric-cpu')).toHaveTextContent(
      'sensor.pve_temperature'
    );

    rerender(editor(refreshed, false));
    rerender(editor(refreshed, true));
    expect((document.getElementById('functional-device-kind') as HTMLSelectElement).value).toBe(
      'pve'
    );
    expect((document.getElementById('functional-device-name') as HTMLInputElement).value).toBe(
      'PVE'
    );
  });

  it('hides controls for PVE and keeps the long form body scrollable with a fixed footer', () => {
    renderWithProviders(editor(pveEntities));

    const dialog = screen.getByRole('dialog');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(document.querySelector('[data-functional-device-scroll-region]')).toHaveClass(
      'overflow-y-auto',
      'min-h-0',
      'flex-1'
    );
    expect(document.querySelector('[data-functional-device-footer]')).toHaveClass('shrink-0');
    expect(dialog).toHaveClass('max-h-[90dvh]', 'overflow-hidden');

    fireEvent.click(document.getElementById('functional-device-state') as HTMLButtonElement);
    expect(dialog.contains(screen.getByRole('listbox'))).toBe(false);
  });
});
