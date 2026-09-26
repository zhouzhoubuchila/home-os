import type { CalendarEvent } from '@navet/app/features/calendar/components/calendar/types';
import { CalendarCard } from '@navet/app/features/calendar/components/calendar-card';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FamilyCalendarHomeOsCard } from './family-calendar-home-os-card';
import { HomeOsWidget } from './home-os-widget';

const { source, dialog } = vi.hoisted(() => ({
  source: { events: [] as CalendarEvent[] },
  dialog: vi.fn(),
}));

vi.mock('@navet/app/features/calendar/components/calendar/use-calendar-card-sources', () => ({
  useCalendarCardSources: (_id: string, fallback: CalendarEvent[]) => ({
    availableCalendars: [],
    selectedCalendarIds: [],
    selectedEvents: source.events.length ? source.events : fallback,
    setSelectedCalendarIds: vi.fn(),
    setTintColor: vi.fn(),
    setViewMode: vi.fn(),
    tintColor: undefined,
    viewMode: 'week',
  }),
}));

vi.mock('@navet/app/features/calendar/components/calendar/calendar-event-dialog', () => ({
  CalendarEventDialog: (props: { theme: string; event: CalendarEvent }) => {
    dialog(props);
    return (
      <div data-testid="event-dialog" data-theme={props.theme}>
        {props.event.title}
      </div>
    );
  },
}));

const event = (
  id: string,
  start: string,
  end: string,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id,
  title: id,
  startTime: '19:30',
  endTime: '20:30',
  timeDisplay: '19:30',
  startDateTime: start,
  endDateTime: end,
  sortKey: start,
  type: 'event',
  color: 'bg-blue-500',
  ...extra,
});

afterEach(() => {
  source.events = [];
  dialog.mockClear();
  vi.useRealTimers();
  useThemeStore.getState().setTheme('dark');
});

describe('Home OS Time Arc', () => {
  it('routes the calendar kind to Time Arc without a generic detail wrapper', () => {
    const { container } = renderWithProviders(
      <HomeOsWidget
        cardId="family-calendar-card"
        size="medium"
        data={{ kind: 'calendar' }}
        isEditMode={false}
      />
    );
    expect(container.querySelector('.time-arc-card')).toBeInTheDocument();
    expect(container.querySelector('[data-home-os-detail]')).toBeNull();
  });

  it('uses a real empty list and never displays calendar demo events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'));
    const { container } = renderWithProviders(
      <FamilyCalendarHomeOsCard cardId="card-calendar-1" size="medium" isEditMode={false} />
    );
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('Friday Planning');
    expect(container).not.toHaveTextContent('Groceries Pickup');
    expect(container).not.toHaveTextContent('Driving Course');
    expect(container.querySelector('[data-time-arc-motion]')).toBeInTheDocument();
  });

  it('shows timed, all-day and ongoing real events with dark detail in global light', () => {
    useThemeStore.getState().setTheme('light');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'));
    source.events = [
      event('项目会议', '2026-09-27T11:00:00Z', '2026-09-27T12:00:00Z'),
      event('Family picnic', '2026-09-28T00:00:00Z', '2026-09-28T23:59:00Z', {
        isAllDay: true,
        location: undefined,
      }),
      event('Ongoing call', '2026-09-27T09:00:00Z', '2026-09-27T11:00:00Z'),
    ];
    const { container } = renderWithProviders(
      <FamilyCalendarHomeOsCard cardId="card-calendar-2" size="medium" isEditMode={false} />
    );
    expect(container.querySelector('.time-arc-card')).toBeInTheDocument();
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
    expect(screen.getByText('项目会议')).toBeInTheDocument();
    expect(container.querySelector('[data-time-arc-next="true"]')).toHaveTextContent('项目会议');
    fireEvent.click(screen.getByRole('button', { name: /项目会议/ }));
    expect(screen.getByTestId('event-dialog')).toHaveAttribute('data-theme', 'dark');
    expect(dialog).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('shows one real item in small and groups up to seven in large', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'));
    source.events = Array.from({ length: 7 }, (_, index) =>
      event(
        `Long English family event ${index}`,
        `2026-09-28T${String(index + 10).padStart(2, '0')}:00:00Z`,
        `2026-09-28T${String(index + 11).padStart(2, '0')}:00:00Z`
      )
    );
    const small = renderWithProviders(
      <FamilyCalendarHomeOsCard cardId="card-calendar-3" size="small" isEditMode={false} />
    );
    expect(small.container.querySelectorAll('.time-arc-event')).toHaveLength(1);
    small.unmount();
    const large = renderWithProviders(
      <FamilyCalendarHomeOsCard cardId="card-calendar-4" size="large" isEditMode={false} />
    );
    expect(large.container.querySelectorAll('.time-arc-event')).toHaveLength(7);
    expect(large.container.querySelector('.time-arc-day-group')).toBeInTheDocument();
  });

  it('leaves the ordinary CalendarCard dialog on the global light theme', () => {
    useThemeStore.getState().setTheme('light');
    const future = new Date(Date.now() + 60 * 60_000);
    const item = event(
      'Ordinary event',
      future.toISOString(),
      new Date(future.getTime() + 60 * 60_000).toISOString()
    );
    renderWithProviders(<CalendarCard id="calendar.ordinary" events={[item]} size="small" />);
    fireEvent.click(screen.getByText('Ordinary event'));
    expect(screen.getByTestId('event-dialog')).toHaveAttribute('data-theme', 'light');
  });
});
