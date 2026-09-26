import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { CalendarEvent } from '@navet/app/features/calendar/components/calendar/types';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FamilyCalendarHomeOsCard } from './family-calendar-home-os-card';

type Scenario = 'medium' | 'ongoing' | 'all-day' | 'empty' | 'large' | 'multiple';

function storyEvent(
  id: string,
  title: string,
  dayOffset: number,
  hour: number,
  sourceId = 'calendar.family',
  isAllDay = false
): CalendarEvent {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(isAllDay ? 0 : hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(isAllDay ? 23 : start.getHours() + 1, isAllDay ? 59 : 0);
  return {
    id,
    title,
    startTime: isAllDay ? '--' : start.toLocaleTimeString(),
    endTime: isAllDay ? '--' : end.toLocaleTimeString(),
    timeDisplay: isAllDay ? '--' : start.toLocaleTimeString(),
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    sortKey: start.toISOString(),
    isAllDay,
    type: 'event',
    color: sourceId === 'calendar.family' ? 'bg-blue-500' : 'bg-purple-500',
    sourceId,
    sourceName: sourceId === 'calendar.family' ? '家庭' : '工作',
  };
}

function Preview({ size, scenario }: { size: CardSize; scenario: Scenario }) {
  // Storybook-only sample events; production never supplies previewEvents.
  const events =
    scenario === 'empty'
      ? []
      : [
          storyEvent('meeting', '项目会议', 0, new Date().getHours() + 2),
          storyEvent('picnic', '家庭聚会', 1, 0, 'calendar.family', true),
          storyEvent('school', 'School pickup', 2, 16, 'calendar.school'),
          storyEvent('reading', '阅读时间', 3, 20),
          storyEvent('dinner', 'Family dinner', 4, 18),
          storyEvent('movie', '观影夜', 5, 20),
          storyEvent('run', 'Morning run', 6, 8),
        ];
  if (scenario === 'ongoing') {
    const start = new Date(Date.now() - 15 * 60_000);
    const end = new Date(Date.now() + 45 * 60_000);
    events[0] = {
      ...events[0],
      id: 'ongoing',
      title: '正在进行的会议',
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      sortKey: start.toISOString(),
    };
  }
  if (scenario === 'all-day')
    events[0] = storyEvent('today', '家庭全天活动', 0, 0, 'calendar.family', true);
  const visibleEvents =
    scenario === 'multiple'
      ? events
      : events.filter((event) => event.sourceId === 'calendar.family');
  return (
    <EntityCardStoryFrame size={size}>
      <FamilyCalendarHomeOsCard
        cardId={`storybook-time-arc-${scenario}`}
        size={size}
        isEditMode={false}
        previewEvents={visibleEvents}
      />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Home OS/Lunar Time Arc',
  component: Preview,
  args: { size: 'medium', scenario: 'medium' },
  argTypes: { size: { control: 'inline-radio', options: ['small', 'medium', 'large'] } },
} satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TimeArcMedium: Story = {};
export const TimeArcOngoing: Story = { args: { scenario: 'ongoing' } };
export const TimeArcAllDay: Story = { args: { scenario: 'all-day' } };
export const TimeArcEmpty: Story = { args: { scenario: 'empty' } };
export const TimeArcLarge: Story = { args: { size: 'large', scenario: 'large' } };
export const TimeArcMultipleSources: Story = { args: { scenario: 'multiple' } };
