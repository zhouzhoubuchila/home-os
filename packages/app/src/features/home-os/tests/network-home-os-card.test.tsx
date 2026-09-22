import type { ResolvedHomeOsFunctionalDevice } from '@navet/app/features/home-os/adapters/functional-device-adapter';
import { NetworkHomeOsCard } from '@navet/app/features/home-os/components/cards/network-home-os-card';
import { HOME_OS_ROLES, type SemanticRole } from '@navet/app/features/home-os/core/semantic-roles';
import type { ResolvedSemanticEntity } from '@navet/app/features/home-os/core/types';
import { homeOsEntity } from '@navet/app/features/home-os/tests/fixtures';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function resolved(externalId: string, role: SemanticRole, value: string | number, unit?: string) {
  return {
    entity: homeOsEntity({ externalId, primaryState: value, attributes: unit ? { unit } : {} }),
    candidates: [],
    roles: [role],
    confidence: 1,
    reasons: ['test'],
    source: 'manual',
    displayName: externalId,
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  } satisfies ResolvedSemanticEntity;
}

const download = resolved(
  'sensor.router_download',
  HOME_OS_ROLES.networkRouterDownload,
  86.4,
  'Mbps'
);
const upload = resolved('sensor.router_upload', HOME_OS_ROLES.networkRouterUpload, 12.7, 'Mbps');
const clients = resolved('sensor.router_clients', HOME_OS_ROLES.networkRouterClients, 26);
const latency = resolved('sensor.internet_ping', HOME_OS_ROLES.networkInternetLatency, 28, 'ms');
const online = resolved('binary_sensor.router_online', HOME_OS_ROLES.networkRouterOnline, 'on');

const router: ResolvedHomeOsFunctionalDevice = {
  id: 'router:main',
  kind: 'router',
  name: 'Main Router',
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
  stateEntityId: online.entity.externalId,
  stateEntity: online,
  controlEntities: {},
  metricEntities: { download, upload, clients },
  entities: [online, download, upload, clients],
  missingEntityIds: [],
};

describe('Network Home OS tech monitor card', () => {
  it('renders real router rates and device count with the network atmosphere', () => {
    const { container } = renderWithProviders(
      <NetworkHomeOsCard size="large" kind="router" device={router} />
    );

    expect(container.querySelector('[data-tech-monitor="network"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tech-monitor-atmosphere="network"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tech-monitor-primary="download"]')).toHaveTextContent(
      '86.4 Mbps'
    );
    expect(container.querySelector('[data-tech-monitor-metric="clients"]')).toHaveTextContent('26');
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('keeps tiny cards quiet and shows ping when that is the only live signal', () => {
    const { container } = renderWithProviders(
      <NetworkHomeOsCard size="tiny" kind="internet" entities={[latency]} />
    );

    expect(container.querySelector('[data-tech-monitor-atmosphere="network"]')).toBeNull();
    expect(container.querySelector('[data-tech-monitor-primary="network"]')).toHaveTextContent(
      '28 ms'
    );
  });

  it('labels cumulative transfer values instead of implying a live rate', () => {
    const totalDownload = resolved(
      'sensor.router_download_total',
      HOME_OS_ROLES.networkRouterDownload,
      399.8,
      'GB'
    );
    const { container } = renderWithProviders(
      <NetworkHomeOsCard size="medium" kind="router" entities={[totalDownload]} />
    );

    expect(container.querySelector('[data-tech-monitor-primary="download"]')).toHaveTextContent(
      '399.8 GB'
    );
    expect(container.textContent).toContain('Download total');
  });
});
