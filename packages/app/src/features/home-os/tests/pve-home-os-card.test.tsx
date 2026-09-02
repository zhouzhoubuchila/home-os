import { PveHomeOsCard } from '@navet/app/features/home-os/components/cards/pve-home-os-card';
import type { HomeOsPhysicalDevice } from '@navet/app/features/home-os/core/types';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const device: HomeOsPhysicalDevice = {
  id: 'pve:home_assistant:pve-node',
  name: 'pve-node',
  category: 'homelab',
  room: 'Rack',
  state: 'online',
  freshness: 'fresh',
  health: 'normal',
  capabilities: [],
  entityIds: ['sensor.pve_cpu', 'sensor.pve_memory'],
  semanticMetrics: {
    'homelab.pve.cpu_usage': {
      role: 'homelab.pve.cpu_usage',
      value: 18,
      unit: '%',
      stale: false,
      available: true,
      sourceEntityId: 'sensor.pve_cpu',
    },
    'homelab.pve.memory_usage': {
      role: 'homelab.pve.memory_usage',
      value: 46,
      unit: '%',
      stale: false,
      available: true,
      sourceEntityId: 'sensor.pve_memory',
    },
  },
};

describe('PVE Home OS native monitoring recipe', () => {
  it.each(['small', 'medium', 'large'] as const)(
    'renders live PVE data with the UPS recipe at %s size',
    (size) => {
      const { container } = renderWithProviders(
        <PveHomeOsCard size={size} devices={[device]} isEditMode={false} />
      );

      expect(container.querySelector('[data-home-os-pve-recipe="ups"]')).toBeInTheDocument();
      expect(screen.getByText('pve-node')).toBeInTheDocument();
      expect(screen.getByText('18 %')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    }
  );
});
