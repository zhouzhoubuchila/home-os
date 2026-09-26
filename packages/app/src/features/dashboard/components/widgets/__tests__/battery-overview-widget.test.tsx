import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatteryOverviewWidget } from '../battery-overview-widget';

function entity(
  entityId: string,
  state: string,
  attributes: HassEntity['attributes'] = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    context: { id: 'context', parent_id: null, user_id: null },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
  };
}

const batteryEntities: HassEntities = {
  'sensor.phone_battery': entity('sensor.phone_battery', '82', {
    friendly_name: 'Phone Battery',
    device_class: 'battery',
  }),
};

const lunarEntities: HassEntities = Object.fromEntries(
  [5, 23, 90, 100, 100].map((level, index) => [
    `sensor.battery_${index}`,
    entity(`sensor.battery_${index}`, String(level), {
      friendly_name:
        index === 0 ? 'A very long hallway motion sensor battery name' : `Cell ${index}`,
      device_class: 'battery',
    }),
  ])
);

describe('BatteryOverviewWidget', () => {
  beforeEach(() => {
    homeAssistantStore.setState(homeAssistantStore.getInitialState(), true);
    useSettingsStore.setState({ disableAnimations: false, lowPowerMode: false });
  });

  it('shows a card empty state when no battery sensors are available', () => {
    renderWithProviders(<BatteryOverviewWidget onUpdate={vi.fn()} />);

    expect(screen.getByText('No battery sensors found')).toBeInTheDocument();
    expect(screen.getByText('No battery sensors available yet.')).toBeInTheDocument();
    expect(screen.queryByText('Widget')).not.toBeInTheDocument();
  });

  it('opens settings from the no-batteries empty state action', async () => {
    renderWithProviders(<BatteryOverviewWidget onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Battery settings' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('Battery settings').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('No battery sensors available yet.')).toBeInTheDocument();
  });

  it('shows a card empty state when all battery sensors are unselected', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: batteryEntities,
    });

    renderWithProviders(
      <BatteryOverviewWidget data={{ selectedEntityIds: [] }} onUpdate={vi.fn()} />
    );

    expect(screen.getByText('No batteries selected')).toBeInTheDocument();
    expect(
      screen.getByText('Choose which battery sensors to show on this card.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Phone Battery')).not.toBeInTheDocument();
  });

  it('keeps the mobile battery list in the whole-sheet scroll flow', async () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: batteryEntities,
    });

    renderWithProviders(<BatteryOverviewWidget isEditMode onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));

    const dialog = await screen.findByRole('dialog');
    const batteryList = within(dialog).getByRole('list');
    expect(batteryList).not.toHaveClass('max-h-72', 'overflow-y-auto');
    expect(batteryList).toHaveClass('sm:max-h-72', 'sm:overflow-y-auto');
  });

  it('defaults the Home Dashboard room to the Lunar variant', () => {
    renderWithProviders(<BatteryOverviewWidget room="__home__" onUpdate={vi.fn()} />);
    expect(document.querySelector('[data-battery-variant="lunar"]')).toBeInTheDocument();
  });

  it('keeps ordinary rooms on the default variant and respects an explicit override', () => {
    const ordinary = renderWithProviders(
      <BatteryOverviewWidget room="Living Room" onUpdate={vi.fn()} />
    );
    expect(
      ordinary.container.querySelector('[data-battery-variant="default"]')
    ).toBeInTheDocument();
    ordinary.unmount();

    const explicit = renderWithProviders(
      <BatteryOverviewWidget
        room="__home__"
        data={{ visualVariant: 'default' }}
        onUpdate={vi.fn()}
      />
    );
    expect(
      explicit.container.querySelector('[data-battery-variant="default"]')
    ).toBeInTheDocument();
    explicit.unmount();

    const forcedLunar = renderWithProviders(
      <BatteryOverviewWidget room="Living Room" data={{ visualVariant: 'lunar' }} />
    );
    expect(
      forcedLunar.container.querySelector('[data-battery-variant="lunar"]')
    ).toBeInTheDocument();
  });

  it('renders the Lunar summary and lowest rows without losing long names or 100%', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: lunarEntities,
    });
    const view = renderWithProviders(
      <BatteryOverviewWidget room="__home__" size="medium" onUpdate={vi.fn()} />
    );

    expect(view.container.querySelector('.battery-lunar-summary-count')).toHaveTextContent('5');
    expect(view.container.querySelector('.battery-lunar-summary-status')).toHaveTextContent(
      '2 low'
    );
    expect(view.container.querySelector('.battery-lunar-core')).toHaveAttribute(
      'aria-label',
      'Average battery 64%'
    );
    expect(view.container.querySelectorAll('.battery-lunar-row')).toHaveLength(5);
    expect(view.container.querySelector('.battery-lunar-row-name')).toHaveAttribute(
      'title',
      'A very long hallway motion sensor battery name'
    );
    expect(view.container.querySelector('.battery-lunar-row-value')).toHaveTextContent('5%');
    expect(view.container).toHaveTextContent('100%');
  });

  it('shows only the lowest row in small and retains all rows in large', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: lunarEntities,
    });
    const small = renderWithProviders(<BatteryOverviewWidget room="__home__" size="small" />);
    expect(small.container.querySelectorAll('.battery-lunar-row')).toHaveLength(1);
    small.unmount();
    const large = renderWithProviders(<BatteryOverviewWidget room="__home__" size="large" />);
    expect(large.container.querySelectorAll('.battery-lunar-row')).toHaveLength(5);
  });

  it('renders 0% and 100% without overflowing the percentage field', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: {
        'sensor.empty_battery': entity('sensor.empty_battery', '0', {
          friendly_name: 'A very long hallway motion sensor battery name',
          device_class: 'battery',
        }),
        'sensor.full_battery': entity('sensor.full_battery', '100', {
          friendly_name: 'Full',
          device_class: 'battery',
        }),
      },
    });
    const view = renderWithProviders(<BatteryOverviewWidget room="__home__" size="medium" />);
    expect(view.container.querySelector('.battery-lunar-row-value')).toHaveTextContent('0%');
    expect(view.container).toHaveTextContent('100%');
    expect(view.container.querySelector('.battery-lunar-row-name')).toHaveAttribute(
      'title',
      'A very long hallway motion sensor battery name'
    );
  });

  it('preserves the selected-entity filter in the Lunar variant', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: lunarEntities,
    });
    const view = renderWithProviders(
      <BatteryOverviewWidget room="__home__" data={{ selectedEntityIds: ['sensor.battery_1'] }} />
    );
    expect(view.container.querySelectorAll('.battery-lunar-row')).toHaveLength(1);
    expect(view.container).toHaveTextContent('23%');
  });

  it('keeps the Lunar no-selection state distinct from no available batteries', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: lunarEntities,
    });
    renderWithProviders(
      <BatteryOverviewWidget room="__home__" data={{ selectedEntityIds: [] }} onUpdate={vi.fn()} />
    );
    expect(screen.getByText('No batteries selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Battery settings' })).toBeInTheDocument();
  });

  it('retains list virtualization for many Lunar battery sensors', () => {
    const manyEntities = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `sensor.many_${index}`,
        entity(`sensor.many_${index}`, String(index + 40), {
          friendly_name: `Battery ${index}`,
          device_class: 'battery',
        }),
      ])
    );
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: manyEntities,
    });
    const view = renderWithProviders(<BatteryOverviewWidget room="__home__" size="large" />);
    expect(within(view.container).getByTestId('battery-list-virtualized')).toBeInTheDocument();
  });

  it('opens settings from a populated Lunar card and keeps the empty state actionable', async () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: lunarEntities,
    });
    const populated = renderWithProviders(
      <BatteryOverviewWidget room="__home__" onUpdate={vi.fn()} />
    );
    fireEvent.click(populated.container.querySelector('[data-battery-variant="lunar"]') as Element);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    populated.unmount();

    homeAssistantStore.setState(homeAssistantStore.getInitialState(), true);
    renderWithProviders(<BatteryOverviewWidget room="__home__" onUpdate={vi.fn()} />);
    expect(screen.getByText('No battery sensors found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Battery settings' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('turns Lunar motion off when animations are disabled and degrades on low power', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      entities: lunarEntities,
    });
    useSettingsStore.setState({ disableAnimations: true });
    const disabled = renderWithProviders(<BatteryOverviewWidget room="__home__" />);
    expect(disabled.container.querySelector('[data-battery-motion="off"]')).toBeInTheDocument();
    disabled.unmount();

    useSettingsStore.setState({ disableAnimations: false, lowPowerMode: true });
    const lowPower = renderWithProviders(<BatteryOverviewWidget room="__home__" />);
    expect(lowPower.container.querySelector('[data-battery-motion="low"]')).toBeInTheDocument();
  });
});
