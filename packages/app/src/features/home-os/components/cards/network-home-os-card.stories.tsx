import { getCardSizeOverlayStyle } from '@navet/app/components/shared/card-size';
import type { ThemeMode } from '@navet/app/stores/theme-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import type { ResolvedHomeOsFunctionalDevice } from '../../adapters/functional-device-adapter';
import { HOME_OS_ROLES, type SemanticRole } from '../../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../../core/types';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { buildHomeOsProductProjection } from '../../projection/product-path-projection';
import { homeOsEntity } from '../../tests/fixtures';
import { REAL_HOME_FIXTURE } from '../../tests/fixtures/real-home';
import { type NetworkCardKind, NetworkHomeOsCard } from './network-home-os-card';
import { PveHomeOsCard } from './pve-home-os-card';

function resolved(externalId: string, role: SemanticRole, value: string | number, unit?: string) {
  return {
    entity: homeOsEntity({ externalId, primaryState: value, attributes: unit ? { unit } : {} }),
    candidates: [],
    roles: [role],
    confidence: 1,
    reasons: ['story fixture'],
    source: 'manual',
    displayName: externalId,
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  } satisfies ResolvedSemanticEntity;
}

const online = resolved('binary_sensor.router_online', HOME_OS_ROLES.networkRouterOnline, 'on');
const download = resolved(
  'sensor.router_download',
  HOME_OS_ROLES.networkRouterDownload,
  86.4,
  'Mbps'
);
const upload = resolved('sensor.router_upload', HOME_OS_ROLES.networkRouterUpload, 12.7, 'Mbps');
const clients = resolved('sensor.router_clients', HOME_OS_ROLES.networkRouterClients, 26);
const internetOnline = resolved(
  'binary_sensor.internet_online',
  HOME_OS_ROLES.networkInternetOnline,
  'on'
);
const latency = resolved('sensor.router_latency', HOME_OS_ROLES.networkInternetLatency, 28, 'ms');
const internetDownload = resolved(
  'sensor.internet_download',
  HOME_OS_ROLES.networkInternetDownload,
  86.4,
  'Mbps'
);
const internetUpload = resolved(
  'sensor.internet_upload',
  HOME_OS_ROLES.networkInternetUpload,
  12.7,
  'Mbps'
);
const packetLoss = resolved(
  'sensor.internet_loss',
  HOME_OS_ROLES.networkInternetPacketLoss,
  0.2,
  '%'
);
const jitter = resolved('sensor.internet_jitter', HOME_OS_ROLES.networkInternetJitter, 3.1, 'ms');
const internetEntities = [
  internetOnline,
  internetDownload,
  internetUpload,
  latency,
  packetLoss,
  jitter,
];
const pveDevices = buildHomeOsProductProjection({
  entities: resolveSemanticEntities(REAL_HOME_FIXTURE),
}).pveDevices;

const router: ResolvedHomeOsFunctionalDevice = {
  id: 'router:main',
  kind: 'router',
  name: 'Main Router',
  stateEntityId: online.entity.externalId,
  stateEntity: online,
  metrics: {
    download: download.entity.externalId,
    upload: upload.entity.externalId,
    clients: clients.entity.externalId,
  },
  sourceEntityIds: [
    online.entity.externalId,
    download.entity.externalId,
    upload.entity.externalId,
    clients.entity.externalId,
  ],
  controlEntities: {},
  metricEntities: { download, upload, clients },
  entities: [online, download, upload, clients],
  missingEntityIds: [],
};

function NetworkPreview({
  size,
  theme,
  kind = 'router',
}: {
  size: 'medium' | 'large';
  theme: ThemeMode;
  kind?: NetworkCardKind;
}) {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(theme);
    return () => useThemeStore.getState().setTheme(previous);
  }, [theme]);

  return (
    <main className="p-4">
      <div style={getCardSizeOverlayStyle(size, 12)}>
        <NetworkHomeOsCard
          size={size}
          kind={kind}
          device={kind === 'router' ? router : undefined}
          entities={kind === 'internet' ? internetEntities : undefined}
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
        <NetworkHomeOsCard size="medium" kind="router" device={router} />
      </div>
      <div style={getCardSizeOverlayStyle('medium', 12)}>
        <NetworkHomeOsCard size="medium" kind="internet" entities={internetEntities} />
      </div>
    </main>
  );
}

const meta = {
  title: 'Cards/Home OS/Network Tech Monitor',
  component: NetworkPreview,
  parameters: { layout: 'fullscreen' },
  args: { size: 'large', theme: 'dark', kind: 'router' },
} satisfies Meta<typeof NetworkPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const play: Story['play'] = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector('[data-tech-monitor="network"]')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-tech-monitor-status="online"]')).not.toBeNull();
};

export const Large: Story = { args: { size: 'large', theme: 'dark', kind: 'router' }, play };
export const Medium: Story = { args: { size: 'medium', theme: 'dark', kind: 'router' }, play };
export const Light: Story = { args: { size: 'large', theme: 'light', kind: 'router' }, play };
export const Internet: Story = { args: { size: 'large', theme: 'dark', kind: 'internet' }, play };
export const InternetMedium: Story = {
  args: { size: 'medium', theme: 'dark', kind: 'internet' },
  play,
};
export const PveRouterInternet: Story = { render: () => <TechMonitorComparison /> };
