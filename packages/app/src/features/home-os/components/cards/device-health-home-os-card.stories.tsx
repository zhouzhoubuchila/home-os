import { getCardSizeOverlayStyle } from '@navet/app/components/shared/card-size';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { HOME_OS_ROLES } from '../../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../../core/types';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { buildHomeOsProductProjection } from '../../projection/product-path-projection';
import { homeOsEntity } from '../../tests/fixtures';
import { REAL_HOME_FIXTURE } from '../../tests/fixtures/real-home';
import { DeviceHealthHomeOsCard } from './device-health-home-os-card';
import { HomeAssistantHomeOsCard } from './home-assistant-home-os-card';
import { NetworkHomeOsCard } from './network-home-os-card';
import { PveHomeOsCard } from './pve-home-os-card';

function entry(
  id: string,
  deviceId: string,
  availability: 'available' | 'unavailable' | 'unknown' = 'available',
  battery?: number
): ResolvedSemanticEntity[] {
  const base = (
    externalId: string,
    value: string | number,
    deviceClass?: string
  ): ResolvedSemanticEntity => ({
    entity: homeOsEntity({
      externalId,
      name: deviceId,
      availability,
      primaryState: value,
      room: 'Living room',
      attributes: { deviceId, deviceName: deviceId, deviceClass },
    }),
    candidates: [],
    roles: [],
    confidence: 1,
    reasons: [],
    source: 'manual',
    displayName: deviceId,
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  });
  return [
    base(id, 'on'),
    ...(battery === undefined ? [] : [base(`sensor.${deviceId}_battery`, battery, 'battery')]),
  ];
}

const healthy = [
  entry('light.living_room', 'Living room lights'),
  entry('climate.bedroom', 'Bedroom thermostat'),
  entry('vacuum.robot', 'Robot vacuum'),
].flat();
const attention = [
  ...healthy,
  ...entry('binary_sensor.entry', 'Entry sensor', 'available', 18),
  ...entry('switch.water_heater', 'Water heater', 'unavailable'),
];
const critical = [...attention, ...entry('sensor.door_contact', 'Door contact', 'available', 5)];
const mixed = [...critical, ...entry('media_player.tv', 'Living room TV', 'unknown')];

function Preview({
  size,
  theme,
  scenario,
}: {
  size: CardSize;
  theme: ThemeMode;
  scenario: 'allHealthy' | 'attention' | 'critical' | 'mixed' | 'offline' | 'sparse';
}) {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(theme);
    return () => useThemeStore.getState().setTheme(previous);
  }, [theme]);
  const data = {
    allHealthy: healthy,
    attention,
    critical,
    mixed,
    offline: mixed,
    sparse: entry('light.study', 'Study light'),
  }[scenario];
  return (
    <main className="p-4">
      <div style={getCardSizeOverlayStyle(size, 12)}>
        <DeviceHealthHomeOsCard
          size={size}
          entities={data}
          providerConnected={scenario !== 'offline'}
        />
      </div>
    </main>
  );
}

function Comparison() {
  return (
    <main className="flex gap-4 p-4">
      {(['allHealthy', 'attention', 'critical', 'mixed'] as const).map((scenario) => (
        <div key={scenario} style={getCardSizeOverlayStyle('medium', 12)}>
          <DeviceHealthHomeOsCard
            size="medium"
            entities={{ allHealthy: healthy, attention, critical, mixed }[scenario]}
            providerConnected
          />
        </div>
      ))}
    </main>
  );
}

const pveDevices = buildHomeOsProductProjection({
  entities: resolveSemanticEntities(REAL_HOME_FIXTURE),
}).pveDevices;
const router = entry('binary_sensor.router_online', 'Main router').map((item) => ({
  ...item,
  roles: [HOME_OS_ROLES.networkRouterOnline],
}));

function LunarSeriesComparison() {
  return (
    <main className="flex gap-4 p-4">
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <PveHomeOsCard size="medium" devices={pveDevices} isEditMode={false} />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <HomeAssistantHomeOsCard
          size="medium"
          entities={[]}
          connected
          config={{ version: '2026.8.3', state: 'RUNNING' }}
        />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <NetworkHomeOsCard size="medium" kind="router" entities={router} title="Main Router" />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <DeviceHealthHomeOsCard size="medium" entities={attention} providerConnected />
      </div>
    </main>
  );
}

const meta = {
  title: 'Cards/Home OS/Device Health',
  component: Preview,
  parameters: { layout: 'fullscreen' },
  args: { size: 'medium', theme: 'dark', scenario: 'attention' },
} satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AllHealthy: Story = { args: { scenario: 'allHealthy' } };
export const Attention: Story = { args: { scenario: 'attention' } };
export const Critical: Story = { args: { scenario: 'critical' } };
export const Mixed: Story = { args: { scenario: 'mixed' } };
export const ProviderOffline: Story = { args: { scenario: 'offline' } };
export const Sparse: Story = { args: { scenario: 'sparse' } };
export const Tiny: Story = { args: { size: 'tiny' } };
export const ExtraSmall: Story = { args: { size: 'extra-small' } };
export const Small: Story = { args: { size: 'small' } };
export const Medium: Story = { args: { size: 'medium' } };
export const Large: Story = { args: { size: 'large' } };
export const Light: Story = { args: { theme: 'light' } };
export const HealthComparison: Story = { render: () => <Comparison /> };
export const PveHomeAssistantNetworkDeviceHealth: Story = {
  render: () => <LunarSeriesComparison />,
};
