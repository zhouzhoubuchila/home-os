import type { ThemeType } from '@navet/app/hooks/use-theme';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LunarBackgroundVariant } from './lunar-background-assets';
import type { LunarSection } from './moon-card';
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
  initialSection: LunarSection;
  backgroundVariant: LunarBackgroundVariant;
}

function MoonCardStudio({
  size,
  language,
  phase,
  illumination,
  isDay,
  source,
  theme,
  initialSection,
  backgroundVariant,
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
      <MoonCard
        size={size}
        model={model}
        language={language}
        theme={theme}
        initialSection={initialSection}
        backgroundVariant={backgroundVariant}
      />
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
    initialSection: { control: 'inline-radio', options: ['base', 'horizon', 'calendar'] },
    backgroundVariant: { control: 'inline-radio', options: ['none', 'bg0', 'bg1', 'bg2', 'bg3'] },
  },
  args: {
    size: 'medium',
    language: 'zh',
    phase: 'waxing_gibbous',
    illumination: 0.75,
    isDay: false,
    source: 'entity',
    theme: 'dark',
    initialSection: 'base',
    backgroundVariant: 'bg0',
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
export const MediumBase: Story = { args: { size: 'medium', initialSection: 'base' } };
export const MediumHorizon: Story = { args: { size: 'medium', initialSection: 'horizon' } };
export const MediumCalendar: Story = { args: { size: 'medium', initialSection: 'calendar' } };
export const LargeBase: Story = { args: { size: 'large', initialSection: 'base' } };
export const LargeHorizon: Story = { args: { size: 'large', initialSection: 'horizon' } };
export const LargeCalendar: Story = { args: { size: 'large', initialSection: 'calendar' } };
export const MediumBackgroundBg0: Story = { args: { size: 'medium', backgroundVariant: 'bg0' } };
export const MediumBackgroundBg1: Story = { args: { size: 'medium', backgroundVariant: 'bg1' } };
export const MediumBackgroundBg2: Story = { args: { size: 'medium', backgroundVariant: 'bg2' } };
export const MediumBackgroundBg3: Story = { args: { size: 'medium', backgroundVariant: 'bg3' } };
export const MediumBackgroundCurrent: Story = {
  args: { size: 'medium', backgroundVariant: 'none' },
};
export const MediumFinalComparison: Story = {
  render: () => {
    const model = createMoonCardFixture('waxing_gibbous', {
      illumination: 0.82,
      illuminationPercent: 82,
    });
    return (
      <div className="grid min-h-screen grid-cols-1 gap-5 bg-slate-950 p-6 text-white md:grid-cols-2">
        {(['none', 'bg0', 'bg1', 'bg3'] as const).map((variant) => (
          <div className="min-w-0" key={variant}>
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/55">
              {variant === 'none' ? 'Current' : `${variant.toUpperCase()} tuned`}
            </p>
            <MoonCard
              size="medium"
              model={model}
              language="en"
              theme="dark"
              backgroundVariant={variant}
            />
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Same 82% waxing-gibbous model and Medium size; only the atmosphere variant changes.',
      },
    },
  },
};
export const InteractiveMedium: Story = {
  args: { size: 'medium', initialSection: 'base' },
  parameters: {
    docs: {
      description: {
        story:
          'Use the Phase, Horizon and Calendar controls; swipe or keyboard-navigate the data pages.',
      },
    },
  },
};
export const InteractiveLarge: Story = {
  args: { size: 'large', initialSection: 'base' },
  parameters: {
    docs: {
      description: {
        story:
          'Expanded interactive port with full calendar, lazy Chart.js horizon and star particles.',
      },
    },
  },
};
export const Light: Story = { args: { theme: 'light' } };
export const Dark: Story = { args: { theme: 'dark' } };
export const InteractiveMotion: Story = {
  args: { size: 'medium', initialSection: 'base' },
  parameters: {
    docs: {
      description: { story: 'Move the pointer over the moon to test restrained RAF parallax.' },
    },
  },
};
export const ReducedMotion: Story = {
  args: { size: 'medium', initialSection: 'base' },
  parameters: {
    docs: {
      description: {
        story: 'Use the browser prefers-reduced-motion setting to validate the static fallback.',
      },
    },
  },
};
export const VeryBrightMoon: Story = {
  args: { size: 'medium', phase: 'full_moon', illumination: 0.98, backgroundVariant: 'bg0' },
};
export const VeryDarkMoon: Story = {
  args: { size: 'medium', phase: 'new_moon', illumination: 0.04, backgroundVariant: 'bg0' },
};
