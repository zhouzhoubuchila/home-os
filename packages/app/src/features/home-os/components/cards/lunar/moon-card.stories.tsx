import type { ThemeType } from '@navet/app/hooks/use-theme';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoonCard } from './moon-card';
import { createMoonCardFixture, type MoonCardModel, type MoonPhaseKey } from './moon-card-model';

interface MoonCardStudioProps {
  size: 'small' | 'medium' | 'large';
  language: 'zh' | 'en';
  phase: MoonPhaseKey;
  illumination: number;
  isDay: boolean;
  source: MoonCardModel['source'];
  theme: ThemeType;
}

function MoonCardStudio({
  size,
  language,
  phase,
  illumination,
  isDay,
  source,
  theme,
}: MoonCardStudioProps) {
  const normalizedIllumination = Math.min(1, Math.max(0, illumination));
  const model = createMoonCardFixture(phase, {
    illumination: normalizedIllumination,
    illuminationPercent: Math.round(normalizedIllumination * 100),
    isDay,
    source,
  });
  return (
    <EntityCardStoryFrame size={size}>
      <MoonCard size={size} model={model} language={language} theme={theme} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Home OS/Card Studio/Moon',
  component: MoonCardStudio,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Home OS Card Studio reference for Moon Card V2. Use controls to review size, language, phase, illumination, day/night context, and entity fallback without Home Assistant.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    language: { control: 'inline-radio', options: ['zh', 'en'] },
    phase: {
      control: 'select',
      options: [
        'new_moon',
        'waxing_crescent',
        'first_quarter',
        'waxing_gibbous',
        'full_moon',
        'waning_gibbous',
        'last_quarter',
        'waning_crescent',
      ],
    },
    illumination: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    isDay: { control: 'boolean' },
    source: { control: 'inline-radio', options: ['entity', 'calculated'] },
    theme: { control: 'inline-radio', options: ['dark', 'light'] },
  },
  args: {
    size: 'medium',
    language: 'zh',
    phase: 'waxing_gibbous',
    illumination: 0.75,
    isDay: false,
    source: 'entity',
    theme: 'dark',
  },
} satisfies Meta<typeof MoonCardStudio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewMoon: Story = {
  args: { phase: 'new_moon', illumination: 0 },
};
export const WaxingCrescent: Story = {
  args: { phase: 'waxing_crescent', illumination: 0.2 },
};
export const FirstQuarter: Story = {
  args: { phase: 'first_quarter', illumination: 0.5 },
};
export const WaxingGibbous: Story = {
  args: { phase: 'waxing_gibbous', illumination: 0.75 },
};
export const FullMoon: Story = {
  args: { phase: 'full_moon', illumination: 1 },
};
export const WaningGibbous: Story = {
  args: { phase: 'waning_gibbous', illumination: 0.75 },
};
export const LastQuarter: Story = {
  args: { phase: 'last_quarter', illumination: 0.5 },
};
export const WaningCrescent: Story = {
  args: { phase: 'waning_crescent', illumination: 0.2 },
};
export const EntityUnavailableCalculatedFallback: Story = {
  args: { source: 'calculated', phase: 'waxing_crescent', illumination: 0.2 },
};
export const Small: Story = { args: { size: 'small' } };
export const Medium: Story = { args: { size: 'medium' } };
export const Large: Story = { args: { size: 'large' } };
export const Light: Story = { args: { theme: 'light' } };
export const Dark: Story = { args: { theme: 'dark' } };
