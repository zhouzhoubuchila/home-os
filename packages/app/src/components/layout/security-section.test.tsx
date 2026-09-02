import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { createDefaultHomeOsConfig } from '@navet/app/features/home-os/config/schema';
import { useHomeOsConfigStore } from '@navet/app/features/home-os/stores/home-os-config-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceCollection } from '@navet/app/types/device.types';
import type { NavetEntity } from '@navet/core/types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecuritySection } from './security-section';

const securityDashboardMock = vi.fn();
const addEntityDialogMock = vi.fn();

const devicesFixture: DeviceCollection = {
  lights: [],
  fans: [],
  hvac: [],
  climate: [],
  media: [],
  weather: [],
  switches: [],
  helpers: [
    {
      id: 'button.panic',
      name: 'Panic Button',
      room: 'Hall',
      size: 'small',
      state: false,
      serviceDomain: 'button',
      serviceAction: 'press',
      securityKind: 'button',
      securitySeverity: 'normal',
    },
  ],
  covers: [
    {
      id: 'cover.entry_shutter',
      name: 'Entry Shutter',
      room: 'Entrance',
      size: 'medium',
      position: 0,
      hasPosition: true,
    },
  ],
  locks: [
    {
      id: 'lock.front',
      name: 'Front Door',
      room: 'Entrance',
      size: 'small',
      state: false,
      securityKind: 'lock',
      securitySeverity: 'warning',
    },
  ],
  scenes: [],
  persons: [],
  sensors: [
    {
      id: 'binary_sensor.garage_motion',
      name: 'Garage Motion',
      room: 'Garage',
      size: 'small',
      value: 'Motion detected',
      unit: '',
      status: 'active',
      securityKind: 'motion',
      securitySeverity: 'active',
      underlyingDeviceId: 'device.garage_camera',
    },
    {
      id: 'binary_sensor.garage_human_motion',
      name: 'Garage Object Analytics Human',
      room: 'Garage',
      size: 'small',
      value: 'Unavailable',
      unit: '',
      status: 'unavailable',
      securityKind: 'motion',
      securitySeverity: 'unknown',
      underlyingDeviceId: 'device.garage_camera',
    },
    {
      id: 'binary_sensor.smoke',
      name: 'Kitchen Smoke',
      room: 'Kitchen',
      size: 'small',
      value: 'Smoke detected',
      unit: '',
      status: 'active',
      securityKind: 'smoke',
      securitySeverity: 'critical',
    },
  ],
  vacuums: [],
  calendars: [],
  cameras: [
    {
      id: 'camera.garage',
      name: 'Garage Camera',
      room: 'Garage',
      size: 'medium',
      underlyingDeviceId: 'device.garage_camera',
      sourceDeviceId: 'device-garage-camera',
      state: 'idle',
      supportedFeatures: 0,
      isStreamCapable: true,
      isStillImageOnly: false,
      securityKind: 'camera',
      securitySeverity: 'normal',
    },
    {
      id: 'camera.garage_2',
      name: 'Garage Camera',
      room: 'Garage',
      size: 'medium',
      underlyingDeviceId: 'device.garage_camera',
      sourceDeviceId: 'device-garage-camera',
      state: 'idle',
      supportedFeatures: 2,
      isStreamCapable: true,
      isStillImageOnly: false,
      securityKind: 'camera',
      securitySeverity: 'normal',
    },
  ],
  'grouped-sensors': [],
};
let currentDevicesFixture: DeviceCollection = devicesFixture;

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<object>('@navet/app/hooks');
  return {
    ...actual,
    useDeviceCollectionsByKeys: () => currentDevicesFixture,
    useEditMode: () => ({
      isEditMode: true,
      toggleEditMode: vi.fn(),
    }),
    useCardState: () => ({
      cardSizes: {},
      updateCardSize: vi.fn(),
    }),
    useThemeMode: () => 'glass',
    useTheme: () => ({
      theme: 'glass',
      accentColor: '#f97316',
      primaryColor: '#f97316',
    }),
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@navet/app/features/security/components/security-camera-dashboard', () => ({
  SecurityCameraDashboard: (props: {
    model: { allEntities: Array<{ id: string }> };
    isEditMode: boolean;
    onToggleEditMode: () => void;
    onAddEntity?: () => void;
    alarms?: Array<{ id: string }>;
  }) => {
    securityDashboardMock(props);
    return (
      <div>
        <button type="button" onClick={props.onToggleEditMode}>
          {props.isEditMode ? 'dashboard.roomNav.doneEditing' : 'dashboard.roomNav.customize'}
        </button>
        {props.onAddEntity ? (
          <button type="button" onClick={props.onAddEntity}>
            dashboard.addEntity.title
          </button>
        ) : null}
        {props.alarms?.length ? (
          <div data-testid="security-alarm-panel">{props.alarms.length}</div>
        ) : null}
        <div data-testid="security-dashboard">{props.model.allEntities.length}</div>
      </div>
    );
  },
}));

vi.mock('@navet/app/features/security/hooks/use-security-alarm-entities', () => ({
  useSecurityAlarmEntities: () => [
    {
      id: 'home_assistant:alarm_control_panel.home',
      name: 'Home Alarm',
      state: 'disarmed',
      supportedActions: ['arm_away', 'disarm'],
      codeFormat: 'none',
      provider: 'home_assistant',
      availability: 'available',
    },
  ],
}));

vi.mock('@navet/app/features/dashboard/components/add-entity-dialog', () => ({
  AddEntityDialog: (props: { open: boolean; visibleEntityIds: string[] }) => {
    addEntityDialogMock(props);
    return props.open ? (
      <div data-testid="add-entity-dialog">{props.visibleEntityIds.join(',')}</div>
    ) : null;
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('SecuritySection', () => {
  beforeEach(() => {
    localStorage.clear();
    currentDevicesFixture = devicesFixture;
    securityDashboardMock.mockClear();
    addEntityDialogMock.mockClear();
    integrationStore.setState({ providerEntitiesByCanonicalId: {} });
    useHomeOsConfigStore.setState({ config: createDefaultHomeOsConfig(), loaded: true });
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: [],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });
  });

  it('applies semantic compatibility before rendering the actual security page model', () => {
    const entity = (externalId: string, name: string): NavetEntity => ({
      id: `home_assistant:${externalId}`,
      canonicalId: `home_assistant:${externalId}`,
      providerId: 'home_assistant' as const,
      externalId,
      type: externalId.startsWith('camera.') ? 'camera' : 'sensor',
      name,
      room: 'Home',
      primaryState: 'on',
      availability: 'available' as const,
      attributes: {},
      capabilities: [],
    });
    const fridge = entity('binary_sensor.fridge_door', 'Fridge door');
    const vacuum = entity('camera.vacuum_map', 'Vacuum map');
    const entrance = entity('camera.entrance', 'Entrance camera');
    integrationStore.setState({
      providerEntitiesByCanonicalId: {
        [fridge.canonicalId]: fridge,
        [vacuum.canonicalId]: vacuum,
        [entrance.canonicalId]: entrance,
      },
    });
    useHomeOsConfigStore.setState({
      config: {
        ...createDefaultHomeOsConfig(),
        mappings: [
          {
            schemaVersion: 2,
            entityId: fridge.externalId,
            semanticRoles: ['appliance.door'],
            source: 'manual',
            updatedAt: '2026-09-02T00:00:00.000Z',
          },
          {
            schemaVersion: 2,
            entityId: vacuum.externalId,
            semanticRoles: ['vacuum.map_camera'],
            source: 'manual',
            updatedAt: '2026-09-02T00:00:00.000Z',
          },
          {
            schemaVersion: 2,
            entityId: entrance.externalId,
            semanticRoles: ['security.camera'],
            source: 'manual',
            updatedAt: '2026-09-02T00:00:00.000Z',
          },
        ],
      },
    });
    currentDevicesFixture = {
      ...devicesFixture,
      sensors: [
        {
          id: fridge.externalId,
          canonicalId: fridge.canonicalId,
          name: fridge.name,
          room: 'Kitchen',
          size: 'small',
          value: 'Open',
          unit: '',
          status: 'active',
        },
      ],
      cameras: [
        {
          id: vacuum.externalId,
          canonicalId: vacuum.canonicalId,
          name: vacuum.name,
          room: 'Living room',
          size: 'medium',
          state: 'idle',
        },
        {
          id: entrance.externalId,
          canonicalId: entrance.canonicalId,
          name: entrance.name,
          room: 'Entrance',
          size: 'medium',
          state: 'streaming',
        },
      ],
    };

    renderWithProviders(<SecuritySection />);

    const renderedEntities = securityDashboardMock.mock.lastCall?.[0].model.allEntities;
    expect(renderedEntities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fridge.externalId }),
        expect.objectContaining({ id: vacuum.externalId }),
      ])
    );
    expect(renderedEntities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: entrance.externalId,
          projection: expect.objectContaining({ semanticSource: 'manual' }),
        }),
      ])
    );
  });

  it('passes only visible security entities into the dashboard summary', () => {
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: ['home_assistant:camera.garage'],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });

    renderWithProviders(<SecuritySection />);

    expect(screen.getByTestId('security-alarm-panel')).toHaveTextContent('1');
    expect(screen.getByTestId('security-dashboard')).toHaveTextContent('5');
    expect(securityDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          allEntities: expect.not.arrayContaining([
            expect.objectContaining({ id: 'camera.garage' }),
            expect.objectContaining({ id: 'camera.garage_2' }),
          ]),
        }),
      })
    );
    expect(securityDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          allEntities: expect.arrayContaining([
            expect.objectContaining({ id: 'binary_sensor.garage_motion' }),
            expect.objectContaining({ id: 'binary_sensor.garage_human_motion' }),
          ]),
        }),
      })
    );
  });

  it('passes alarm entities into the security dashboard when alarms exist', () => {
    renderWithProviders(<SecuritySection />);
    expect(screen.getByTestId('security-alarm-panel')).toHaveTextContent('1');
    expect(securityDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        alarms: [expect.objectContaining({ id: 'home_assistant:alarm_control_panel.home' })],
      })
    );
  });

  it('renders the dashboard grid for alarm-only security views', () => {
    currentDevicesFixture = {
      ...devicesFixture,
      helpers: [],
      covers: [],
      locks: [],
      sensors: [],
      cameras: [],
    };

    renderWithProviders(<SecuritySection />);

    expect(screen.getByTestId('security-dashboard')).toHaveTextContent('0');
    expect(screen.getByTestId('security-alarm-panel')).toHaveTextContent('1');
    expect(screen.queryByText('sections.security.emptyTitle')).not.toBeInTheDocument();
  });

  it('shows the section customize toggle so security cards can be resized', () => {
    renderWithProviders(<SecuritySection />);

    expect(
      screen.getByRole('button', { name: /dashboard.roomNav.doneEditing/i })
    ).toBeInTheDocument();
  });

  it('keeps the full hidden security set available in the add-entity dialog', async () => {
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: [
        'camera.garage',
        'binary_sensor.garage_motion',
        'button.panic',
        'cover.entry_shutter',
      ],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });

    renderWithProviders(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: /dashboard.addEntity.title/i }));

    expect(await screen.findByTestId('add-entity-dialog')).toHaveTextContent(
      'cover.entry_shutter,binary_sensor.garage_motion,camera.garage,camera.garage_2'
    );
    expect(addEntityDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleEntityIds: [
          'cover.entry_shutter',
          'binary_sensor.garage_motion',
          'camera.garage',
          'camera.garage_2',
        ],
      })
    );
  });

  it('does not consider fully hidden entities as part of the visible security overview', () => {
    useDashboardEntitiesStore.setState({
      hiddenEntityIds: [
        'camera.garage',
        'cover.entry_shutter',
        'lock.front',
        'binary_sensor.garage_motion',
        'binary_sensor.garage_human_motion',
        'binary_sensor.smoke',
        'home_assistant:alarm_control_panel.home',
      ],
      shownSensorEntityIds: [],
      lockedCardIds: [],
      onboardingCompleted: false,
    });

    renderWithProviders(<SecuritySection />);

    expect(screen.queryByTestId('security-dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('sections.security.emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('dashboard.addEntity.descriptionWithHidden')).toBeInTheDocument();
  });

  it('keeps available and unavailable camera motion sensors visible alongside their parent camera', () => {
    renderWithProviders(<SecuritySection />);

    expect(securityDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          allEntities: expect.arrayContaining([expect.objectContaining({ id: 'camera.garage' })]),
        }),
      })
    );
    expect(securityDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({
          allEntities: expect.arrayContaining([
            expect.objectContaining({
              id: 'binary_sensor.garage_motion',
              securityKind: 'motion',
            }),
            expect.objectContaining({
              id: 'binary_sensor.garage_human_motion',
              securityKind: 'motion',
              securitySeverity: 'unknown',
              status: 'unavailable',
            }),
          ]),
        }),
      })
    );
  });
});
