import homeOsStore from '@docker/njs/home-os-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { homeOsConfigStorage } from '../config/storage';

afterEach(() => {
  homeOsStore.resetHomeOsStoreForTests();
  vi.restoreAllMocks();
});

describe('Home OS durable configuration', () => {
  it('recovers a valid backup when the primary document is invalid', () => {
    const backup = {
      schemaVersion: 2,
      revision: 4,
      updatedAt: '2026-09-01T00:00:00.000Z',
      mappings: [],
      physicalDevices: [],
      alertRules: [],
      cardPreferences: {},
    };
    homeOsStore.setHomeOsStoreFsForTests({
      statSync: (path: string) => ({ size: path.includes('backup') ? 100 : 5 }),
      readFileSync: (path: string) => (path.includes('backup') ? JSON.stringify(backup) : '{bad'),
    });
    homeOsStore.setHomeOsStorePrincipalResolverForTests(() => ({ providerId: 'home_assistant' }));
    const response = { status: 0, body: '', headersOut: {} as Record<string, string> };
    homeOsStore.handle({
      method: 'GET',
      headersIn: {},
      headersOut: response.headersOut,
      return: (status: number, body: string) => {
        response.status = status;
        response.body = body;
      },
    });
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ recovered: true, config: { revision: 4 } });
  });

  it('uses same-origin requests and sends the current revision when saving', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          config: {
            schemaVersion: 2,
            revision: 2,
            updatedAt: '2026-09-01T00:00:00.000Z',
            mappings: [],
            physicalDevices: [],
            alertRules: [],
            cardPreferences: {},
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    await homeOsConfigStorage.save({
      schemaVersion: 2,
      revision: 1,
      updatedAt: '2026-09-01T00:00:00.000Z',
      mappings: [],
      physicalDevices: [],
      alertRules: [],
      cardPreferences: {},
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/__home_os__/config'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'same-origin',
        headers: expect.objectContaining({ 'X-Home-OS-Revision': '1' }),
      })
    );
  });

  it('sends the current revision when resetting', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          config: {
            schemaVersion: 2,
            revision: 4,
            updatedAt: '2026-09-01T00:00:00.000Z',
            mappings: [],
            physicalDevices: [],
            alertRules: [],
            cardPreferences: {},
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    await homeOsConfigStorage.reset(3);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/__home_os__/config'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-Home-OS-Revision': '3' }),
      })
    );
  });
});
