import type { TranslateFn } from '@navet/app/i18n';
import { act, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyMember } from '../adapters/family-adapter';
import { HouseholdPresenceCard } from '../components/cards/household-presence-card';
import {
  householdPresenceState,
  memberPresenceState,
} from '../components/cards/household-presence-state';

const member = (state: string): FamilyMember => ({
  id: 'li-li',
  name: '粒粒',
  personEntityId: 'person.li_li',
  trackerEntityIds: [],
  state,
  trackerSources: [],
});
const t = ((key: string) => key) as TranslateFn;

describe('Household Presence state-driven motion', () => {
  it.each([
    ['home', 'home', 'home'],
    ['not_home', 'away', 'away'],
    ['unknown', 'unknown', 'unknown'],
    ['unavailable', 'unknown', 'unavailable'],
  ])('renders %s with card state %s and member state %s', (source, cardState, memberState) => {
    const html = renderToStaticMarkup(
      <HouseholdPresenceCard
        size="medium"
        members={[member(source)]}
        title="家庭状态"
        status="在家"
        t={t}
      />
    );
    expect(html).toContain(`data-presence-state="${cardState}"`);
    expect(html).toContain(`data-member-presence="${memberState}"`);
  });

  it('keeps empty distinct from unknown and mixed away/unknown distinct from away', () => {
    const html = renderToStaticMarkup(
      <HouseholdPresenceCard size="medium" members={[]} title="家庭状态" status="在家" t={t} />
    );
    expect(html).toContain('data-presence-state="empty"');
    expect(
      householdPresenceState([member('not_home'), { ...member('unknown'), id: 'other' }])
    ).toBe('unknown');
    expect(memberPresenceState('not_home')).toBe('away');
  });

  it('animates a real arrival once, not a tracker timestamp refresh', () => {
    vi.useFakeTimers();
    try {
      const props = { size: 'medium' as const, title: '家庭状态', status: '在家', t };
      const view = render(<HouseholdPresenceCard {...props} members={[member('not_home')]} />);
      expect(view.container.querySelector('[data-member-arrived="true"]')).toBeNull();
      view.rerender(<HouseholdPresenceCard {...props} members={[member('home')]} />);
      expect(view.container.querySelector('[data-member-arrived="true"]')).not.toBeNull();
      expect(view.container.querySelector('[data-count-changing="true"]')).not.toBeNull();
      act(() => vi.advanceTimersByTime(1000));
      expect(view.container.querySelector('[data-member-arrived="true"]')).toBeNull();
      view.rerender(
        <HouseholdPresenceCard
          {...props}
          members={[{ ...member('home'), lastChanged: '2026-09-26T00:00:00Z' }]}
        />
      );
      expect(view.container.querySelector('[data-member-arrived="true"]')).toBeNull();
      expect(view.container.querySelector('[data-count-changing="true"]')).toBeNull();
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
