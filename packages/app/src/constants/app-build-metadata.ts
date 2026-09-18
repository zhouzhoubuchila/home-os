import { APP_VERSION } from '@navet/app/constants/app-version';
import { DASHBOARD_CONFIG_VERSION } from '@navet/app/constants/dashboard-config-version';

declare const __APP_GIT_SHA__: string;
declare const __APP_BUILD_DATE__: string;
declare const __APP_RELEASE_CHANNEL__: string;
declare const __APP_BUILD_VERSION__: string;

export function resolveAppBuildMetadata(input: {
  gitSha?: string;
  buildDate?: string;
  releaseChannel?: string;
  buildVersion?: string;
}) {
  const gitSha = input.gitSha?.trim() || 'local';
  return {
    gitSha,
    gitShaShort: gitSha.slice(0, 7),
    buildDate: input.buildDate?.trim() || 'unknown',
    releaseChannel: input.releaseChannel?.trim() || 'development',
    buildVersion: input.buildVersion?.trim() || APP_VERSION,
    dashboardConfigVersion: DASHBOARD_CONFIG_VERSION,
  };
}

export const APP_BUILD_METADATA = Object.freeze(
  resolveAppBuildMetadata({
    gitSha: typeof __APP_GIT_SHA__ === 'string' ? __APP_GIT_SHA__ : undefined,
    buildDate: typeof __APP_BUILD_DATE__ === 'string' ? __APP_BUILD_DATE__ : undefined,
    releaseChannel:
      typeof __APP_RELEASE_CHANNEL__ === 'string' ? __APP_RELEASE_CHANNEL__ : undefined,
    buildVersion: typeof __APP_BUILD_VERSION__ === 'string' ? __APP_BUILD_VERSION__ : undefined,
  })
);

export function formatAppBuildDate(value = APP_BUILD_METADATA.buildDate) {
  const timestamp = Date.parse(value);
  return !value || value === 'unknown' || !Number.isFinite(timestamp) || timestamp === 0
    ? 'unknown'
    : value.slice(0, 10);
}

export function isAppPreV1(version = APP_VERSION) {
  const match = version.trim().match(/^(\d+)\./);
  return match ? Number(match[1]) < 1 : false;
}

export function getAppReleaseBadgeLabel(version = APP_VERSION) {
  switch (APP_BUILD_METADATA.releaseChannel) {
    case 'edge':
      return 'Edge';
    case 'beta':
      return 'Beta';
    default:
      if (version.includes('-beta') || version.includes('-rc') || isAppPreV1(version)) {
        return 'Beta';
      }

      return null;
  }
}

export function getAppBuildChannelLabel(version = APP_VERSION) {
  switch (APP_BUILD_METADATA.releaseChannel) {
    case 'edge':
      return 'Edge';
    case 'development':
    case 'dev':
      return 'Dev';
    case 'beta':
      return 'Beta';
    case 'stable':
      return 'Stable';
    default:
      if (version.includes('-beta') || version.includes('-rc') || isAppPreV1(version)) {
        return 'Beta';
      }

      return 'Stable';
  }
}

export function isDevOrLocalBuild(channel = APP_BUILD_METADATA.releaseChannel) {
  return ['development', 'dev', 'local'].includes(channel);
}
