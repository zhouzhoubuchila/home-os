import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { SemanticCandidate } from '../core/types';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const RATE_UNITS = /(?:^|\s|\/)(?:k|m|g)?(?:bit|b)(?:\/s|ps)(?:$|\s)/i;
const AGGREGATE_HINTS = /total|cumulative|accumulated|bytes?|traffic|累计|总量|流量|字节/i;
const SPEEDTEST_HINTS = /speed.?test|bandwidth|throughput|internet.?speed|网速|带宽|吞吐/i;
const INTERNET_CONTEXT =
  /internet|(?:^|[._\s-])wan(?:$|[._\s-])|external[._\s-]*network|gateway[._\s-]*reachab|外网|公网/i;
const LOCAL_DEVICE_CONTEXT =
  /midea|家电|appliance|phone|mobile|iphone|android|电视|\btv\b|vacuum|扫地|climate|空调|washing|washer|洗衣|fridge|refrigerator|冰箱|iot[._\s-]*device/i;
const LATENCY_HINT = /latency|ping|(?:^|[._\s-])rtt(?:$|[._\s-])|round[._\s-]*trip|延迟/i;
const LATENCY_UNIT = /^(?:ms|milliseconds?)$/i;

const entityUnit = (entity: NavetEntity) =>
  readString(entity.attributes.unit ?? entity.attributes.unit_of_measurement);

function finiteState(entity: NavetEntity) {
  const value = entity.primaryState;
  return (
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
    Number.isFinite(Number(value))
  );
}

function isLatencyProbeShape(entity: NavetEntity) {
  return (
    entity.externalId.startsWith('sensor.') &&
    LATENCY_UNIT.test(entityUnit(entity)) &&
    LATENCY_HINT.test(metadataText(entity))
  );
}

export function isNumericInternetLatency(entity: NavetEntity) {
  return isLatencyProbeShape(entity) && finiteState(entity);
}

function isLatencyOnlineFallback(entity: NavetEntity) {
  if (!isLatencyProbeShape(entity)) return false;
  if (finiteState(entity)) return true;
  const state = readString(entity.primaryState).toLowerCase();
  return ['unknown', 'unavailable', 'timeout', 'error'].includes(state);
}

function isExplicitInternetOnline(entity: NavetEntity) {
  const domain = entity.externalId.split('.')[0];
  if (domain !== 'binary_sensor' && domain !== 'sensor') return false;
  const text = metadataText(entity);
  if (LOCAL_DEVICE_CONTEXT.test(text) || !INTERNET_CONTEXT.test(text)) return false;
  if (
    !/online|offline|connected|disconnected|connectivity|reachable|reachability|status|状态|联网|在线|连通/i.test(
      text
    )
  )
    return false;
  if (domain === 'binary_sensor') return true;
  const state = readString(entity.primaryState).toLowerCase();
  return [
    'on',
    'off',
    'online',
    'offline',
    'available',
    'unavailable',
    'connected',
    'disconnected',
    'unknown',
    'true',
    'false',
  ].includes(state);
}

/** Hard constraints also apply to persisted manual mappings and review candidates. */
export function isInternetRoleCompatible(entity: NavetEntity, role: string) {
  switch (role) {
    case HOME_OS_ROLES.networkInternetOnline:
      return isExplicitInternetOnline(entity) || isLatencyOnlineFallback(entity);
    case HOME_OS_ROLES.networkInternetLatency:
      return isNumericInternetLatency(entity);
    case HOME_OS_ROLES.networkInternetPacketLoss:
      return (
        entity.externalId.startsWith('sensor.') &&
        finiteState(entity) &&
        /packet[._\s-]*loss|丢包/i.test(metadataText(entity))
      );
    case HOME_OS_ROLES.networkInternetJitter:
      return (
        entity.externalId.startsWith('sensor.') &&
        finiteState(entity) &&
        /jitter|抖动/i.test(metadataText(entity)) &&
        LATENCY_UNIT.test(entityUnit(entity))
      );
    case HOME_OS_ROLES.networkInternetDownload:
    case HOME_OS_ROLES.networkInternetUpload: {
      const text = metadataText(entity);
      const direction =
        role === HOME_OS_ROLES.networkInternetDownload
          ? /download|downstream|receive|下载|下行/i
          : /upload|upstream|transmit|上传|上行/i;
      return (
        entity.externalId.startsWith('sensor.') &&
        finiteState(entity) &&
        !AGGREGATE_HINTS.test(text) &&
        RATE_UNITS.test(entityUnit(entity)) &&
        SPEEDTEST_HINTS.test(text) &&
        direction.test(text)
      );
    }
    default:
      return true;
  }
}

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
  const attributes = entity.attributes;
  const integration = readString(attributes.integration ?? attributes.platform).toLowerCase();
  const roles: SemanticCandidate[] = [];

  if (isNumericInternetLatency(entity)) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetLatency,
        0.98,
        integration ? 'integration' : 'name_heuristic',
        'latency/ping probe',
        integration ? `integration=${integration}` : 'Internet telemetry name'
      )
    );
  }

  // Availability and error states are interpreted by the resolution layer.
  if (isLatencyOnlineFallback(entity)) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetOnline,
        0.84,
        'name_heuristic',
        'online derived from latency/ping probe availability'
      )
    );
  }

  if (isInternetRoleCompatible(entity, HOME_OS_ROLES.networkInternetPacketLoss)) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetPacketLoss,
        0.96,
        integration ? 'integration' : 'name_heuristic',
        'packet loss telemetry'
      )
    );
  }

  if (isInternetRoleCompatible(entity, HOME_OS_ROLES.networkInternetJitter)) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetJitter,
        0.96,
        integration ? 'integration' : 'name_heuristic',
        'jitter telemetry'
      )
    );
  }

  if (isInternetRoleCompatible(entity, HOME_OS_ROLES.networkInternetDownload)) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetDownload,
        0.94,
        'integration',
        'real-time speed-test download rate'
      )
    );
  }
  if (isInternetRoleCompatible(entity, HOME_OS_ROLES.networkInternetUpload)) {
    roles.push(
      candidate(
        HOME_OS_ROLES.networkInternetUpload,
        0.94,
        'integration',
        'real-time speed-test upload rate'
      )
    );
  }

  if (isExplicitInternetOnline(entity)) {
    const deviceClass = readString(attributes.deviceClass ?? attributes.device_class).toLowerCase();
    const fallbackIndex = roles.findIndex(
      ({ role }) => role === HOME_OS_ROLES.networkInternetOnline
    );
    if (fallbackIndex >= 0) roles.splice(fallbackIndex, 1);
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
