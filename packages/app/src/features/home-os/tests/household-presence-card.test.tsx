import type { TranslateFn } from '@navet/app/i18n';
import { act, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyMember } from '../adapters/family-adapter';
import { HouseholdPresenceCard } from '../components/cards/household-presence-card';
import {
  buildHouseholdPresenceModel,
  buildHouseholdPresenceSummary,
} from '../components/cards/household-presence-model';
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
    ['away', 'away', 'away'],
    ['office', 'away', 'away'],
    ['work', 'away', 'away'],
    ['school', 'away', 'away'],
    ['gym', 'away', 'away'],
    ['unknown', 'unknown', 'unknown'],
    ['unavailable', 'unknown', 'unavailable'],
  ])('renders %s with card state %s and member state %s', (source, cardState, memberState) => {
    const html = renderToStaticMarkup(
      <HouseholdPresenceCard
        size="medium"
        members={[member(source)]}
        title="家庭状态"
        language="zh"
        t={t}
      />
    );
    expect(html).toContain(`data-presence-state="${cardState}"`);
    expect(html).toContain(`data-member-presence="${memberState}"`);
  });

  it('keeps empty distinct from unknown and mixed away/unknown distinct from away', () => {
    const html = renderToStaticMarkup(
      <HouseholdPresenceCard size="medium" members={[]} title="家庭状态" language="zh" t={t} />
    );
    expect(html).toContain('data-presence-state="empty"');
    expect(
      householdPresenceState([member('not_home'), { ...member('unknown'), id: 'other' }])
    ).toBe('unknown');
    expect(memberPresenceState('not_home')).toBe('away');
    expect(buildHouseholdPresenceSummary([member('home')], 'zh').summary).toBe('1 位成员在家');
    expect(
      buildHouseholdPresenceSummary(
        [member('not_home'), { ...member('unknown'), id: 'other' }],
        'zh'
      ).summary
    ).toBe('成员状态暂不可用');
    expect(buildHouseholdPresenceSummary([], 'zh').summary).toBe('暂无家庭成员');
    expect(buildHouseholdPresenceSummary([member('not_home')], 'zh').summary).toBe(
      '当前无人确认在家'
    );
    expect(buildHouseholdPresenceSummary([member('unavailable')], 'zh').summary).toBe(
      '成员状态暂不可用'
    );
    expect(
      renderToStaticMarkup(
        <HouseholdPresenceCard size="medium" members={[]} title="家庭状态" language="zh" t={t} />
      )
    ).not.toContain('0/0');
    expect(
      buildHouseholdPresenceModel(
        Array.from({ length: 8 }, (_, index) => ({ ...member('home'), id: `member-${index}` })),
        'medium',
        'zh'
      ).hiddenCount
    ).toBe(5);
  });

  it('animates a real arrival once, not a tracker timestamp refresh', () => {
    vi.useFakeTimers();
    try {
      const props = { size: 'medium' as const, title: '家庭状态', language: 'zh', t };
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
