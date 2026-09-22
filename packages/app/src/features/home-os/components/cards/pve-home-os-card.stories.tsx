import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { buildHomeOsProductProjection } from '../../projection/product-path-projection';
import { REAL_HOME_FIXTURE } from '../../tests/fixtures/real-home';
import { PveHomeOsCard } from './pve-home-os-card';

const entities = resolveSemanticEntities(REAL_HOME_FIXTURE);
const devices = buildHomeOsProductProjection({ entities }).pveDevices;

function PveSystemPreview({ size, theme }: { size: CardSize; theme: ThemeMode }) {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(theme);
    return () => useThemeStore.getState().setTheme(previous);
  }, [theme]);

  return (
    <main className="min-h-56 max-w-xl p-4">
      <PveHomeOsCard size={size} devices={devices} isEditMode={false} />
    </main>
  );
}

const meta = {
  title: 'Cards/Home OS/PVE System',
  component: PveSystemPreview,
  parameters: { layout: 'fullscreen' },
  args: { size: 'large', theme: 'dark' },
} satisfies Meta<typeof PveSystemPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const play: Story['play'] = async ({ canvasElement }) => {
  await expect(canvasElement.querySelector('[data-home-os-pve-visual="system"]')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-home-os-pve-primary="cpu"]')).not.toBeNull();
};

export const Large: Story = { args: { size: 'large', theme: 'dark' }, play };
export const Medium: Story = { args: { size: 'medium', theme: 'dark' }, play };
export const Small: Story = { args: { size: 'small', theme: 'dark' }, play };
export const Light: Story = { args: { size: 'large', theme: 'light' }, play };
export const Black: Story = { args: { size: 'large', theme: 'black' }, play };
