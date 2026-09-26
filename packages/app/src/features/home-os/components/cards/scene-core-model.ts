import type { ResolvedSemanticEntity } from '../../core/types';

export type SceneCoreSize = 'small' | 'medium' | 'large';

export function buildSceneCoreModel(
  entities: readonly ResolvedSemanticEntity[],
  size: SceneCoreSize
) {
  const scenes = entities.filter((item) => !item.ignored && item.roles.includes('home.mode'));
  const limit = size === 'small' ? 2 : size === 'medium' ? 4 : 8;
  return {
    scenes: scenes.slice(0, limit),
    remaining: Math.max(0, scenes.length - limit),
    total: scenes.length,
  };
}

export function sceneCoreIconKind(name: string) {
  const value = name.toLocaleLowerCase();
  if (/sleep|睡眠/.test(value)) return 'sleep';
  if (/away|离家/.test(value)) return 'away';
  if (/movie|观影/.test(value)) return 'movie';
  if (/read|阅读/.test(value)) return 'reading';
  if (/home|回家/.test(value)) return 'home';
  return 'other';
}
