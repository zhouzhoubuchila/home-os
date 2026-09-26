import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCalendarCardSources } from '../use-calendar-card-sources';

const { state } = vi.hoisted(() => ({
  state: { calendars: [] as unknown[], sources: {} as Record<string, string[]> },
}));

vi.mock('@navet/app/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@navet/app/hooks')>()),
  useI18n: () => ({ t: (key: string) => key }),
  usePersistedState: (key: string) => [
    key.endsWith('calendar-card-sources') ? state.sources : {},
    vi.fn(),
  ],
  useProviderCalendarDevicesCollection: () => state.calendars,
}));

afterEach(() => {
  state.calendars = [];
  state.sources = {};
});

describe('Home OS calendar source selection', () => {
  it('defaults to every real calendar and deduplicates events shared by aggregate sources', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = tomorrow.toISOString();
    const shared = {
      id: 'shared',
      title: 'Family event',
      startTime: '10:00',
      endTime: '11:00',
      timeDisplay: '10:00',
      sortKey: start,
      sourceId: 'calendar.family',
      type: 'event',
      color: 'bg-blue-500',
    };
    state.calendars = [
      { id: 'calendar.one', name: 'One', room: 'Home', events: [shared] },
      {
        id: 'calendar.two',
        name: 'Two',
        room: 'Home',
        events: [
          shared,
          { ...shared, id: 'different', title: 'Second event', sourceId: 'calendar.two' },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useCalendarCardSources('home-os:family-calendar', [], {
        selectAllByDefault: true,
        retainLastOnMissing: false,
        deduplicateEvents: true,
      })
    );
    expect(result.current.selectedCalendarIds).toEqual(['calendar.one', 'calendar.two']);
    expect(result.current.selectedEvents.map((event) => event.title)).toEqual([
      'Family event',
      'Second event',
    ]);
  });

  it('returns a real empty array when providers have no calendars', () => {
    const { result } = renderHook(() =>
      useCalendarCardSources('home-os:family-calendar', [], {
        selectAllByDefault: true,
        retainLastOnMissing: false,
        deduplicateEvents: true,
      })
    );
    expect(result.current.selectedCalendarIds).toEqual([]);
    expect(result.current.selectedEvents).toEqual([]);
  });

  it('respects an explicitly empty persisted source selection', () => {
    state.sources = { 'home-os:family-calendar': [] };
    state.calendars = [{ id: 'calendar.family', name: 'Family', room: 'Home', events: [] }];
    const { result } = renderHook(() =>
      useCalendarCardSources('home-os:family-calendar', [], {
        selectAllByDefault: true,
        retainLastOnMissing: false,
      })
    );
    expect(result.current.selectedCalendarIds).toEqual([]);
    expect(result.current.selectedEvents).toEqual([]);
  });
});
