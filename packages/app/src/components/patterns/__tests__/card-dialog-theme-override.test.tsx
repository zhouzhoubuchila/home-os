import { useThemeStore } from '@navet/app/stores/theme-store';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardDialogChoicePill, CardDialogSection, CardDialogTabTrigger } from '../card-dialog';

describe('card dialog theme overrides', () => {
  it('uses the global theme by default and accepts an explicit dark override', () => {
    const previousTheme = useThemeStore.getState().theme;
    useThemeStore.setState({ theme: 'light' });

    try {
      render(
        <>
          <CardDialogSection label="Default">Default content</CardDialogSection>
          <CardDialogSection label="Dark" themeOverride="dark">
            Dark content
          </CardDialogSection>
          <CardDialogTabTrigger active={false}>Default tab</CardDialogTabTrigger>
          <CardDialogTabTrigger active={false} themeOverride="dark">
            Dark tab
          </CardDialogTabTrigger>
          <CardDialogChoicePill>Default choice</CardDialogChoicePill>
          <CardDialogChoicePill themeOverride="dark">Dark choice</CardDialogChoicePill>
        </>
      );

      expect(screen.getByText('Default')).toHaveClass('text-slate-950');
      expect(screen.getByText('Dark')).toHaveClass('text-white');
      expect(screen.getByRole('button', { name: 'Default tab' })).toHaveClass('bg-white');
      expect(screen.getByRole('button', { name: 'Dark tab' })).toHaveClass('bg-white/5');
      expect(screen.getByRole('button', { name: 'Default choice' })).toHaveClass('bg-white');
      expect(screen.getByRole('button', { name: 'Dark choice' })).toHaveClass('bg-white/5');
    } finally {
      useThemeStore.setState({ theme: previousTheme });
    }
  });
});
