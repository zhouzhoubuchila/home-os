import { getCardSizeOverlayStyle } from '@navet/app/components/shared/card-size';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import { HOME_OS_ROLES, type SemanticRole } from '../../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../../core/types';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { buildHomeOsProductProjection } from '../../projection/product-path-projection';
import { homeOsEntity } from '../../tests/fixtures';
import { REAL_HOME_FIXTURE } from '../../tests/fixtures/real-home';
import { HomeAssistantHomeOsCard } from './home-assistant-home-os-card';
import { NetworkHomeOsCard } from './network-home-os-card';
import { PveHomeOsCard } from './pve-home-os-card';

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
const sparse = resolveSemanticEntities([host('sensor.home_assistant_online', 'online')]);
const full = resolveSemanticEntities([
  host('sensor.home_assistant_online', 'online'),
  host('sensor.home_assistant_cpu_usage', 12, '%'),
  host('sensor.home_assistant_memory_usage', 38, '%'),
  host('sensor.home_assistant_disk_use', 17.2, '%'),
]);
const haConfig = { version: '2026.9.1', state: 'RUNNING' } as const;
const pveDevices = buildHomeOsProductProjection({
  entities: resolveSemanticEntities(REAL_HOME_FIXTURE),
}).pveDevices;

function resolved(
  id: string,
  role: SemanticRole,
  value: string | number,
  unit?: string
): ResolvedSemanticEntity {
  return {
    entity: homeOsEntity({ externalId: id, primaryState: value, attributes: unit ? { unit } : {} }),
    candidates: [],
    roles: [role],
    confidence: 1,
    reasons: ['story fixture'],
    source: 'manual',
    displayName: id,
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  };
}
const router = [
  resolved('binary_sensor.router_online', HOME_OS_ROLES.networkRouterOnline, 'on'),
  resolved('sensor.router_download', HOME_OS_ROLES.networkRouterDownload, 86.4, 'Mbps'),
  resolved('sensor.router_upload', HOME_OS_ROLES.networkRouterUpload, 12.7, 'Mbps'),
  resolved('sensor.router_clients', HOME_OS_ROLES.networkRouterClients, 26),
];
const internet = [
  resolved('binary_sensor.internet_online', HOME_OS_ROLES.networkInternetOnline, 'on'),
  resolved('sensor.internet_download', HOME_OS_ROLES.networkInternetDownload, 86.4, 'Mbps'),
  resolved('sensor.internet_upload', HOME_OS_ROLES.networkInternetUpload, 12.7, 'Mbps'),
  resolved('sensor.internet_latency', HOME_OS_ROLES.networkInternetLatency, 28, 'ms'),
];

function Preview({
  size,
  theme,
  data,
}: {
  size: CardSize;
  theme: ThemeMode;
  data: 'sparse' | 'full';
}) {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(theme);
    return () => useThemeStore.getState().setTheme(previous);
  }, [theme]);
  return (
    <main className="p-4">
      <div style={getCardSizeOverlayStyle(size, 12)}>
        <HomeAssistantHomeOsCard
          size={size}
          entities={data === 'full' ? full : sparse}
          connected
          config={haConfig}
        />
      </div>
    </main>
  );
}

function TechMonitorComparison() {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme('dark');
    return () => useThemeStore.getState().setTheme(previous);
  }, []);
  return (
    <main className="flex gap-4 p-4">
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <PveHomeOsCard size="medium" devices={pveDevices} isEditMode={false} />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <HomeAssistantHomeOsCard size="medium" entities={full} connected config={haConfig} />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <NetworkHomeOsCard size="medium" kind="router" entities={router} title="Main Router" />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <NetworkHomeOsCard size="medium" kind="internet" entities={internet} title="Internet" />
      </div>
    </main>
  );
}

const meta = {
  title: 'Cards/Home OS/Home Assistant Tech Monitor',
  component: Preview,
  parameters: { layout: 'fullscreen' },
  args: { size: 'medium', theme: 'dark', data: 'full' },
} satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;
const play: Story['play'] = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector('[data-tech-monitor="home-assistant"]')).not.toBeNull();
};

export const Tiny: Story = { args: { size: 'tiny', theme: 'dark', data: 'full' }, play };
export const ExtraSmall: Story = {
  args: { size: 'extra-small', theme: 'dark', data: 'full' },
  play,
};
export const Small: Story = { args: { size: 'small', theme: 'dark', data: 'full' }, play };
export const Medium: Story = { args: { size: 'medium', theme: 'dark', data: 'full' }, play };
export const Large: Story = { args: { size: 'large', theme: 'dark', data: 'full' }, play };
export const Light: Story = { args: { size: 'medium', theme: 'light', data: 'full' }, play };
export const SparseData: Story = { args: { size: 'medium', theme: 'dark', data: 'sparse' }, play };
export const FullData: Story = { args: { size: 'large', theme: 'dark', data: 'full' }, play };
export const PveHomeAssistantRouterInternet: Story = { render: () => <TechMonitorComparison /> };
