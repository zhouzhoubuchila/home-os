import type { FamilyMember } from '../../adapters/family-adapter';

export type HouseholdPresenceState = 'home' | 'away' | 'unknown' | 'empty';
export type MemberPresenceState = 'home' | 'away' | 'unknown' | 'unavailable';

export function memberPresenceState(state: string): MemberPresenceState {
  const normalized = state.trim().toLowerCase();
  if (normalized === 'home') return 'home';
  if (normalized === 'not_home' || normalized === 'away') return 'away';
  if (normalized === 'unavailable') return 'unavailable';
  if (!normalized || normalized === 'unknown') return 'unknown';
  return 'away';
}

export function householdPresenceState(members: readonly FamilyMember[]): HouseholdPresenceState {
  if (members.length === 0) return 'empty';
  const states = members.map((member) => memberPresenceState(member.state));
  if (states.includes('home')) return 'home';
  if (states.every((state) => state === 'away')) return 'away';
  return 'unknown';
}
