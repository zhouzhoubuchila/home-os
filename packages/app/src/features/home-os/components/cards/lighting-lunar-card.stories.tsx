import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getHomeOsCopy } from '../../i18n/home-os-copy';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { homeOsEntity } from '../../tests/fixtures';
import { LightingCard } from './home-os-widget';

const sampleLights = [
  ['light.living', '客厅主灯'],
  ['light.dining', '餐厅灯'],
  ['light.bedside', '床头灯'],
  ['light.study', '书房灯'],
] as const;

function LightingPreview({ size, onCount }: { size: CardSize; onCount: number }) {
  const entities = resolveSemanticEntities(
    sampleLights.map(([externalId, name], index) =>
      homeOsEntity({
        externalId,
        name,
        primaryState: index < onCount ? 'on' : 'off',
        capabilities: ['toggle'],
      })
    )
  );
  return (
    <EntityCardStoryFrame size={size}>
      <LightingCard size={size} entities={entities} isEditMode={false} copy={getHomeOsCopy('zh')} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Home OS/Lunar Ambient Lighting',
  component: LightingPreview,
  args: { size: 'medium', onCount: 0 },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    onCount: { control: { type: 'range', min: 0, max: 4, step: 1 } },
  },
} satisfies Meta<typeof LightingPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MediumOff: Story = {};
export const MediumOn: Story = { args: { onCount: 3 } };
export const Small: Story = { args: { size: 'small', onCount: 1 } };
export const Large: Story = { args: { size: 'large', onCount: 4 } };
