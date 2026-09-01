import type {
  PlatformStatisticsHistoryRequest,
  PlatformStatisticsHistorySeries,
} from '@navet/app/platform/provider-feature-models';
import {
  getIntegrationStatisticsHistory,
  supportsIntegrationStatisticsHistory,
} from '@navet/app/services/integration-history.service';

export interface HistoryCapability {
  supportsStatistics: (entityId: string) => boolean;
  loadStatistics: (
    request: PlatformStatisticsHistoryRequest
  ) => Promise<PlatformStatisticsHistorySeries | null>;
}

export const homeOsHistoryCapability: HistoryCapability = {
  supportsStatistics: supportsIntegrationStatisticsHistory,
  loadStatistics: getIntegrationStatisticsHistory,
};
