import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { resolveSemanticEntities } from '../../mapping/semantic-resolver';
import { homeOsEntity } from '../../tests/fixtures';
import { SceneCoreHomeOsCard } from './scene-core-home-os-card';

const names = ['回家', '离家', '睡眠', '观影', '阅读', '清洁', '会客', '起床'];
const allScenes = resolveSemanticEntities(
  names.map((name, index) =>
    homeOsEntity({ externalId: `scene.demo_${index}`, type: 'scene', name })
  )
);

function Preview({
  size,
  scenario,
}: {
  size: CardSize;
  scenario: 'medium' | 'triggered' | 'readonly' | 'empty' | 'large';
}) {
  const entities =
    scenario === 'empty'
      ? []
      : scenario === 'readonly'
        ? allScenes.map((scene, index) =>
            index === 0 ? { ...scene, controlPolicy: 'readonly' as const } : scene
          )
        : allScenes;
  return (
    <EntityCardStoryFrame size={size}>
      <SceneCoreHomeOsCard
        size={size}
        entities={entities}
        isEditMode={false}
        language="zh"
        title="家庭模式"
        storyFeedback={scenario === 'triggered' ? 'success' : undefined}
      />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Home OS/Lunar Scene Core',
  component: Preview,
  args: { size: 'medium', scenario: 'medium' },
  argTypes: { size: { control: 'inline-radio', options: ['small', 'medium', 'large'] } },
} satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SceneCoreMedium: Story = {};
export const SceneCoreTriggered: Story = { args: { scenario: 'triggered' } };
export const SceneCoreReadonly: Story = { args: { scenario: 'readonly' } };
export const SceneCoreEmpty: Story = { args: { scenario: 'empty' } };
export const SceneCoreLarge: Story = { args: { size: 'large', scenario: 'large' } };
