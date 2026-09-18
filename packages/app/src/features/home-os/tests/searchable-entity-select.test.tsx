import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SearchableEntitySelect } from '../components/mapping/searchable-entity-select';
import type { SemanticRole } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';
import { homeOsEntity } from './fixtures';

function resolved(
  externalId: string,
  displayName: string,
  room: string,
  attributes: Record<string, unknown> = {},
  roles: SemanticRole[] = []
): ResolvedSemanticEntity {
  return {
    entity: homeOsEntity({ externalId, name: displayName, room, attributes }),
    candidates: [],
    roles,
    confidence: 1,
    reasons: [],
    source: 'name_heuristic',
    displayName,
    room,
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  };
}

const entities = [
  resolved(
    'sensor.1_node_pve_cpu_usage',
    'CPU 使用率',
    '书房',
    { deviceName: '1. Node: pve', integration: 'proxmox_sensor' },
    ['homelab.pve.cpu_usage']
  ),
  resolved('sensor.living_room_temperature', '客厅温度', '客厅'),
  resolved('sensor.study_humidity', '书房湿度', '书房'),
];

const labels = {
  searchPlaceholder: '搜索实体',
  selectedGroupLabel: '已选择实体',
  otherGroupLabel: '其他实体',
  clearLabel: '清空选择',
  noResultsLabel: '没有匹配的实体',
};

function Harness({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <SearchableEntitySelect
      id="entity-select"
      ariaLabel="状态实体"
      entities={entities}
      initialEntityIds={['sensor.study_humidity', 'sensor.1_node_pve_cpu_usage']}
      value={value}
      onChange={setValue}
      emptyLabel="—"
      {...labels}
    />
  );
}

function search(query: string) {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: '状态实体' }));
  fireEvent.change(screen.getByRole('searchbox', { name: '搜索实体' }), {
    target: { value: query },
  });
}

describe('SearchableEntitySelect', () => {
  it.each([
    ['display name', '客厅温度', 'sensor.living_room_temperature'],
    ['entity ID', 'living_room', 'sensor.living_room_temperature'],
    ['room', '客厅', 'sensor.living_room_temperature'],
    ['registry device', 'Node: pve', 'sensor.1_node_pve_cpu_usage'],
    ['integration', 'proxmox_sensor', 'sensor.1_node_pve_cpu_usage'],
    ['semantic role', 'cpu_usage', 'sensor.1_node_pve_cpu_usage'],
  ])('searches by %s', (_field, query, expectedId) => {
    search(query);
    expect(screen.getByText(expectedId)).toBeInTheDocument();
  });

  it('keeps initial entities in the selected group before other results', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '状态实体' }));

    const listbox = screen.getByRole('listbox', { name: '状态实体' });
    expect(listbox).toHaveTextContent('已选择实体');
    expect(listbox).toHaveTextContent('sensor.study_humidity');
    expect(listbox).not.toHaveTextContent('其他实体');
    expect(listbox).not.toHaveTextContent('sensor.living_room_temperature');

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索实体' }), {
      target: { value: '客厅' },
    });
    expect(listbox).toHaveTextContent('其他实体');
    expect(listbox).toHaveTextContent('sensor.living_room_temperature');
  });

  it('can clear the selected value', () => {
    render(<Harness initialValue="sensor.1_node_pve_cpu_usage" />);
    expect(screen.getByRole('button', { name: '状态实体' })).toHaveTextContent('CPU 使用率');

    fireEvent.click(screen.getByRole('button', { name: '清空选择: 状态实体' }));

    expect(screen.getByRole('button', { name: '状态实体' })).toHaveTextContent('—');
  });

  it('shows a saved value again and allows selecting it', () => {
    render(<Harness initialValue="sensor.1_node_pve_cpu_usage" />);
    const trigger = screen.getByRole('button', { name: '状态实体' });
    expect(trigger).toHaveTextContent('CPU 使用率');
    expect(trigger).toHaveTextContent('sensor.1_node_pve_cpu_usage');

    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索实体' }), {
      target: { value: '客厅' },
    });
    fireEvent.click(
      within(screen.getByRole('listbox', { name: '状态实体' })).getByRole('option', {
        name: /客厅温度/,
      })
    );
    expect(trigger).toHaveTextContent('客厅温度');
  });
});
