import { CompactMeterListItem } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect, within } from 'storybook/test';
import { buildHomeOsLights } from '../../adapters/lighting-adapter';
import { AstronomyVisual } from '../../astronomy/astronomy-visual';
import { HOME_OS_ROLES } from '../../core/semantic-roles';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { REAL_HOME_FIXTURE } from '../../tests/fixtures/real-home';

const entities = resolveSemanticEntities(REAL_HOME_FIXTURE);
const lights = buildHomeOsLights(entities);
const pve = (role: string) => entities.find((entity) => entity.roles.includes(role));

function ContractMatrix({ theme }: { theme: ThemeMode }) {
  useEffect(() => {
    const previous = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(theme);
    return () => useThemeStore.getState().setTheme(previous);
  }, [theme]);
  const reliableOn = lights.filter(
    (light) => light.stateQuality === 'reliable' && light.state === 'on'
  );
  const cpu = pve(HOME_OS_ROLES.homelabPveCpu);
  const memory = pve(HOME_OS_ROLES.homelabPveMemory);
  return (
    <main data-testid="home-os-v2034-contract" className="grid max-w-6xl gap-4 p-4 md:grid-cols-2">
      <BaseCard size="medium" title="Lighting · reliable and unknown">
        <p className="text-3xl font-semibold tabular-nums">{reliableOn.length}</p>
        <p className="text-sm text-current/60">Reliable circuits on</p>
        <div className="mt-3 grid gap-1 text-xs">
          {lights.map((light) => (
            <span key={light.id}>
              {light.name} · {light.stateQuality === 'reliable' ? light.state : 'unknown'}
            </span>
          ))}
        </div>
      </BaseCard>
      <BaseCard size="medium" title="PVE · Navet meters">
        <div className="grid gap-3">
          {[cpu, memory].map((metric) =>
            metric ? (
              <CompactMeterListItem
                key={metric.entity.externalId}
                label={metric.displayName}
                value={`${String(metric.entity.primaryState)}%`}
                level={Number(metric.entity.primaryState)}
                color="rgb(52 211 153)"
                subtleFill="rgb(127 127 127 / 0.14)"
                textSecondary="text-current/65"
                layout="fluid"
              />
            ) : null
          )}
        </div>
      </BaseCard>
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
  title: 'Cards/Home OS/V2.0.3.4 Contract Matrix',
  component: ContractMatrix,
  parameters: { layout: 'fullscreen' },
  args: { theme: 'glass' },
} satisfies Meta<typeof ContractMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

const play: Story['play'] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId('home-os-v2034-contract')).toBeInTheDocument();
  await expect(canvas.getByText('Idle is not now playing')).toBeInTheDocument();
  await expect(canvasElement.querySelector('[data-moon-disc="separate"]')).not.toBeNull();
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
