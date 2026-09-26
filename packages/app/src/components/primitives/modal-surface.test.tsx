import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '../../stores/theme-store';
import { ModalSurface } from './modal-surface';

describe('ModalSurface theme override', () => {
  afterEach(() => {
    useThemeStore.getState().setTheme('dark');
  });

  it('uses dark BaseCardDialog and dark modal surface classes under a global light theme', () => {
    useThemeStore.getState().setTheme('light');
    renderWithProviders(
      <ModalSurface isOpen onOpenChange={() => undefined} title="Presence" themeOverride="dark">
        <div>Presence detail</div>
      </ModalSurface>
    );

    const dialog = screen.getByRole('dialog', { name: 'Presence' });
    expect(dialog).toHaveClass('bg-[rgba(24,24,27,0.97)]');
    expect(dialog).toHaveClass('border-[rgba(161,161,170,0.18)]');
    expect(dialog).not.toHaveClass('bg-white');
  });

  it('keeps ordinary ModalSurface following the global theme without an override', () => {
    useThemeStore.getState().setTheme('light');
    renderWithProviders(
      <ModalSurface isOpen onOpenChange={() => undefined} title="Light modal">
        <div>Light content</div>
      </ModalSurface>
    );

    expect(screen.getByRole('dialog', { name: 'Light modal' })).toHaveClass('bg-white');
  });
});
