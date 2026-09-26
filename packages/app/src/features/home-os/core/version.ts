import { APP_BUILD_METADATA } from '@navet/app/constants/app-build-metadata';

export const HOME_OS_VERSION = '2.0.6' as const;

/** Navet's package version stays independent from the Home OS product release. */
export const HOME_OS_BUILD_METADATA = Object.freeze({
  productVersion: HOME_OS_VERSION,
  gitShaShort: APP_BUILD_METADATA.gitShaShort,
  buildDate: APP_BUILD_METADATA.buildDate,
  releaseChannel: APP_BUILD_METADATA.releaseChannel,
});
