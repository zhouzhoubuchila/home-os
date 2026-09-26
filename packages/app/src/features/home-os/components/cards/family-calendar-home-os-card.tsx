import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { CalendarEventDialog } from '@navet/app/features/calendar/components/calendar/calendar-event-dialog';
import { CalendarSettingsDialog } from '@navet/app/features/calendar/components/calendar/calendar-settings-dialog';
import type { CalendarEvent } from '@navet/app/features/calendar/components/calendar/types';
import { useCalendarCardSources } from '@navet/app/features/calendar/components/calendar/use-calendar-card-sources';
import { useI18n, useTheme } from '@navet/app/hooks';
import { getLocaleForLanguage } from '@navet/app/i18n';
import { CalendarDays, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { buildFamilyCalendarModel, type FamilyCalendarSize } from './family-calendar-model';
import { useLunarLifeMotion } from './use-lunar-life-motion';
import './lunar-life-cards.css';

function visualSize(size: CardSize): FamilyCalendarSize {
  if (size === 'small' || size === 'tiny' || size === 'extra-small') return 'small';
  if (size === 'medium' || size === 'medium-vertical') return 'medium';
  return 'large';
}

function eventTime(event: CalendarEvent, locale: string, allDay: string) {
  if (event.isAllDay) return allDay;
  const start = event.startDateTime ?? event.sortKey;
  const date = start ? new Date(start) : null;
  if (date && !Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  return event.timeDisplay;
}

export function FamilyCalendarHomeOsCard({
  cardId,
  size,
  isEditMode,
  previewEvents,
}: {
  cardId: string;
  size: CardSize;
  isEditMode: boolean;
  previewEvents?: CalendarEvent[];
}) {
  const { language, t } = useI18n();
  const { theme } = useTheme();
  const locale = getLocaleForLanguage(language);
  const kind = visualSize(size);
  const motion = useLunarLifeMotion();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    availableCalendars,
    selectedCalendarIds,
    selectedEvents,
    setSelectedCalendarIds,
    setViewMode,
    viewMode,
  } = useCalendarCardSources(cardId, previewEvents ?? [], {
    selectAllByDefault: true,
    retainLastOnMissing: false,
    deduplicateEvents: true,
  });
  useEditModeSettingsRequest(cardId, () => setSettingsOpen(true), isEditMode);
  const now = new Date();
  const model = buildFamilyCalendarModel(previewEvents ?? selectedEvents, now, kind);
  const title = language === 'zh' ? '家庭日历' : 'Family calendar';
  const today = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(now);
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now);
  const allDayLabel = t('calendar.allDay');

  return (
    <>
      <BaseCard
        size={size}
        title={title}
        subtitle="TIME / ARC"
        headerLayout="eyebrow-first"
        headerLeading={<CalendarDays className="h-4 w-4" />}
        headerTrailing={
          isEditMode ? undefined : (
            <button
              type="button"
              className="time-arc-settings"
              onClick={() => setSettingsOpen(true)}
              aria-label={language === 'zh' ? '日历设置' : 'Calendar settings'}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )
        }
        themeOverride="dark"
        frameClassName="time-arc-card"
        disableDefaultSheen
        data-time-arc-motion={motion}
        data-time-arc-size={kind}
      >
        <div className="time-arc-body">
          {kind !== 'small' ? (
            <div className="time-arc-date">
              <strong>{today}</strong>
              <span>{dayLabel}</span>
            </div>
          ) : null}
          <div className="time-arc-track" aria-hidden="true">
            <span className="time-arc-current" />
            {model.visibleItems.slice(0, 3).map(({ event }, index) => (
              <span
                key={`${event.id}-${index}`}
                className={`time-arc-node time-arc-node-${index}`}
              />
            ))}
          </div>
          {model.visibleItems.length ? (
            <div className="time-arc-events">
              {model.visibleItems.map(({ event, ongoing }, index) => {
                const start = event.startDateTime ?? event.sortKey;
                const date = start ? new Date(start) : null;
                const dateKey =
                  date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(locale) : '';
                const previous = model.visibleItems[index - 1]?.event;
                const previousStart = previous?.startDateTime ?? previous?.sortKey;
                const previousDate = previousStart ? new Date(previousStart) : null;
                const previousKey =
                  previousDate && !Number.isNaN(previousDate.getTime())
                    ? previousDate.toLocaleDateString(locale)
                    : '';
                return (
                  <div
                    key={`${event.sourceId ?? 'source'}-${event.id}-${event.startDateTime ?? index}`}
                  >
                    {kind === 'large' && dateKey !== previousKey ? (
                      <span className="time-arc-day-group">{dateKey}</span>
                    ) : null}
                    <button
                      type="button"
                      className="time-arc-event"
                      disabled={isEditMode}
                      data-time-arc-ongoing={ongoing ? 'true' : 'false'}
                      data-time-arc-next={event.id === model.nextEvent?.id ? 'true' : 'false'}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <span className={`time-arc-event-dot ${event.color}`} aria-hidden="true" />
                      <time className="time-arc-event-time">
                        {eventTime(event, locale, allDayLabel)}
                      </time>
                      <span className="time-arc-event-title">{event.title}</span>
                      {ongoing ? (
                        <span className="time-arc-ongoing-label">
                          {language === 'zh' ? '进行中' : 'Ongoing'}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="time-arc-empty">
              {language === 'zh' ? '近期暂无日程' : 'No upcoming events'}
            </p>
          )}
        </div>
      </BaseCard>
      {selectedEvent ? (
        <CalendarEventDialog
          event={selectedEvent}
          isOpen
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
          }}
          theme="dark"
        />
      ) : null}
      {settingsOpen ? (
        <CalendarSettingsDialog
          entityId={cardId}
          isOpen
          onOpenChange={setSettingsOpen}
          theme={theme}
          title={title}
          calendars={availableCalendars.map((calendar) => ({
            id: calendar.id,
            name: calendar.name,
            room: calendar.room,
            color: calendar.color,
          }))}
          selectedCalendarIds={selectedCalendarIds}
          onSelectedCalendarIdsChange={setSelectedCalendarIds}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      ) : null}
    </>
  );
}
