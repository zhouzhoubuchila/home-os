import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Battery, Settings2 } from 'lucide-react';
import { BatteryList, getLevelColor, getLunarLevelColor } from './widgets/battery-list';
import { buildBatteryOverviewModel } from './widgets/battery-overview-model';
import './widgets/battery-lunar-card.css';

type BatteryOverviewStoryArgs = {
  size: CardSize;
};

const STORY_BATTERIES = [
  { id: 'front-door-sensor', name: 'Front Door Sensor', level: 18 },
  { id: 'kitchen-remote', name: 'Kitchen Remote', level: 42 },
  { id: 'hallway-motion', name: 'Hallway Motion', level: 67 },
  { id: 'ups-backup', name: 'UPS Backup', level: 92 },
] as const;

function BatteryOverviewStoryFrame({ size }: BatteryOverviewStoryArgs) {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accentHex = getThemeColorValue(primaryColor);
  const chromeSize = size === 'large' ? 'medium' : size;
  const isCompact = isCompactCardSize(size);

  return (
    <EntityCardStoryFrame size={size}>
      <BaseCard
        size={size}
        fullBleed
        className="transition-all duration-500"
        contentClassName="h-full"
      >
        <div className="relative flex h-full min-w-0 flex-col p-3">
          <EntityCardHeader
            title="Battery Overview"
            subtitle="Widget"
            layout="eyebrow-first"
            size={chromeSize}
            titleClassName={surface.textPrimary}
            subtitleClassName={surface.textMuted}
            leading={<EntityCardHeaderIcon IconComponent={Battery} isActive size={chromeSize} />}
          />
          <BatteryList
            devices={[...STORY_BATTERIES]}
            isCompact={isCompact}
            subtleFill="rgba(255,255,255,0.08)"
            textSecondary={surface.textSecondary}
            emptyStateLabel="No batteries"
            getLevelColor={(level) => getLevelColor(level, accentHex)}
          />
        </div>
      </BaseCard>
    </EntityCardStoryFrame>
  );
}

function BatteryOverviewEmptyStateStory({ size }: BatteryOverviewStoryArgs) {
  const { primaryColor } = useTheme();
  const accentHex = getThemeColorValue(primaryColor);

  return (
    <EntityCardStoryFrame size={size}>
      <BaseCard
        size={size}
        fullBleed
        className="transition-all duration-500"
        contentClassName="h-full"
      >
        <div className="relative z-[2] h-full p-4">
          <CardEmptyState
            title="Battery Overview"
            description="Select battery entities to populate this widget."
            icon={Battery}
            actionLabel="Battery settings"
            actionIcon={Settings2}
            size={size}
            accentColor={accentHex}
          />
        </div>
      </BaseCard>
    </EntityCardStoryFrame>
  );
}

const LUNAR_STORY_BATTERIES = [
  { id: 'door', name: 'Front Door Sensor', level: 5 },
  { id: 'remote', name: 'Kitchen Remote', level: 23 },
  { id: 'motion', name: 'Workshop Motion Sensor', level: 90 },
  { id: 'ups', name: 'Backup UPS', level: 100 },
  { id: 'desk', name: 'Desk Sensor', level: 100 },
];

function BatteryLunarStoryFrame({
  size,
  batteries,
}: BatteryOverviewStoryArgs & { batteries: typeof LUNAR_STORY_BATTERIES }) {
  const model = buildBatteryOverviewModel(batteries);
  const chromeSize = size === 'large' ? 'medium' : size;
  const lowCount = model.criticalCount + model.lowCount;

  return (
    <EntityCardStoryFrame size={size}>
      <BaseCard
        size={size}
        fullBleed
        className="battery-lunar-card"
        style={{ background: 'linear-gradient(145deg, #050816 0%, #081126 58%, #0d1832 100%)' }}
        readableBackgroundColor="#050816"
        themeOverride="dark"
        frameClassName="overflow-hidden"
        innerClassName="z-[1]"
        disableDefaultSheen
        data-battery-size={size}
        data-battery-motion="high"
        overlay={<div className="battery-lunar-atmosphere" />}
        contentClassName="h-full"
      >
        <div className="relative flex h-full min-w-0 flex-col p-3">
          {model.totalCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <EntityCardHeaderIcon
                IconComponent={Battery}
                isActive={false}
                size={size}
                themeOverride="dark"
                baseColor="#83d8d0"
              />
              <div className="text-xs text-white/90">No battery sensors found</div>
            </div>
          ) : (
            <>
              <EntityCardHeader
                title="Battery Overview"
                subtitle="POWER / CELLS"
                layout="eyebrow-first"
                size={chromeSize}
                titleStyle={{ color: 'rgba(245, 248, 255, 0.92)' }}
                subtitleStyle={{ color: 'rgba(210, 220, 242, 0.52)' }}
                backgroundColor="#050816"
                leading={
                  <EntityCardHeaderIcon
                    IconComponent={Battery}
                    isActive
                    size={chromeSize}
                    themeOverride="dark"
                    baseColor="#83d8d0"
                  />
                }
              />
              <div className="battery-lunar-summary">
                <div>
                  <div className="battery-lunar-summary-count">
                    {model.totalCount}
                    <span>cells</span>
                  </div>
                  <div className="battery-lunar-summary-status" data-has-low={lowCount > 0}>
                    {lowCount} low
                  </div>
                </div>
                <div
                  className="battery-lunar-core"
                  role="img"
                  aria-label={`Average battery ${model.averageLevel}%`}
                  style={{ '--battery-average': `${model.averageLevel}%` } as React.CSSProperties}
                >
                  <span className="battery-lunar-core-value">{model.averageLevel}%</span>
                  <span className="battery-lunar-core-label">AVG</span>
                </div>
              </div>
              <BatteryList
                devices={size === 'medium' ? model.rows.slice(0, 5) : model.rows}
                isCompact={isCompactCardSize(size)}
                subtleFill="rgba(255,255,255,0.08)"
                textSecondary="text-blue-100/68"
                emptyStateLabel="No battery sensors"
                getLevelColor={getLunarLevelColor}
                variant="lunar"
                highlightId={model.rows.find((row) => row.level >= 80)?.id}
              />
            </>
          )}
        </div>
      </BaseCard>
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Custom/Battery Overview',
  component: BatteryOverviewStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<BatteryOverviewStoryArgs>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<BatteryOverviewStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'large',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const EmptyState: Story = {
  render: (args) => <BatteryOverviewEmptyStateStory {...args} />,
  args: {
    size: 'medium',
  },
};

export const LunarMedium: Story = {
  render: (args) => <BatteryLunarStoryFrame {...args} batteries={LUNAR_STORY_BATTERIES} />,
  args: { size: 'medium' },
};

export const LunarLowBattery: Story = {
  render: (args) => (
    <BatteryLunarStoryFrame
      {...args}
      batteries={LUNAR_STORY_BATTERIES.map((row) =>
        row.id === 'door' ? { ...row, level: 23 } : row
      )}
    />
  ),
  args: { size: 'medium' },
};

export const LunarCritical: Story = {
  render: (args) => <BatteryLunarStoryFrame {...args} batteries={LUNAR_STORY_BATTERIES} />,
  args: { size: 'medium' },
};

export const LunarLarge: Story = {
  render: (args) => <BatteryLunarStoryFrame {...args} batteries={LUNAR_STORY_BATTERIES} />,
  args: { size: 'large' },
};

export const LunarEmpty: Story = {
  render: (args) => <BatteryLunarStoryFrame {...args} batteries={[]} />,
  args: { size: 'medium' },
};
