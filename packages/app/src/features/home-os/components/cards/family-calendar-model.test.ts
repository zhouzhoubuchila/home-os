import type { CalendarEvent } from '@navet/app/features/calendar/components/calendar/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFamilyCalendarModel } from './family-calendar-model';

const now = new Date('2026-09-27T10:00:00.000Z');
const event = (
  id: string,
  start: string,
  end: string,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id,
  title: id,
  startTime: '10:00',
  endTime: '11:00',
  timeDisplay: '10:00',
  startDateTime: start,
  endDateTime: end,
  sortKey: start,
  type: 'event',
  color: 'bg-blue-500',
  ...extra,
});

describe('Time Arc model', () => {
  it('distinguishes ongoing, future and ended events at a fixed time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const model = buildFamilyCalendarModel(
      [
        event('past', '2026-09-27T08:00:00Z', '2026-09-27T09:00:00Z'),
        event('future', '2026-09-27T11:00:00Z', '2026-09-27T12:00:00Z'),
        event('ongoing', '2026-09-27T09:00:00Z', '2026-09-27T11:00:00Z'),
      ],
      new Date(),
      'medium'
    );
    expect(model.visibleItems.map((item) => item.event.id)).toEqual(['ongoing', 'future']);
    expect(model.ongoingEvent?.id).toBe('ongoing');
    expect(model.nextEvent?.id).toBe('future');
    vi.useRealTimers();
  });

  it('keeps real all-day events and size-specific limits without inventing demo data', () => {
    const events = Array.from({ length: 8 }, (_, index) =>
      event(
        `真实日程 ${index}`,
        `2026-09-${String(28 + Math.floor(index / 4)).padStart(2, '0')}T${String(8 + (index % 4)).padStart(2, '0')}:00:00Z`,
        `2026-09-${String(28 + Math.floor(index / 4)).padStart(2, '0')}T${String(9 + (index % 4)).padStart(2, '0')}:00:00Z`,
        index === 0 ? { isAllDay: true, title: '家庭聚会' } : {}
      )
    );
    expect(buildFamilyCalendarModel(events, now, 'small').visibleItems).toHaveLength(1);
    expect(buildFamilyCalendarModel(events, now, 'medium').visibleItems).toHaveLength(3);
    expect(buildFamilyCalendarModel(events, now, 'large').visibleItems).toHaveLength(7);
    expect(buildFamilyCalendarModel(events, now, 'large').visibleItems[0]?.event.title).toBe(
      '家庭聚会'
    );
    expect(buildFamilyCalendarModel([], now, 'medium')).toMatchObject({
      nextEvent: null,
      eventCount: 0,
      visibleItems: [],
    });
  });
});
