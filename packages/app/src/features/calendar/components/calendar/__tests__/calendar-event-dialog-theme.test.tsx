import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CalendarEventDialog } from '../calendar-event-dialog';
import type { CalendarEvent } from '../types';

const event: CalendarEvent = {
  id: 'family-event',
  title: 'Family event',
  startTime: '10:00',
  endTime: '11:00',
  timeDisplay: '10:00',
  type: 'event',
  color: 'bg-blue-500',
};

afterEach(() => useThemeStore.getState().setTheme('dark'));

describe('CalendarEventDialog theme isolation', () => {
  it('keeps the detail controls dark when Home OS overrides a global light theme', () => {
    useThemeStore.getState().setTheme('light');
    renderWithProviders(
      <CalendarEventDialog event={event} isOpen onOpenChange={() => {}} theme="dark" />
    );
    expect(screen.getByRole('button', { name: 'Done' })).toHaveClass('!text-white');
  });

  it('keeps ordinary light dialogs on their global light appearance', () => {
    useThemeStore.getState().setTheme('light');
    renderWithProviders(
      <CalendarEventDialog event={event} isOpen onOpenChange={() => {}} theme="light" />
    );
    expect(screen.getByRole('button', { name: 'Done' })).not.toHaveClass('!text-white');
  });
});
