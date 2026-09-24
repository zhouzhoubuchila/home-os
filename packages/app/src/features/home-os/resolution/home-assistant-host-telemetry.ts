import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';

function storagePriority(item: ResolvedSemanticEntity) {
  const id = item.entity.externalId.toLowerCase();
  const names = `${item.entity.name} ${item.displayName}`.toLowerCase();
  if (
    /\/config(?:\b|$)/.test(names) ||
    /(?:disk|storage)[._-](?:use|usage)[._-]config(?:\b|$)/.test(id)
  )
    return 3;
  if (/\/(?!\s|$)[a-z0-9]/.test(names)) return 1;
  if (
    /\s\/\s*$/.test(item.entity.name) ||
    /\s\/\s*$/.test(item.displayName) ||
    /(?:disk|storage)[._-](?:use|usage)(?:[._-]root)?$/.test(id)
  )
    return 2;
  return 1;
}

/** Keep one deterministic storage source for both the card and its detail dialog. */
export function selectHomeAssistantHostTelemetry(entities: readonly ResolvedSemanticEntity[]) {
  const storage = entities
    .filter((item) => item.roles.includes(HOME_OS_ROLES.homelabHomeAssistantStorage))
    .sort((left, right) => {
      const available =
        Number(right.entity.availability === 'available') -
        Number(left.entity.availability === 'available');
      return (
        available ||
        storagePriority(right) - storagePriority(left) ||
        left.entity.externalId.localeCompare(right.entity.externalId)
      );
    })[0];
  return entities.filter(
    (item) => !item.roles.includes(HOME_OS_ROLES.homelabHomeAssistantStorage) || item === storage
  );
}

export function formatHomeAssistantUptime(
  entity: ResolvedSemanticEntity,
  language: string,
  now = Date.now()
) {
  const raw = String(entity.entity.primaryState ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw;
  const elapsed = now - Date.parse(raw);
  if (!Number.isFinite(elapsed) || elapsed < 0) return raw;
  const minutes = Math.floor(elapsed / 60_000);
  const zh = language.toLowerCase().startsWith('zh');
  if (minutes >= 10_080) return `${Math.floor(minutes / 10_080)}${zh ? '周' : ' wk'}`;
  if (minutes >= 1_440) return `${Math.floor(minutes / 1_440)}${zh ? '天' : ' d'}`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}${zh ? '小时' : ' h'}`;
  return `${Math.max(1, minutes)}${zh ? '分钟' : ' min'}`;
}
