import { BaseCard } from '@navet/app/components/primitives';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect, within } from 'storybook/test';
import { AstronomyVisual } from '../../astronomy/astronomy-visual';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { buildHomeOsProductProjection } from '../../projection/product-path-projection';
import { REAL_HOME_FIXTURE } from '../../tests/fixtures/real-home';
import { PveHomeOsCard } from './pve-home-os-card';

const entities = resolveSemanticEntities(REAL_HOME_FIXTURE);
const projection = buildHomeOsProductProjection({ entities });
const lights = projection.lighting;

function ContractMatrix({ theme }: { theme: ThemeMode }) {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(theme);
    return () => useThemeStore.getState().setTheme(previous);
  }, [theme]);
  const reliableOn = lights.filter((light) => light.state === 'on');
  return (
    <main data-testid="home-os-v2035-contract" className="grid max-w-6xl gap-4 p-4 md:grid-cols-2">
      <BaseCard size="medium" title="Lighting · reliable and unknown">
        <p className="text-3xl font-semibold tabular-nums">{reliableOn.length}</p>
        <p className="text-sm text-current/60">Reliable circuits on</p>
        <div className="mt-3 grid gap-1 text-xs">
          {lights.map((light) => (
            <span key={light.id}>
              {light.name} · {light.state}
            </span>
          ))}
        </div>
      </BaseCard>
      <PveHomeOsCard size="medium" devices={projection.pveDevices} isEditMode={false} />
      <BaseCard size="medium" title="Astronomy · source port">
        <AstronomyVisual
          entities={entities}
          language="zh"
          now={new Date('2026-09-03T12:00:00+08:00')}
          compact
        />
      </BaseCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <BaseCard size="small" title="Security">
          <p className="text-sm">Camera · snapshot · unavailable</p>
          <p className="mt-2 text-xs text-current/55">Vacuum map excluded</p>
        </BaseCard>
        <BaseCard size="small" title="Media">
          <p className="text-sm">Playing · paused · capability absent</p>
          <p className="mt-2 text-xs text-current/55">Idle is not now playing</p>
        </BaseCard>
      </div>
    </main>
  );
}

const meta = {
  title: 'Cards/Home OS/V2.0.3.5 Product Path Matrix',
  component: ContractMatrix,
  parameters: { layout: 'fullscreen' },
  args: { theme: 'glass' },
} satisfies Meta<typeof ContractMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

const play: Story['play'] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId('home-os-v2035-contract')).toBeInTheDocument();
  await expect(canvas.getByText('Idle is not now playing')).toBeInTheDocument();
  await expect(canvasElement.querySelector('[data-sun-position-card-image]')).not.toBeNull();
  await expect(canvasElement.querySelector('[data-home-os-pve-recipe="ups"]')).not.toBeNull();
};

export const Glass: Story = { args: { theme: 'glass' }, play };
export const Dark: Story = { args: { theme: 'dark' }, play };
export const Light: Story = { args: { theme: 'light' }, play };
export const Black: Story = { args: { theme: 'black' }, play };

export const NarrowTouch: Story = {
  args: { theme: 'dark' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play,
};
