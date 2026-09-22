import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { SemanticCandidate } from '../core/types';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const RATE_UNITS = /(?:^|\s|\/)(?:k|m|g)?(?:bit|b)(?:\/s|ps)(?:$|\s)/i;
const AGGREGATE_HINTS = /total|cumulative|accumulated|bytes?|traffic|累计|总量|流量|字节/i;
const SPEEDTEST_HINTS = /speed.?test|bandwidth|throughput|internet.?speed|网速|带宽|吞吐/i;
const INTERNET_CONTEXT = /internet|wan|外网|公网|connectivity|reachable|可达|联网|连通/i;

function metadataText(entity: NavetEntity) {
  const attributes = entity.attributes;
  return [
    entity.externalId,
    entity.name,
    attributes.integration,
    attributes.platform,
    attributes.deviceName,
    attributes.device_name,
    attributes.deviceClass,
    attributes.device_class,
  ]
    .map(readString)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function candidate(
  role: string,
  confidence: number,
  source: SemanticCandidate['source'],
  ...reasons: string[]
): SemanticCandidate {
  return { role, confidence, source, reasons };
}

/**
 * Resolves Internet telemetry before router compatibility rules run.
 *
 * Router integrations often expose WAN probes alongside router-local metrics.
 * Keep this intentionally conservative: only explicit Internet probes and
 * speed-test metadata are allowed to create Internet roles.
 */
export function resolveInternetCompatibleRoles(entity: NavetEntity): SemanticCandidate[] {
  const domain = entity.externalId.split('.')[0] ?? '';
  const attributes = entity.attributes;
  const integration = readString(attributes.integration ?? attributes.platform).toLowerCase();
  const unit = readString(attributes.unit ?? attributes.unit_of_measurement).toLowerCase();
  const text = metadataText(entity);
  const roles: SemanticCandidate[] = [];

  const latency = /latency|ping|rtt|round.?trip|延迟|往返/.test(text);
  const packetLoss = /packet.?loss|packetloss|丢包/.test(text);
  const jitter = /jitter|抖动/.test(text);
  const aggregate = AGGREGATE_HINTS.test(text);
  const speedtest = SPEEDTEST_HINTS.test(text) || integration.includes('speedtest');

  if (latency) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetLatency,
        0.98,
        integration ? 'integration' : 'name_heuristic',
        'latency/ping probe',
        integration ? `integration=${integration}` : 'Internet telemetry name'
      )
    );
    // A live latency probe is a reliable online signal when HA has no separate
    // WAN binary_sensor. Availability and error states are interpreted by the
    // resolution layer, so this does not fabricate a boolean value.
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetOnline,
        0.84,
        'name_heuristic',
        'online derived from latency/ping probe availability'
      )
    );
  }

  if (packetLoss) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetPacketLoss,
        0.96,
        integration ? 'integration' : 'name_heuristic',
        'packet loss telemetry'
      )
    );
  }

  if (jitter) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetJitter,
        0.96,
        integration ? 'integration' : 'name_heuristic',
        'jitter telemetry'
      )
    );
  }

  const rateUnit = RATE_UNITS.test(unit);
  // A speed-test integration alone is not enough: without a bit/s unit the
  // value may be a cumulative byte counter, which must stay unmapped.
  if (speedtest && !aggregate && rateUnit) {
    if (/download|downstream|receive|下载|下行/.test(text)) {
      roles.push(
        candidate(
          HOME_OS_ROLES.networkInternetDownload,
          0.94,
          'integration',
          'real-time speed-test download rate'
        )
      );
    }
    if (/upload|upstream|transmit|上传|上行/.test(text)) {
      roles.push(
        candidate(
          HOME_OS_ROLES.networkInternetUpload,
          0.94,
          'integration',
          'real-time speed-test upload rate'
        )
      );
    }
  }

  const deviceClass = readString(attributes.deviceClass ?? attributes.device_class).toLowerCase();
  const onlineContext = INTERNET_CONTEXT.test(text) || deviceClass === 'connectivity';
  const onlineState = /online|offline|connected|disconnected|reachable|status|状态|联网|在线/.test(
    text
  );
  if (
    onlineContext &&
    onlineState &&
    (domain === 'binary_sensor' || domain === 'sensor') &&
    !latency
  ) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetOnline,
        0.95,
        deviceClass === 'connectivity' ? 'device_metadata' : 'name_heuristic',
        'explicit WAN/Internet connectivity state'
      )
    );
  }

  return roles;
}
