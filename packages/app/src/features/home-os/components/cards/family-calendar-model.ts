import {
  getCalendarEventInterval,
  getCalendarEventSortValue,
} from '@navet/app/features/calendar/components/calendar/calendar-event-visibility';
import type { CalendarEvent } from '@navet/app/features/calendar/components/calendar/types';

export type FamilyCalendarSize = 'small' | 'medium' | 'large';

export interface FamilyCalendarItem {
  event: CalendarEvent;
  ongoing: boolean;
}

export function buildFamilyCalendarModel(
  events: readonly CalendarEvent[],
  now: Date,
  size: FamilyCalendarSize
) {
  const items = events
    .map((event): FamilyCalendarItem | null => {
      const { start, end } = getCalendarEventInterval(event);
      if (!start || !end || end.getTime() <= now.getTime()) return null;
      return { event, ongoing: start.getTime() <= now.getTime() };
    })
    .filter((item): item is FamilyCalendarItem => item !== null)
    .sort((left, right) =>
      getCalendarEventSortValue(left.event).localeCompare(getCalendarEventSortValue(right.event))
    );
  const limit = size === 'small' ? 1 : size === 'medium' ? 3 : 7;
  return {
    visibleItems: items.slice(0, limit),
    ongoingEvent: items.find((item) => item.ongoing)?.event ?? null,
    nextEvent: items.find((item) => !item.ongoing)?.event ?? null,
    eventCount: items.length,
  };
}
