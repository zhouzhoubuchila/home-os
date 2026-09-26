import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import type { TranslateFn } from '@navet/app/i18n';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { House, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FamilyMember } from '../../adapters/family-adapter';
import { formatHomeOsDisplayState } from '../../i18n/display-state';
import { householdPresenceState, memberPresenceState } from './household-presence-state';
import './household-presence-card.css';

type PresenceMotion = 'high' | 'medium' | 'low' | 'off';

export function useHouseholdPresenceMotion(): PresenceMotion {
  const quality = useEffectiveEffectsQuality();
  const disableAnimations = useSettingsStore((state) => state.disableAnimations);
  const lowPowerMode = useSettingsStore((state) => state.lowPowerMode);
  if (disableAnimations) return 'off';
  return lowPowerMode ? 'low' : quality;
}

export function HouseholdPresenceCard({
  size,
  members,
  title,
  status,
  t,
}: {
  size: CardSize;
  members: readonly FamilyMember[];
  title: string;
  status: string;
  t: TranslateFn;
}) {
  const presenceState = householdPresenceState(members);
  const motion = useHouseholdPresenceMotion();
  const homeCount = members.filter((member) => memberPresenceState(member.state) === 'home').length;
  const previousStates = useRef(
    new Map(members.map((member) => [member.id, memberPresenceState(member.state)]))
  );
  const arrivalTimeout = useRef<number | undefined>(undefined);
  const previousCount = useRef(homeCount);
  const [arrivals, setArrivals] = useState<ReadonlySet<string>>(new Set());
  const [outgoingCount, setOutgoingCount] = useState<number | null>(null);

  useEffect(() => {
    const next = new Map(members.map((member) => [member.id, memberPresenceState(member.state)]));
    const newlyHome = members
      .filter((member) => {
        const before = previousStates.current.get(member.id);
        return (
          (before === 'away' || before === 'unknown' || before === 'unavailable') &&
          next.get(member.id) === 'home'
        );
      })
      .map((member) => member.id);
    previousStates.current = next;
    if (newlyHome.length === 0) return;
    window.clearTimeout(arrivalTimeout.current);
    setArrivals(new Set(newlyHome));
    arrivalTimeout.current = window.setTimeout(() => setArrivals(new Set()), 950);
  }, [members]);

  useEffect(() => () => window.clearTimeout(arrivalTimeout.current), []);

  useEffect(() => {
    const before = previousCount.current;
    previousCount.current = homeCount;
    if (before === homeCount) return;
    setOutgoingCount(before);
    const timeout = window.setTimeout(() => setOutgoingCount(null), 380);
    return () => window.clearTimeout(timeout);
  }, [homeCount]);

  const visibleLimit =
    size === 'small' || size === 'tiny' || size === 'extra-small' ? 2 : size === 'medium' ? 4 : 8;
  return (
    <BaseCard
      size={size}
      title={title}
      subtitle="PRESENCE / HOME"
      headerLayout="eyebrow-first"
      headerLeading={<Users className="h-4 w-4" />}
      themeOverride="dark"
      frameClassName="household-presence-card"
      disableDefaultSheen
      data-presence-state={presenceState}
      data-presence-motion={motion}
    >
      <div className="household-presence-content">
        <div className="household-presence-atmosphere" aria-hidden="true" />
        <div className="household-presence-summary">
          <div
            className="household-presence-number"
            aria-live="polite"
            data-count-changing={outgoingCount === null ? 'false' : 'true'}
          >
            {outgoingCount !== null ? (
              <span className="household-presence-number-old" aria-hidden="true">
                {outgoingCount}/{members.length}
              </span>
            ) : null}
            <strong className="household-presence-number-new">
              {homeCount}/{members.length}
            </strong>
          </div>
          <p className="household-presence-caption">{status}</p>
        </div>
        <div className="household-presence-orb" aria-hidden="true">
          <div className="household-presence-orb-halo" />
          <div className="household-presence-orb-track" />
          <div className="household-presence-orb-ring" />
          <div className="household-presence-orb-node household-presence-orb-node-a" />
          <div className="household-presence-orb-node household-presence-orb-node-b" />
          <div className="household-presence-orb-core">
            <House className="h-5 w-5" />
          </div>
        </div>
        <div className="household-presence-members">
          {members.slice(0, visibleLimit).map((member) => {
            const state = memberPresenceState(member.state);
            return (
              <div
                key={member.id}
                className="household-presence-member"
                data-member-presence={state}
                data-member-arrived={arrivals.has(member.id) ? 'true' : 'false'}
              >
                <span className="household-presence-member-avatar">
                  {member.avatar ? <img src={member.avatar} alt="" /> : member.name.slice(0, 1)}
                </span>
                <span className="household-presence-member-name">{member.name}</span>
                <span className="household-presence-member-dot" aria-hidden="true" />
                <span className="household-presence-member-status">
                  {formatHomeOsDisplayState(member.state, t)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </BaseCard>
  );
}
