import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import { migrateHomeOsConfig } from './migrations';
import type { HomeOsConfig } from './schema';

const ENDPOINT = '/__home_os__/config';

type ConfigEnvelope = { config: unknown; recovered?: boolean };

async function request(method: 'GET' | 'PUT' | 'DELETE', config?: HomeOsConfig) {
  const response = await fetch(resolveAddonLocalEndpointUrl(ENDPOINT), {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: config
      ? { 'Content-Type': 'application/json', 'X-Home-OS-Revision': String(config.revision) }
      : undefined,
    body: config ? JSON.stringify(config) : undefined,
  });
  if (!response.ok) {
    const conflict = response.status === 409 ? ' Configuration changed on another client.' : '';
    throw new Error(`Home OS configuration request failed (${response.status}).${conflict}`);
  }
  const envelope = (await response.json()) as ConfigEnvelope;
  return { config: migrateHomeOsConfig(envelope.config), recovered: envelope.recovered === true };
}

export const homeOsConfigStorage = {
  load: () => request('GET'),
  save: (config: HomeOsConfig) => request('PUT', config),
  reset: () => request('DELETE'),
};
