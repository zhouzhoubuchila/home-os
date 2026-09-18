import {
  APP_BUILD_METADATA,
  formatAppBuildDate,
  getAppBuildChannelLabel,
  getAppReleaseBadgeLabel,
  isAppPreV1,
  isDevOrLocalBuild,
  resolveAppBuildMetadata,
} from '@navet/app/constants/app-build-metadata';
import { APP_VERSION } from '@navet/app/constants/app-version';
import { DASHBOARD_CONFIG_VERSION } from '@navet/app/constants/dashboard-config-version';
import { HOME_OS_VERSION } from '@navet/app/features/home-os/core/version';
import { describe, expect, it } from 'vitest';

describe('APP_BUILD_METADATA', () => {
  it('exposes the Home OS product version independently from Navet', () => {
    expect(HOME_OS_VERSION).toBe('2.0.4');
    expect(HOME_OS_VERSION).not.toBe(APP_VERSION);
  });

  it('exposes the injected build metadata constants', () => {
    expect(APP_BUILD_METADATA).toEqual({
      gitSha: 'test-sha',
      gitShaShort: 'test-sh',
      buildDate: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'development',
      buildVersion: APP_VERSION,
      dashboardConfigVersion: DASHBOARD_CONFIG_VERSION,
    });
  });

  it('treats pre-v1 builds as beta even on the development channel', () => {
    expect(getAppReleaseBadgeLabel()).toBe('Beta');
  });

  it('detects versions before 1.0.0 as beta lifecycle builds', () => {
    expect(isAppPreV1('0.6.1')).toBe(true);
    expect(isAppPreV1('0.9.0-rc.1')).toBe(true);
    expect(isAppPreV1('1.0.0')).toBe(false);
    expect(isAppPreV1('1.2.3-beta.1')).toBe(false);
  });

  it('maps development-style channels to the dev build label', () => {
    expect(getAppBuildChannelLabel()).toBe('Dev');
  });

  it('keeps the development build label when the injected release channel is development', () => {
    expect(getAppBuildChannelLabel('1.0.0')).toBe('Dev');
  });

  it('exposes local habits only for development and local builds', () => {
    expect(isDevOrLocalBuild('development')).toBe(true);
    expect(isDevOrLocalBuild('dev')).toBe(true);
    expect(isDevOrLocalBuild('local')).toBe(true);
    expect(isDevOrLocalBuild('beta')).toBe(false);
    expect(isDevOrLocalBuild('stable')).toBe(false);
  });

  it('formats missing Git build dates as a safe unknown fallback', () => {
    expect(formatAppBuildDate('unknown')).toBe('unknown');
    expect(formatAppBuildDate(new Date(0).toISOString())).toBe('unknown');
    expect(formatAppBuildDate('2026-09-19T01:02:03Z')).toBe('2026-09-19');
  });

  it('resolves missing Git metadata without throwing', () => {
    expect(resolveAppBuildMetadata({})).toMatchObject({
      gitSha: 'local',
      gitShaShort: 'local',
      buildDate: 'unknown',
      releaseChannel: 'development',
      buildVersion: APP_VERSION,
    });
  });
});
