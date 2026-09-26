import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { AppLanguage } from '@navet/app/i18n';
import type { FamilyMember } from '../../adapters/family-adapter';
import {
  type HouseholdPresenceState,
  householdPresenceState,
  memberPresenceState,
} from './household-presence-state';

export function buildHouseholdPresenceSummary(
  members: readonly FamilyMember[],
  language: AppLanguage | string
): { state: HouseholdPresenceState; homeCount: number; totalCount: number; summary: string } {
  const state = householdPresenceState(members);
  const homeCount = members.filter((member) => memberPresenceState(member.state) === 'home').length;
  const totalCount = members.length;
  const zh = language.toLowerCase().startsWith('zh');
  let summary: string;
  if (totalCount === 0) summary = zh ? '暂无家庭成员' : 'No household members configured';
  else if (homeCount > 0)
    summary = zh
      ? `${homeCount} 位成员在家`
      : `${homeCount} member${homeCount === 1 ? '' : 's'} home`;
  else if (state === 'away') summary = zh ? '当前无人确认在家' : 'No one confirmed home';
  else summary = zh ? '成员状态暂不可用' : 'Member status unavailable';
  return { state, homeCount, totalCount, summary };
}

export function getHouseholdPresenceLayoutSize(size: CardSize): 'small' | 'medium' | 'large' {
  if (size === 'tiny' || size === 'extra-small' || size === 'small') return 'small';
  if (size === 'medium' || size === 'medium-vertical') return 'medium';
  return 'large';
}

export function buildHouseholdPresenceModel(
  members: readonly FamilyMember[],
  size: CardSize,
  language: AppLanguage | string
) {
  const layoutSize = getHouseholdPresenceLayoutSize(size);
  const limit = layoutSize === 'small' ? 1 : layoutSize === 'medium' ? 3 : 6;
  const summary = buildHouseholdPresenceSummary(members, language);
  return {
    ...summary,
    visibleMembers: members.slice(0, limit),
    hiddenCount: Math.max(0, members.length - limit),
    layoutSize,
  };
}

export function buildHouseholdPresenceDetailDescription(
  summary: ReturnType<typeof buildHouseholdPresenceSummary>
) {
  return summary.totalCount > 0
    ? `${summary.homeCount} / ${summary.totalCount} · ${summary.summary}`
    : summary.summary;
}
